import { NextRequest, NextResponse } from 'next/server';
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

function cookieResponse(data: Record<string, unknown>, token: { access_token: string; expires_in: number }) {
  const res = NextResponse.json(data);
  res.cookies.set('__xhunt_session', token.access_token, { ...SESSION_OPTS, maxAge: token.expires_in });
  res.cookies.set('__xhunt_at', token.access_token, { ...AT_OPTS, maxAge: token.expires_in });
  return res;
}

async function previewFallback(email: string, surface?: string) {
  const opts = surface === 'workspace' || surface === 'admin'
    ? { surface: 'workspace' as const }
    : undefined;
  const session = await createPreviewSession(email, email.split('@')[0], opts);
  return cookieResponse(session, session.token);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const email = body.email as string;
  const surface = body.surface as string | undefined;

  // Explicit preview mode: accept any credentials
  if (PREVIEW_ENABLED) {
    return previewFallback(email, surface);
  }

  // No backend URL configured
  if (!BACKEND) {
    console.warn('[login] NEXT_PUBLIC_AUTH_URL not set — using preview mode');
    return previewFallback(email, surface);
  }

  let upstream: Response | null = null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      upstream = await fetch(`${BACKEND}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (e) {
    console.warn('[login] backend unreachable, falling back to preview mode:', e);
    return previewFallback(email, surface);
  }

  if (!upstream.ok) {
    // Forward real credential errors (401 wrong password) to the user
    // For 4xx server/config errors, fall back to preview mode
    if (upstream.status === 401) {
      const data = await upstream.json().catch(() => ({ detail: 'Invalid email or password' }));
      return NextResponse.json(data, { status: 401 });
    }
    console.warn('[login] backend returned', upstream.status, '— using preview mode as fallback');
    return previewFallback(email, surface);
  }

  let data: Record<string, unknown>;
  try {
    data = await upstream.json();
  } catch {
    return previewFallback(email, surface);
  }

  const token = data.token as { access_token: string; expires_in: number };
  return cookieResponse(data, token);
}
