import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Routes that do NOT require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/about(.*)',
  '/pricing(.*)',
  '/use-cases(.*)',
  '/developers(.*)',
  '/marketplace(.*)',
  '/consumer(.*)',
  '/enterprise(.*)',
  '/mission-control(.*)',
  '/contact(.*)',
  '/blog(.*)',
  '/careers(.*)',
  '/security(.*)',
  '/get-started(.*)',
  '/auth/(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/stripe/webhook',
  '/api/contact',
  '/api/cron/(.*)',
  '/api/clerk/(.*)',
]);

const isAuthPageRoute = createRouteMatcher(['/auth/login(.*)', '/auth/signup(.*)']);

// Next.js 16 uses proxy.ts with a named `proxy` export (not middleware.ts default export)
export const proxy = clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();

  // Redirect already-authenticated users away from auth pages
  if (isAuthPageRoute(req) && userId) {
    return NextResponse.redirect(new URL('/home', req.url));
  }

  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    '/(api|trpc)(.*)',
    '/__clerk/:path*',
    '/((?!_next/static|_next/image|favicon\\.ico|api/stripe/webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
