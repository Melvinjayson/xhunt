import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(req: NextRequest) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({})) as { ids?: string[] };

  let query = sb.from('notifications').update({ read: true }).eq('user_id', user.id);
  if (body.ids?.length) {
    query = (query as typeof query).in('id', body.ids);
  } else {
    query = (query as typeof query).eq('read', false);
  }

  await query;
  return NextResponse.json({ ok: true });
}
