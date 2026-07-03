import Stripe from 'stripe';
import { NextRequest } from 'next/server';
import { env } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!env.stripeSecretKey || env.stripeSecretKey.includes('REPLACE_ME')) {
    return Response.json({ error: 'Payment system not configured' }, { status: 503 });
  }

  const user = await getSessionUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = await createClient();

  const { data: profile } = await sb
    .from('user_profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single();

  const customerId = profile?.stripe_customer_id as string | undefined;
  if (!customerId) {
    return Response.json({ error: 'No Stripe customer found. Subscribe first.' }, { status: 404 });
  }

  const stripe  = new Stripe(env.stripeSecretKey);
  const origin  = new URL(request.url).origin;
  const session = await stripe.billingPortal.sessions.create({
    customer:   customerId,
    return_url: `${origin}/workspace/billing`,
  });

  return Response.json({ url: session.url });
}
