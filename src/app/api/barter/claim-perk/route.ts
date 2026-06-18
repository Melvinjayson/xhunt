import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as { listing_id?: string };
  if (!body.listing_id) {
    return NextResponse.json({ error: 'listing_id is required' }, { status: 400 });
  }

  // Check not already claimed
  const { data: existing } = await sb
    .from('perk_claims')
    .select('id')
    .eq('listing_id', body.listing_id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'You have already claimed this perk' }, { status: 400 });
  }

  const { data, error } = await sb.rpc('claim_perk', {
    claimer_id: user.id,
    p_listing_id: body.listing_id,
  });

  if (error) {
    if (error.message.includes('Insufficient')) {
      return NextResponse.json({ error: 'Insufficient XP balance' }, { status: 400 });
    }
    if (error.message.includes('not found')) {
      return NextResponse.json({ error: 'Perk not available' }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const row = (data as { new_balance: number }[])[0];
  return NextResponse.json({ ok: true, new_balance: row?.new_balance ?? 0 });
}
