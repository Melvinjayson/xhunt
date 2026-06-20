import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { PREVIEW_ENABLED } from '@/lib/auth/preview';

const BACKEND = process.env.NEXT_PUBLIC_AUTH_URL ?? '';
const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'change-this-to-a-long-random-secret-at-least-64-chars',
);

async function decodeLocalJwt(token: string) {
  const { payload } = await jwtVerify(token, SECRET, { algorithms: ['HS256'] });
  if (payload['type'] !== 'access') throw new Error('not an access token');
  return NextResponse.json({
    id: payload['sub'],
    email: payload['email'],
    display_name: (payload['email'] as string | undefined)?.split('@')[0] ?? 'Explorer',
    avatar_url: null,
    role: payload['app_role'] ?? 'explorer',
    default_surface: payload['surface'] ?? 'home',
    onboarding_complete: (payload['onboarding_complete'] as boolean) ?? false,
    tenant_id: (payload['tenant_id'] as string | null) ?? null,
  });
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get('__xhunt_session')?.value;
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  // Explicit preview mode or no backend configured — decode JWT locally
  if (PREVIEW_ENABLED || !BACKEND) {
    try { return await decodeLocalJwt(token); }
    catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }); }
  }

  // Try backend first (with timeout), fall back to local decode on any failure
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  const upstream = await fetch(`${BACKEND}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
    signal: controller.signal,
  }).catch(() => null).finally(() => clearTimeout(timeout));

  if (upstream?.ok) return NextResponse.json(await upstream.json());

  // Backend unreachable or error — decode the JWT locally (handles preview-mode tokens)
  try { return await decodeLocalJwt(token); }
  catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }); }
}
