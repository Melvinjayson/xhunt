import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { getJwtSecretKey } from '@/lib/env';

const COOKIE = '__xhunt_session';

// Identity headers this proxy injects for downstream API routes. They are
// forged-input if they arrive from the client, so they are always stripped
// from the inbound request before we (maybe) set our own trusted values.
const IDENTITY_HEADERS = ['x-user-id', 'x-user-email', 'x-user-role', 'x-tenant-id'];

const PUBLIC_PATTERNS = [
  /^\/$/, /^\/about/, /^\/blog/, /^\/careers/, /^\/contact/,
  /^\/consumer/, /^\/cookies/, /^\/developers/, /^\/enterprise/,
  /^\/get-started/, /^\/marketplace/, /^\/mission-control/,
  /^\/pricing/, /^\/privacy/, /^\/security/, /^\/terms/, /^\/use-cases/,
  /^\/sign-in/, /^\/sign-up/,
  /^\/api\/auth/, /^\/api\/contact/, /^\/api\/cron/, /^\/api\/stripe\/webhook/,
];

const AUTH_PAGE_PATTERNS = [/^\/sign-in/, /^\/sign-up/];
const PROTECTED_PATTERNS = [
  /^\/workspace/, /^\/admin/,
  /^\/home/, /^\/explore/, /^\/missions/, /^\/messages/, /^\/profile/,
  /^\/hunt/, /^\/active/, /^\/complete/, /^\/live/, /^\/people/, /^\/rewards/,
  /^\/barter/, /^\/community/, /^\/timeline/, /^\/notifications/,
];

function isPublic(pathname: string) {
  return PUBLIC_PATTERNS.some((p) => p.test(pathname));
}

function isAuthPage(pathname: string) {
  return AUTH_PAGE_PATTERNS.some((p) => p.test(pathname));
}

function isProtected(pathname: string) {
  return PROTECTED_PATTERNS.some((p) => p.test(pathname));
}

async function getSession(req: NextRequest) {
  const token = req.cookies.get(COOKIE)?.value
    ?? req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey(), { algorithms: ['HS256'] });
    if (payload['type'] !== 'access') return null;
    return payload;
  } catch {
    return null;
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const session = await getSession(req);

  // Redirect logged-in users away from auth pages to their surface
  if (session && isAuthPage(pathname)) {
    const surface = (session['surface'] as string) ?? 'home';
    return NextResponse.redirect(new URL(`/${surface}`, req.url));
  }

  // Protect workspace + admin routes
  if (isProtected(pathname)) {
    if (!session) {
      const url = req.nextUrl.clone();
      url.pathname = '/sign-in';
      url.searchParams.set('redirect_url', pathname);
      return NextResponse.redirect(url);
    }
    // Enforce role access for admin
    if (pathname.startsWith('/admin') && (session['app_role'] ?? session['role']) !== 'platform_admin') {
      return NextResponse.redirect(new URL('/home', req.url));
    }
  }

  // Forward user identity as request headers so API routes can read them.
  // CRITICAL: strip any client-supplied identity headers first — otherwise an
  // unauthenticated request could set `x-user-id` itself and be trusted as that
  // user by getSessionUser(). We only set these from a verified session.
  const reqHeaders = new Headers(req.headers);
  for (const h of IDENTITY_HEADERS) reqHeaders.delete(h);
  if (session) {
    reqHeaders.set('x-user-id',    session['sub'] as string);
    reqHeaders.set('x-user-email', (session['email'] as string) ?? '');
    reqHeaders.set('x-user-role',  (session['app_role'] ?? session['role']) as string ?? 'explorer');
    reqHeaders.set('x-tenant-id',  (session['tenant_id'] as string) ?? '');
  }
  return NextResponse.next({ request: { headers: reqHeaders } });
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
