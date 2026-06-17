import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.NEXT_PUBLIC_AUTH_URL ?? 'http://localhost:8000';

const SESSION_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

const AT_OPTS = {
  httpOnly: false,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

export async function POST(req: NextRequest) {
  const body = await req.json();

  let upstream: Response;
  try {
    upstream = await fetch(`${BACKEND}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (e) {
    console.error('[login] backend unreachable:', BACKEND, e);
    return NextResponse.json(
      { detail: 'Auth service is unavailable. Please try again in a moment.' },
      { status: 503 },
    );
  }

  let data: Record<string, unknown>;
  try {
    data = await upstream.json();
  } catch {
    return NextResponse.json(
      { detail: `Login failed (${upstream.status})` },
      { status: upstream.status },
    );
  }

  if (!upstream.ok) {
    return NextResponse.json(data, { status: upstream.status });
  }

  const token = data.token as { access_token: string; expires_in: number };
  const res = NextResponse.json(data);
  res.cookies.set('__xhunt_session', token.access_token, { ...SESSION_OPTS, maxAge: token.expires_in });
  res.cookies.set('__xhunt_at', token.access_token, { ...AT_OPTS, maxAge: token.expires_in });
  return res;
}
