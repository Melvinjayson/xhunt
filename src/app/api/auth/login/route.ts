import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.NEXT_PUBLIC_AUTH_URL ?? '';

const SECURE    = process.env.NODE_ENV === 'production';
const BASE_COOKIE = { secure: SECURE, sameSite: 'lax' as const, path: '/' };

// Render.com free/starter services cold-start in 30–60s. Give 35s per attempt
// and retry once after a 3s pause so a cold start doesn't surface as a user error.
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
    console.error('[login] NEXT_PUBLIC_AUTH_URL is not set');
    return NextResponse.json(
      { detail: 'Authentication service is not configured' },
      { status: 503 },
    );
  }

  let upstream: Response;
  try {
    upstream = await fetchWithRetry(`${BACKEND}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(await req.json()),
    });
  } catch (err) {
    console.error('[login] backend unreachable after retry:', err);
    return NextResponse.json(
      { detail: 'Service is warming up — please wait a moment and try again.' },
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
  // httpOnly session token — the single source of truth. Read by the proxy,
  // server components, and API routes. The browser gets a short-lived Supabase
  // RLS token from /api/auth/supabase-token instead of a JS-readable cookie (H1).
  res.cookies.set('__xhunt_session', access_token, {
    ...BASE_COOKIE, httpOnly: true, maxAge: expires_in,
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
