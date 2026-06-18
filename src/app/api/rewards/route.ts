import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await sb
    .from('reward_events')
    .select('id, mission_id, reward_type, reward_value, redeemed, issued_at, mission:missions!mission_id(title)')
    .eq('user_id', user.id)
    .order('issued_at', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rewards = data ?? [];
  const total_unredeemed = rewards.filter((r: { redeemed: boolean }) => !r.redeemed).length;

  return NextResponse.json({ rewards, total_unredeemed });
}
