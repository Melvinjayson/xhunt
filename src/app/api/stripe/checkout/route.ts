import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe, STRIPE_PRICES } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PRO_PRICE_ID) {
    return Response.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  try {
    const sb = await createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return Response.json({ error: 'Authentication required' }, { status: 401 });

    const { data: profile } = await sb
      .from('user_profiles')
      .select('stripe_customer_id, display_name, subscription_tier')
      .eq('id', user.id)
      .single();

    if (profile?.subscription_tier === 'pro') {
      return Response.json({ error: 'Already on Pro plan' }, { status: 409 });
    }

    // Get or create Stripe customer
    let customerId = profile?.stripe_customer_id as string | undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name:  (profile?.display_name as string) ?? undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      await sb.from('user_profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    const origin = req.headers.get('origin') ?? 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      customer:        customerId,
      line_items:      [{ price: STRIPE_PRICES.pro_monthly, quantity: 1 }],
      mode:            'subscription',
      success_url:     `${origin}/upgrade?success=1`,
      cancel_url:      `${origin}/upgrade`,
      subscription_data: { metadata: { supabase_user_id: user.id } },
      allow_promotion_codes: true,
    });

    return Response.json({ url: session.url });
  } catch (err) {
    console.error('[stripe/checkout]', err);
    return Response.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
