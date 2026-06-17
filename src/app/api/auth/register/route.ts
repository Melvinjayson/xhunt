import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email/resend';
import { PREVIEW_ENABLED, createPreviewSession } from '@/lib/auth/preview';

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

function cookieResponse(
  data: Record<string, unknown>,
  token: { access_token: string; expires_in: number },
  status: number,
) {
  const res = NextResponse.json(data, { status });
  res.cookies.set('__xhunt_session', token.access_token, { ...SESSION_OPTS, maxAge: token.expires_in });
  res.cookies.set('__xhunt_at', token.access_token, { ...AT_OPTS, maxAge: token.expires_in });
  return res;
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Preview mode: create a local session without hitting the backend
  if (PREVIEW_ENABLED) {
    const displayName = (body.display_name as string | undefined)
      ?? (body.email as string).split('@')[0];
    const session = await createPreviewSession(body.email as string, displayName);
    return cookieResponse(session, session.token, 201);
  }

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
    console.error('[register] non-JSON from backend, status:', upstream.status, 'url:', BACKEND);
    return NextResponse.json(
      { detail: `Registration failed (${upstream.status}). Check that NEXT_PUBLIC_AUTH_URL is set correctly in Vercel.` },
      { status: upstream.status },
    );
  }

  if (!upstream.ok) {
    return NextResponse.json(data, { status: upstream.status });
  }

  const token = data.token as { access_token: string; expires_in: number };
  sendEmail({
    to: body.email as string,
    template: 'welcome',
    data: { name: (body.display_name ?? body.email) as string },
  }).catch((err: unknown) => console.error('[register] welcome email failed:', err));

  return cookieResponse(data, token, 201);
}
