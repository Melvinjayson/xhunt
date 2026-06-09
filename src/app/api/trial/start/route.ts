import { createClient } from '@/lib/supabase/server';
import { TRIAL_DAYS } from '@/lib/freemium';

export async function POST() {
  try {
    const sb = await createClient();
    const { data: { user } } = await sb.auth.getUser();

    if (!user) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { data: profile } = await sb
      .from('user_profiles')
      .select('subscription_tier, trial_started_at')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return Response.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (profile.trial_started_at) {
      return Response.json({ error: 'Trial already used' }, { status: 409 });
    }
    if (profile.subscription_tier !== 'free') {
      return Response.json({ error: 'Already on an active plan' }, { status: 409 });
    }

    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

    const { error } = await sb.from('user_profiles').update({
      subscription_tier: 'trial',
      trial_started_at: now.toISOString(),
      trial_ends_at: trialEndsAt.toISOString(),
    }).eq('id', user.id);

    if (error) throw error;

    return Response.json({
      tier: 'trial',
      trialEndsAt: trialEndsAt.toISOString(),
      trialDaysLeft: TRIAL_DAYS,
    });
  } catch (err) {
    console.error('[trial/start]', err);
    return Response.json({ error: 'Failed to start trial' }, { status: 500 });
  }
}
