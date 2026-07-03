import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * ACS (Assertion Consumer Service) endpoint for SAML 2.0 / OIDC SSO.
 *
 * NOTE: SSO is not yet wired to the canonical auth backend. The session is issued
 * exclusively by the Python auth service (`NEXT_PUBLIC_AUTH_URL`) as a signed
 * `__xhunt_session` JWT; establishing a session here requires that backend to
 * validate the IdP assertion and mint the JWT. Until that exists, this endpoint
 * must NOT establish a session by any other means.
 *
 * The previous implementation used Supabase Auth (`exchangeCodeForSession`,
 * `signInWithSSO`), which (a) is forbidden by the canonical auth flow and (b) set a
 * Supabase session the rest of the app cannot see — every downstream check reads
 * `__xhunt_session`, so those users were silently treated as logged out. It has been
 * removed so it can no longer create a phantom, unreadable session.
 *
 * This handler fails safe: it redirects to sign-in with a clear message rather than
 * pretending to log the user in. The ACS URL remains stable so IdP config in
 * `workspace/settings` does not break once backend SSO lands.
 */
function ssoUnavailable(origin: string): NextResponse {
  return NextResponse.redirect(
    `${origin}/sign-in?error=${encodeURIComponent(
      'Single sign-on is not available yet for this workspace. Contact your administrator.',
    )}`,
  );
}

export async function GET(req: NextRequest) {
  const { origin } = new URL(req.url);
  return ssoUnavailable(origin);
}

export async function POST(req: NextRequest) {
  const { origin } = new URL(req.url);
  return ssoUnavailable(origin);
}
