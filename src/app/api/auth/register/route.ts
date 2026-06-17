import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email/resend';

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
    upstream = await fetch(`${BACKEND}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (e) {
    console.error('[register] backend unreachable:', BACKEND, e);
    return NextResponse.json(
      { detail: 'Account service is unavailable. Please try again in a moment.' },
      { status: 503 },
    );
  }

  let data: Record<string, unknown>;
  try {
    data = await upstream.json();
  } catch {
    return NextResponse.json(
      { detail: `Registration failed (${upstream.status})` },
      { status: upstream.status },
    );
  }

  if (!upstream.ok) {
    return NextResponse.json(data, { status: upstream.status });
  }

  const token = data.token as { access_token: string; expires_in: number };
  const maxAge = token.expires_in;
  const res = NextResponse.json(data, { status: 201 });
  res.cookies.set('__xhunt_session', token.access_token, { ...SESSION_OPTS, maxAge });
  res.cookies.set('__xhunt_at', token.access_token, { ...AT_OPTS, maxAge });

  sendEmail({
    to: body.email as string,
    template: 'welcome',
    data: { name: (body.display_name ?? body.email) as string },
  }).catch((err: unknown) => console.error('[register] welcome email failed:', err));

  return res;
}
