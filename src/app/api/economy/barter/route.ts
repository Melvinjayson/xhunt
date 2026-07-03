import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/server';
import {
  getOpenListings, getMyListings, getMyOffers, getMyTransactions, getPointTransfers,
  getOffersForListing, createListing, makeOffer, acceptOffer, withdrawOffer,
  cancelListing, sendPoints,
  type BarterAssetType, type BarterWantType, type AssetValue, type TransferType,
} from '@/lib/economy/barter';

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = session.sub;

  const { searchParams } = new URL(req.url);
  const view      = searchParams.get('view') ?? 'listings';
  const offerType = searchParams.get('offer_type') as BarterAssetType | null;
  const listingId = searchParams.get('listing_id');

  switch (view) {
    case 'listings':
      return NextResponse.json(await getOpenListings({ offerType: offerType ?? undefined }));

    case 'mine':
      return NextResponse.json(await getMyListings(userId));

    case 'my_offers':
      return NextResponse.json(await getMyOffers(userId));

    case 'transactions':
      return NextResponse.json(await getMyTransactions(userId));

    case 'transfers':
      return NextResponse.json(await getPointTransfers(userId));

    case 'offers_for_listing':
      if (!listingId) return NextResponse.json({ error: 'listing_id required' }, { status: 400 });
      return NextResponse.json(await getOffersForListing(listingId));

    default:
      return NextResponse.json({ error: 'Unknown view' }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = session.sub;

  const body = await req.json() as Record<string, unknown>;
  const action = body.action as string;

  switch (action) {
    case 'create_listing': {
      const listing = await createListing(userId, {
        offer_type:       body.offer_type       as BarterAssetType,
        offer_value:      body.offer_value       as AssetValue,
        want_type:        body.want_type         as BarterWantType,
        want_description: body.want_description  as string,
        want_value:       body.want_value        as AssetValue | undefined,
        min_trust_score:  body.min_trust_score   as number | undefined,
        expires_in_days:  body.expires_in_days   as number | undefined,
      });
      if (!listing) return NextResponse.json({ error: 'Failed to create listing' }, { status: 500 });
      return NextResponse.json(listing, { status: 201 });
    }

    case 'make_offer': {
      const offer = await makeOffer(userId, {
        listing_id:  body.listing_id  as string,
        offer_type:  body.offer_type  as BarterAssetType,
        offer_value: body.offer_value as AssetValue,
        message:     body.message     as string | undefined,
      });
      if (!offer) return NextResponse.json({ error: 'Failed to make offer' }, { status: 500 });
      return NextResponse.json(offer, { status: 201 });
    }

    case 'accept_offer': {
      const tx = await acceptOffer(userId, body.offer_id as string);
      if (!tx) return NextResponse.json({ error: 'Failed to accept offer' }, { status: 500 });
      return NextResponse.json(tx);
    }

    case 'withdraw_offer': {
      const ok = await withdrawOffer(userId, body.offer_id as string);
      return NextResponse.json({ success: ok });
    }

    case 'cancel_listing': {
      const ok = await cancelListing(userId, body.listing_id as string);
      return NextResponse.json({ success: ok });
    }

    case 'send_points': {
      const ok = await sendPoints(userId, body.to_user_id as string, body.amount as number, {
        reason:       body.reason        as string | undefined,
        transferType: body.transfer_type as TransferType | undefined,
      });
      return NextResponse.json({ success: ok });
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }
}
