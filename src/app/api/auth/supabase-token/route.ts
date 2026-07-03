import { NextRequest, NextResponse } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';
import { getJwtSecretKey } from '@/lib/env';

/**
 * Mint a SHORT-LIVED token the browser uses as its Supabase RLS bearer.
 *
 * Previously the full, long-lived session JWT was copied into a non-httpOnly
 * cookie (`__xhunt_at`) so the browser Supabase client could read it — which
 * meant any XSS could exfiltrate the primary session token (account takeover).
 *
 * Instead, the browser now asks this endpoint for a token on demand. We read the
 * httpOnly `__xhunt_session` cookie (not reachable from JS), verify it, and mint a
 * fresh 5-minute token carrying only the claims Supabase RLS needs. The token
 * lives in memory on the client, never in a persistent JS-readable cookie, and
 * expires quickly — so the exposure window is minimal and there is no long-lived
 * credential sitting in `document.cookie`.
 */
const TTL_SECONDS = 5 * 60;

export async function GET(req: NextRequest) {
  const token = req.cookies.get('__xhunt_session')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const key = getJwtSecretKey();

  let payload: Record<string, unknown>;
  try {
    const verified = await jwtVerify(token, key, { algorithms: ['HS256'] });
    if (verified.payload['type'] !== 'access') throw new Error('not an access token');
    payload = verified.payload as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Mint a fresh, short-lived Supabase RLS token. `role: 'authenticated'` and
  // `aud: 'authenticated'` are what Supabase RLS expects; app claims ride along
  // for policies that key off them. Deliberately no `type: 'access'`, so this
  // token can never be replayed as an app session cookie.
  const supabaseToken = await new SignJWT({
    sub: payload['sub'] as string,
    email: (payload['email'] as string) ?? '',
    role: 'authenticated',
    aud: 'authenticated',
    app_role: (payload['app_role'] ?? payload['role']) ?? 'explorer',
    tenant_id: (payload['tenant_id'] as string | null) ?? null,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${TTL_SECONDS}s`)
    .sign(key);

  return NextResponse.json(
    { token: supabaseToken, expiresIn: TTL_SECONDS },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
