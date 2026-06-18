import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json() as { action?: 'accept' | 'reject' };

  if (body.action !== 'accept' && body.action !== 'reject') {
    return NextResponse.json({ error: 'action must be accept or reject' }, { status: 400 });
  }

  // Fetch proposal + verify listing owner
  const { data: proposal } = await sb
    .from('barter_proposals')
    .select('id, listing_id, proposer_id, offer_xp, status, listing:barter_listings!listing_id(id, user_id, status)')
    .eq('id', id)
    .single();

  if (!proposal) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
  if (proposal.status !== 'pending') return NextResponse.json({ error: 'Proposal is no longer pending' }, { status: 400 });

  const listing = proposal.listing as unknown as { id: string; user_id: string; status: string } | null;
  if (!listing || listing.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (listing.status !== 'active') {
    return NextResponse.json({ error: 'Listing is no longer active' }, { status: 400 });
  }

  if (body.action === 'reject') {
    await sb.from('barter_proposals').update({ status: 'rejected', updated_at: new Date().toISOString() }).eq('id', id);
    return NextResponse.json({ ok: true });
  }

  // Accept: execute XP transfer if offer_xp > 0
  if (proposal.offer_xp && proposal.offer_xp > 0) {
    const { error: xpError } = await sb.rpc('transfer_xp', {
      from_id: proposal.proposer_id,
      to_id: user.id,
      amount: proposal.offer_xp,
      note: `Barter trade — listing ${listing.id}`,
    });
    if (xpError) {
      return NextResponse.json({ error: xpError.message }, { status: 400 });
    }
  }

  // Mark proposal completed + close listing
  await Promise.all([
    sb.from('barter_proposals').update({ status: 'completed', updated_at: new Date().toISOString() }).eq('id', id),
    sb.from('barter_listings').update({ status: 'completed', updated_at: new Date().toISOString() }).eq('id', listing.id),
  ]);

  return NextResponse.json({ ok: true });
}
