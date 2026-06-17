import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { PREVIEW_ENABLED } from '@/lib/auth/preview';

const BACKEND = process.env.NEXT_PUBLIC_AUTH_URL ?? 'http://localhost:8000';
const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'change-this-to-a-long-random-secret-at-least-64-chars',
);

export async function GET(req: NextRequest) {
  const token = req.cookies.get('__xhunt_session')?.value;
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  // In preview mode, decode the JWT locally and return a synthetic user object
  if (PREVIEW_ENABLED) {
    try {
      const { payload } = await jwtVerify(token, SECRET, { algorithms: ['HS256'] });
      if (payload['type'] !== 'access') {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
      }
      return NextResponse.json({
        id: payload['sub'],
        email: payload['email'],
        display_name: (payload['email'] as string).split('@')[0],
        avatar_url: null,
        role: payload['app_role'] ?? 'explorer',
        default_surface: payload['surface'] ?? 'home',
        onboarding_complete: false,
        tenant_id: null,
      });
    } catch {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
  }

  const upstream = await fetch(`${BACKEND}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  }).catch(() => null);

  if (!upstream?.ok) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  return NextResponse.json(await upstream.json());
}
