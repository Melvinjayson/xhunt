import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser Supabase client.
 *
 * SECURITY (H1): the RLS bearer token is fetched on demand from
 * `/api/auth/supabase-token` (which reads the httpOnly session cookie server-side)
 * and held only in memory — it is NOT stored in a JS-readable cookie. This avoids
 * exposing the primary session JWT to XSS. Supabase invokes the `accessToken`
 * callback per request; we cache the short-lived token in memory until it nears
 * expiry, so only the first query after a load (or after expiry) pays the fetch.
 */

let cached: { token: string; expiresAt: number } | null = null;
let inflight: Promise<string | null> | null = null;

async function fetchSupabaseToken(): Promise<string | null> {
  const now = Date.now();
  // Reuse the cached token until 30s before expiry.
  if (cached && cached.expiresAt - now > 30_000) return cached.token;
  // Collapse concurrent requests into a single fetch.
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const res = await fetch('/api/auth/supabase-token', { cache: 'no-store' });
      if (!res.ok) { cached = null; return null; }
      const data = (await res.json()) as { token: string; expiresIn: number };
      cached = { token: data.token, expiresAt: Date.now() + data.expiresIn * 1000 };
      return cached.token;
    } catch {
      cached = null;
      return null;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    // Returning null makes supabase-js fall back to the anon key (unauthenticated),
    // which is the correct behavior for a signed-out visitor.
    { accessToken: async () => await fetchSupabaseToken() },
  );
}
