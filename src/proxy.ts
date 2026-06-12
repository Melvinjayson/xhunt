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
  // Only call auth() for auth pages (to check if user is already signed in)
  if (isAuthPageRoute(req)) {
    try {
      const { userId } = await auth();
      if (userId) {
        return NextResponse.redirect(new URL('/home', req.url));
      }
    } catch {
      // If Clerk isn't configured, show the auth page normally
    }
    return;
  }

  // Public routes pass through without auth check
  if (isPublicRoute(req)) return;

  // Protected routes: auth.protect() redirects unauthenticated users to sign-in
  await auth.protect();
});

export const config = {
  matcher: [
    '/(api|trpc)(.*)',
    '/__clerk/:path*',
    '/((?!_next/static|_next/image|favicon\\.ico|api/stripe/webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
