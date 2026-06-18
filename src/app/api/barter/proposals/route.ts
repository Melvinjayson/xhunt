import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const direction = searchParams.get('direction') ?? 'outbound';

  if (direction === 'inbound') {
    // Proposals on my listings
    const { data, error } = await sb
      .from('barter_proposals')
      .select('id, listing_id, proposer_id, offer_xp, offer_description, status, message, created_at, listing:barter_listings!listing_id(id, title, user_id), proposer:user_profiles!proposer_id(id, display_name)')
      .eq('listing.user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ proposals: data ?? [] });
  }

  // Outbound: my proposals on others' listings
  const { data, error } = await sb
    .from('barter_proposals')
    .select('id, listing_id, offer_xp, offer_description, status, message, created_at, listing:barter_listings!listing_id(id, title)')
    .eq('proposer_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ proposals: data ?? [] });
}

export async function POST(req: NextRequest) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as {
    listing_id?: string;
    offer_xp?: number;
    offer_description?: string;
    message?: string;
  };

  if (!body.listing_id) {
    return NextResponse.json({ error: 'listing_id is required' }, { status: 400 });
  }

  // Verify listing is active and not owned by current user
  const { data: listing } = await sb
    .from('barter_listings')
    .select('id, user_id, status, ask_xp')
    .eq('id', body.listing_id)
    .single();

  if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  if (listing.status !== 'active') return NextResponse.json({ error: 'Listing is not active' }, { status: 400 });
  if (listing.user_id === user.id) return NextResponse.json({ error: 'Cannot propose on your own listing' }, { status: 400 });

  const { data, error } = await sb
    .from('barter_proposals')
    .insert({
      listing_id: body.listing_id,
      proposer_id: user.id,
      offer_xp: body.offer_xp && body.offer_xp > 0 ? Math.floor(body.offer_xp) : null,
      offer_description: body.offer_description?.trim().slice(0, 300) ?? null,
      message: body.message?.trim().slice(0, 500) ?? null,
    })
    .select('id, status')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ proposal: data }, { status: 201 });
}
