import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email/resend';

const BACKEND = process.env.NEXT_PUBLIC_AUTH_URL ?? '';

const SECURE    = process.env.NODE_ENV === 'production';
const BASE_COOKIE = { secure: SECURE, sameSite: 'lax' as const, path: '/' };

async function fetchWithRetry(url: string, opts: RequestInit): Promise<Response> {
  const attempt = async () => {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 35_000);
    try {
      return await fetch(url, { ...opts, signal: ac.signal });
    } finally {
      clearTimeout(timer);
    }
  };
  try {
    return await attempt();
  } catch {
    await new Promise<void>((r) => setTimeout(r, 3_000));
    return await attempt();
  }
}

export async function POST(req: NextRequest) {
  if (!BACKEND) {
    console.error('[register] NEXT_PUBLIC_AUTH_URL is not set');
    return NextResponse.json(
      { detail: 'Authentication service is not configured' },
      { status: 503 },
    );
  }

  const body = await req.json() as Record<string, unknown>;

  let upstream: Response;
  try {
    upstream = await fetchWithRetry(`${BACKEND}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error('[register] backend unreachable after retry:', err);
    return NextResponse.json(
      { detail: 'Service is warming up — please wait a moment and try again.' },
      { status: 503 },
    );
  }

  if (!upstream.ok) {
    const data = await upstream.json().catch(() => ({ detail: 'Registration failed' }));
    return NextResponse.json(data, { status: upstream.status });
  }

  const data = await upstream.json() as {
    token: { access_token: string; expires_in: number; refresh_token?: string };
    user: { email?: string; display_name?: string };
  };
  const { access_token, expires_in, refresh_token } = data.token;

  // Send welcome email (fire-and-forget — don't block the response)
  const email = data.user?.email ?? (body.email as string | undefined) ?? '';
  const name  = data.user?.display_name ?? email.split('@')[0];
  if (email) {
    sendEmail({ to: email, template: 'welcome', data: { name } })
      .catch((err: unknown) => console.error('[register] welcome email failed:', err));
  }

  const res = NextResponse.json(data, { status: 201 });
  res.cookies.set('__xhunt_session', access_token, {
    ...BASE_COOKIE, httpOnly: true, maxAge: expires_in,
  });
  res.cookies.set('__xhunt_at', access_token, {
    ...BASE_COOKIE, httpOnly: false, maxAge: expires_in,
  });
  if (refresh_token) {
    res.cookies.set('__xhunt_refresh', refresh_token, {
      ...BASE_COOKIE, httpOnly: true,
      maxAge: 7 * 24 * 60 * 60,
    });
  }
  return res;
}
