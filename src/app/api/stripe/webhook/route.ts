import { NextRequest } from 'next/server';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig  = req.headers.get('stripe-signature');

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return Response.json({ error: 'Missing signature or webhook secret' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[stripe/webhook] signature verification failed:', err);
    return Response.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    const sb = await createClient();

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.supabase_user_id;
        if (!userId) break;

        const isActive = ['active', 'trialing'].includes(sub.status);
        await sb.from('user_profiles').update({
          subscription_tier:          isActive ? 'pro' : 'free',
          stripe_customer_id:         sub.customer as string,
          stripe_subscription_id:     sub.id,
          stripe_subscription_status: sub.status,
        }).eq('id', userId);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.supabase_user_id;
        if (!userId) break;

        await sb.from('user_profiles').update({
          subscription_tier:          'free',
          stripe_subscription_status: 'canceled',
        }).eq('id', userId);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice & { subscription?: string | null };
        const subscriptionId = invoice.subscription;
        if (!subscriptionId) break;

        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const userId = sub.metadata?.supabase_user_id;
        if (!userId) break;

        await sb.from('user_profiles').update({
          stripe_subscription_status: 'past_due',
        }).eq('id', userId);
        break;
      }
    }
  } catch (err) {
    console.error('[stripe/webhook] handler error:', err);
    // Return 200 so Stripe doesn't retry — log and handle separately
  }

  return Response.json({ received: true });
}
