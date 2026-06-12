import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  // Marketing & informational pages
  '/',
  '/about(.*)',
  '/blog(.*)',
  '/careers(.*)',
  '/contact(.*)',
  '/consumer(.*)',
  '/cookies(.*)',
  '/developers(.*)',
  '/enterprise(.*)',
  '/get-started(.*)',
  '/marketplace(.*)',
  '/mission-control(.*)',
  '/missions(.*)',
  '/pricing(.*)',
  '/privacy(.*)',
  '/security(.*)',
  '/terms(.*)',
  '/use-cases(.*)',
  // Auth
  '/auth/(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
  // Public APIs
  '/api/clerk/(.*)',
  '/api/contact(.*)',
  '/api/cron/(.*)',
  '/api/stripe/webhook(.*)',
]);

const isAuthRoute = createRouteMatcher(['/auth/login(.*)', '/auth/signup(.*)']);

export const proxy = clerkMiddleware(async (auth, req) => {
  // Redirect already-authenticated users away from login/signup pages
  if (isAuthRoute(req)) {
    try {
      const { userId } = await auth();
      if (userId) return Response.redirect(new URL('/home', req.url));
    } catch {
      // Clerk not configured — let through
    }
    return;
  }

  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
