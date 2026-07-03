import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.NEXT_PUBLIC_AUTH_URL ?? '';

export async function POST(req: NextRequest) {
  if (!BACKEND) {
    return NextResponse.json({ error: 'Auth service not configured' }, { status: 503 });
  }

  const refreshToken = req.cookies.get('__xhunt_refresh')?.value;
  if (!refreshToken) {
    return NextResponse.json({ error: 'No refresh token' }, { status: 401 });
  }

  const upstream = await fetch(`${BACKEND}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `__xhunt_refresh=${refreshToken}`,
    },
  }).catch(() => null);

  if (!upstream) {
    return NextResponse.json({ error: 'Auth service unreachable' }, { status: 503 });
  }

  const data = await upstream.json();
  if (!upstream.ok) return NextResponse.json(data, { status: upstream.status });

  const maxAge = data.expires_in;
  const isSecure = process.env.NODE_ENV === 'production';

  const res = NextResponse.json(data);
  // httpOnly session token only (H1) — no JS-readable copy.
  res.cookies.set('__xhunt_session', data.access_token, {
    httpOnly: true, secure: isSecure, sameSite: 'lax', path: '/', maxAge,
  });
  return res;
}
