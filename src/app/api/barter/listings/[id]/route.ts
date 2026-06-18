import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const { error } = await sb
    .from('barter_listings')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('status', 'active');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
