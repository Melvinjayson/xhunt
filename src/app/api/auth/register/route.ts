import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email/resend';
import { PREVIEW_ENABLED, createPreviewSession } from '@/lib/auth/preview';

const BACKEND = process.env.NEXT_PUBLIC_AUTH_URL ?? '';

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

async function previewFallback(body: Record<string, unknown>, status = 201) {
  const email = body.email as string;
  const displayName = (body.display_name as string | undefined) ?? email.split('@')[0];
  const session = await createPreviewSession(email, displayName);
  return cookieResponse(session, session.token, status);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Explicit preview mode: skip backend entirely
  if (PREVIEW_ENABLED) {
    return previewFallback(body);
  }

  // No backend URL configured — use preview mode automatically
  if (!BACKEND) {
    console.warn('[register] NEXT_PUBLIC_AUTH_URL not set — using preview mode');
    return previewFallback(body);
  }

  let upstream: Response | null = null;
  try {
    upstream = await fetch(`${BACKEND}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (e) {
    console.warn('[register] backend unreachable, falling back to preview mode:', e);
    return previewFallback(body);
  }

  if (!upstream.ok) {
    // Backend reachable but returned an error — fall back to preview so users aren't blocked
    console.warn('[register] backend returned', upstream.status, '— using preview mode as fallback');
    return previewFallback(body);
  }

  let data: Record<string, unknown>;
  try {
    data = await upstream.json();
  } catch {
    return previewFallback(body);
  }

  const token = data.token as { access_token: string; expires_in: number };
  sendEmail({
    to: body.email as string,
    template: 'welcome',
    data: { name: (body.display_name ?? body.email) as string },
  }).catch((err: unknown) => console.error('[register] welcome email failed:', err));

  return cookieResponse(data, token, 201);
}
