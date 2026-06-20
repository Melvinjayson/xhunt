import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.NEXT_PUBLIC_AUTH_URL ?? '';

const SECURE   = process.env.NODE_ENV === 'production';
const BASE_COOKIE = { secure: SECURE, sameSite: 'lax' as const, path: '/' };

export async function POST(req: NextRequest) {
  if (!BACKEND) {
    console.error('[login] NEXT_PUBLIC_AUTH_URL is not set');
    return NextResponse.json(
      { detail: 'Authentication service is not configured' },
      { status: 503 },
    );
  }

  let upstream: Response;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      upstream = await fetch(`${BACKEND}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(await req.json()),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (err) {
    console.error('[login] backend unreachable:', err);
    return NextResponse.json(
      { detail: 'Authentication service temporarily unavailable. Please try again shortly.' },
      { status: 503 },
    );
  }

  // Forward 401 (wrong credentials) and 409 (already exists) directly to client
  if (!upstream.ok) {
    const data = await upstream.json().catch(() => ({ detail: 'Login failed' }));
    return NextResponse.json(data, { status: upstream.status });
  }

  const data = await upstream.json() as {
    token: { access_token: string; expires_in: number; refresh_token?: string };
    user: Record<string, unknown>;
  };
  const { access_token, expires_in, refresh_token } = data.token;

  const res = NextResponse.json(data);
  // httpOnly session token — read by middleware / server components
  res.cookies.set('__xhunt_session', access_token, {
    ...BASE_COOKIE, httpOnly: true, maxAge: expires_in,
  });
  // Non-httpOnly copy — read by Supabase client for RLS authorization header
  res.cookies.set('__xhunt_at', access_token, {
    ...BASE_COOKIE, httpOnly: false, maxAge: expires_in,
  });
  // Refresh token — httpOnly, long-lived
  if (refresh_token) {
    res.cookies.set('__xhunt_refresh', refresh_token, {
      ...BASE_COOKIE, httpOnly: true,
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });
  }
  return res;
}
