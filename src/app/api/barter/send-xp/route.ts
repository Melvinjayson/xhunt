import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as { to_user_id?: string; amount?: number; note?: string };
  const { to_user_id, amount, note } = body;

  if (!to_user_id || typeof to_user_id !== 'string') {
    return NextResponse.json({ error: 'to_user_id is required' }, { status: 400 });
  }
  if (to_user_id === user.id) {
    return NextResponse.json({ error: 'Cannot send XP to yourself' }, { status: 400 });
  }
  if (!amount || typeof amount !== 'number' || amount < 1 || amount > 10000) {
    return NextResponse.json({ error: 'Amount must be between 1 and 10000' }, { status: 400 });
  }

  const { data, error } = await sb.rpc('transfer_xp', {
    from_id: user.id,
    to_id: to_user_id,
    amount: Math.floor(amount),
    note: note ?? null,
  });

  if (error) {
    if (error.message.includes('Insufficient')) {
      return NextResponse.json({ error: 'Insufficient XP balance' }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const row = (data as { new_from_balance: number }[])[0];
  return NextResponse.json({ ok: true, new_balance: row?.new_from_balance ?? 0 });
}
