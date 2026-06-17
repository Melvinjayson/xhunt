import { type NextRequest } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { getUserTierInfo } from '@/lib/freemium';

const FREE_DEFAULTS = {
  tier: 'free', isTrialActive: false, trialDaysLeft: 0,
  trialEndsAt: null, canUseAI: false, canAccessPremiumMissions: false,
  aiRequestsPerDay: 0, hasUsedTrial: false,
};

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return Response.json(FREE_DEFAULTS);
    const info = await getUserTierInfo(user.id);
    return Response.json(info);
  } catch {
    return Response.json(FREE_DEFAULTS);
  }
}
