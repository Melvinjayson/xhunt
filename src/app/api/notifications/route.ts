import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ notifications: [], unread_count: 0 });

  const admin = createAdminClient();

  // Seed: find reward_events not yet mirrored as notifications
  const { data: existing } = await sb
    .from('notifications')
    .select('data')
    .eq('user_id', user.id)
    .eq('type', 'reward_earned');

  const seededIds = new Set((existing ?? []).map((n: { data: Record<string, unknown> }) => n.data?.reward_event_id as string));

  const { data: newRewards } = await sb
    .from('reward_events')
    .select('id, mission_id, issued_at, mission:missions!mission_id(title)')
    .eq('user_id', user.id)
    .order('issued_at', { ascending: false })
    .limit(20);

  const toInsert = (newRewards ?? [])
    .filter((r: { id: string }) => !seededIds.has(r.id))
    .map((r: { id: string; mission_id: string; issued_at: string; mission: unknown }) => ({
      user_id: user.id,
      type: 'reward_earned',
      title: 'Reward Earned!',
      body: `You completed "${(r.mission as { title?: string })?.title ?? 'a mission'}"`,
      data: { reward_event_id: r.id, mission_id: r.mission_id },
      created_at: r.issued_at,
    }));

  if (toInsert.length > 0) {
    await admin.from('notifications').insert(toInsert);
  }

  const { data: notifications } = await sb
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20);

  const all = notifications ?? [];
  return NextResponse.json({ notifications: all, unread_count: all.filter((n: { read: boolean }) => !n.read).length });
}
