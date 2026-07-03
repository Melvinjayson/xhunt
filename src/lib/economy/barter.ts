import { createClient } from '@/lib/supabase/server';

// ─── Types ────────────────────────────────────────────────────────────────────

export type BarterAssetType = 'points' | 'badge' | 'skill_session' | 'coupon' | 'benefit';
export type BarterWantType  = BarterAssetType | 'open';
export type ListingStatus   = 'open' | 'pending' | 'completed' | 'cancelled' | 'expired';
export type OfferStatus     = 'pending' | 'accepted' | 'rejected' | 'withdrawn' | 'expired';
export type TransferType    = 'gift' | 'trade' | 'recognition' | 'tip';

export interface AssetValue {
  // points
  amount?: number;
  // badge
  badge_label?: string;
  badge_emoji?: string;
  reward_event_id?: string;
  // skill_session
  skill?: string;
  hours?: number;
  format?: 'video_call' | 'async' | 'in_person';
  // coupon
  coupon_code?: string;
  // benefit / open
  description?: string;
}

export interface BarterListing {
  id: string;
  user_id: string;
  tenant_id: string | null;
  offer_type: BarterAssetType;
  offer_value: AssetValue;
  want_type: BarterWantType;
  want_description: string;
  want_value: AssetValue;
  min_trust_score: number;
  allowed_tenant_id: string | null;
  status: ListingStatus;
  view_count: number;
  offer_count: number;
  expires_at: string;
  created_at: string;
  updated_at: string;
  user?: { display_name: string; avatar_url: string | null };
}

export interface BarterOffer {
  id: string;
  listing_id: string;
  offerer_id: string;
  offer_type: BarterAssetType;
  offer_value: AssetValue;
  message: string | null;
  status: OfferStatus;
  created_at: string;
  updated_at: string;
  offerer?: { display_name: string; avatar_url: string | null };
}

export interface BarterTransaction {
  id: string;
  listing_id: string | null;
  offer_id: string | null;
  initiator_id: string;
  responder_id: string;
  tenant_id: string | null;
  initiator_gave: AssetValue & { type: BarterAssetType };
  responder_gave: AssetValue & { type: BarterAssetType };
  trust_delta: number;
  status: 'completed' | 'disputed' | 'resolved';
  completed_at: string;
}

export interface PointTransfer {
  id: string;
  from_user_id: string;
  to_user_id: string;
  tenant_id: string | null;
  amount: number;
  reason: string | null;
  transfer_type: TransferType;
  created_at: string;
  from_user?: { display_name: string; avatar_url: string | null };
  to_user?:   { display_name: string; avatar_url: string | null };
}

// ─── Presentation helpers ─────────────────────────────────────────────────────

export function formatAsset(type: BarterAssetType | 'open', value: AssetValue): string {
  switch (type) {
    case 'points':        return `${(value.amount ?? 0).toLocaleString()} pts`;
    case 'badge':         return `${value.badge_emoji ?? '🏅'} ${value.badge_label ?? 'Badge'}`;
    case 'skill_session': return `${value.hours ?? 1}h ${value.skill ?? 'Session'}`;
    case 'coupon':        return value.coupon_code ? `Coupon: ${value.coupon_code}` : 'Coupon';
    case 'benefit':       return value.description ?? 'Benefit';
    case 'open':          return 'Open offer';
    default:              return 'Unknown';
  }
}

export function assetIcon(type: BarterAssetType | 'open'): string {
  const MAP: Record<string, string> = {
    points: '⚡',  badge: '🏅',  skill_session: '🧠',
    coupon: '🎟️',  benefit: '🎁', open: '🤝',
  };
  return MAP[type] ?? '🔄';
}

export function timeUntilExpiry(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0)       return 'Expired';
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  if (d > 0) return `${d}d left`;
  if (h > 0) return `${h}h left`;
  return 'Expiring soon';
}

// ─── Supabase helpers ─────────────────────────────────────────────────────────

export async function getOpenListings(opts?: {
  tenantId?: string;
  offerType?: BarterAssetType;
  limit?: number;
}): Promise<BarterListing[]> {
  const supabase = await createClient();
  let q = supabase
    .from('barter_listings')
    .select('*, user:user_profiles!user_id(display_name,avatar_url)')
    .eq('status', 'open')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(opts?.limit ?? 60);
  if (opts?.tenantId)  q = q.or(`tenant_id.eq.${opts.tenantId},tenant_id.is.null`);
  if (opts?.offerType) q = q.eq('offer_type', opts.offerType);
  const { data } = await q;
  return (data ?? []) as unknown as BarterListing[];
}

export async function getMyListings(userId: string): Promise<BarterListing[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('barter_listings')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return (data ?? []) as unknown as BarterListing[];
}

export async function getOffersForListing(listingId: string): Promise<BarterOffer[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('barter_offers')
    .select('*, offerer:user_profiles!offerer_id(display_name,avatar_url)')
    .eq('listing_id', listingId)
    .order('created_at', { ascending: false });
  return (data ?? []) as unknown as BarterOffer[];
}

export async function getMyOffers(userId: string): Promise<(BarterOffer & { listing?: BarterListing })[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('barter_offers')
    .select('*, listing:barter_listings!listing_id(*)')
    .eq('offerer_id', userId)
    .order('created_at', { ascending: false });
  return (data ?? []) as unknown as (BarterOffer & { listing?: BarterListing })[];
}

export async function getMyTransactions(userId: string): Promise<BarterTransaction[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('barter_transactions')
    .select('*')
    .or(`initiator_id.eq.${userId},responder_id.eq.${userId}`)
    .order('completed_at', { ascending: false });
  return (data ?? []) as unknown as BarterTransaction[];
}

export async function getPointTransfers(userId: string): Promise<PointTransfer[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('point_transfers')
    .select('*, from_user:user_profiles!from_user_id(display_name,avatar_url), to_user:user_profiles!to_user_id(display_name,avatar_url)')
    .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(50);
  return (data ?? []) as unknown as PointTransfer[];
}

export async function createListing(
  userId: string,
  input: {
    offer_type: BarterAssetType;
    offer_value: AssetValue;
    want_type: BarterWantType;
    want_description: string;
    want_value?: AssetValue;
    min_trust_score?: number;
    expires_in_days?: number;
    tenant_id?: string;
  }
): Promise<BarterListing | null> {
  const supabase = await createClient();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (input.expires_in_days ?? 14));
  const { data, error } = await supabase
    .from('barter_listings')
    .insert({
      user_id: userId,
      tenant_id: input.tenant_id ?? null,
      offer_type: input.offer_type,
      offer_value: input.offer_value,
      want_type: input.want_type,
      want_description: input.want_description,
      want_value: input.want_value ?? {},
      min_trust_score: input.min_trust_score ?? 0,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();
  if (error) { console.error('createListing:', error.message); return null; }
  return data as unknown as BarterListing;
}

export async function makeOffer(
  offererId: string,
  input: {
    listing_id: string;
    offer_type: BarterAssetType;
    offer_value: AssetValue;
    message?: string;
  }
): Promise<BarterOffer | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('barter_offers')
    .insert({
      listing_id: input.listing_id,
      offerer_id: offererId,
      offer_type: input.offer_type,
      offer_value: input.offer_value,
      message: input.message ?? null,
    })
    .select()
    .single();
  if (error) { console.error('makeOffer:', error.message); return null; }
  // Best-effort increment of offer_count; ignore failure
  const { data: row } = await supabase
    .from('barter_listings')
    .select('offer_count')
    .eq('id', input.listing_id)
    .single();
  if (row) {
    await supabase
      .from('barter_listings')
      .update({ offer_count: (row.offer_count as number) + 1 })
      .eq('id', input.listing_id);
  }
  return data as unknown as BarterOffer;
}

export async function withdrawOffer(offererId: string, offerId: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('barter_offers')
    .update({ status: 'withdrawn' })
    .eq('id', offerId)
    .eq('offerer_id', offererId)
    .eq('status', 'pending');
  return !error;
}

export async function acceptOffer(
  listingOwnerId: string,
  offerId: string
): Promise<BarterTransaction | null> {
  const supabase = await createClient();
  // Fetch offer + parent listing
  const { data: offer, error: offerErr } = await supabase
    .from('barter_offers')
    .select('*, listing:barter_listings!listing_id(*)')
    .eq('id', offerId)
    .single();
  if (offerErr || !offer) return null;
  const listing = offer.listing as unknown as BarterListing;
  if (listing.user_id !== listingOwnerId) return null;
  // Atomically update states
  await supabase.from('barter_offers').update({ status: 'accepted' }).eq('id', offerId);
  await supabase.from('barter_listings').update({ status: 'pending' }).eq('id', listing.id);
  await supabase
    .from('barter_offers')
    .update({ status: 'rejected' })
    .eq('listing_id', listing.id)
    .neq('id', offerId)
    .eq('status', 'pending');
  // Record transaction
  const { data: tx, error: txErr } = await supabase
    .from('barter_transactions')
    .insert({
      listing_id:    listing.id,
      offer_id:      offerId,
      initiator_id:  listing.user_id,
      responder_id:  (offer as unknown as BarterOffer).offerer_id,
      tenant_id:     listing.tenant_id,
      initiator_gave: { type: listing.offer_type, ...listing.offer_value },
      responder_gave: { type: (offer as unknown as BarterOffer).offer_type, ...(offer as unknown as BarterOffer).offer_value },
    })
    .select()
    .single();
  if (txErr) return null;
  // Mark listing completed
  await supabase.from('barter_listings').update({ status: 'completed' }).eq('id', listing.id);
  return tx as unknown as BarterTransaction;
}

export async function cancelListing(userId: string, listingId: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('barter_listings')
    .update({ status: 'cancelled' })
    .eq('id', listingId)
    .eq('user_id', userId)
    .eq('status', 'open');
  return !error;
}

export async function sendPoints(
  fromUserId: string,
  toUserId: string,
  amount: number,
  opts?: { reason?: string; transferType?: TransferType; tenantId?: string }
): Promise<boolean> {
  if (amount <= 0 || fromUserId === toUserId) return false;
  const supabase = await createClient();
  const { error } = await supabase.from('point_transfers').insert({
    from_user_id:  fromUserId,
    to_user_id:    toUserId,
    tenant_id:     opts?.tenantId ?? null,
    amount,
    reason:        opts?.reason ?? null,
    transfer_type: opts?.transferType ?? 'gift',
  });
  return !error;
}

// ─── Workspace analytics helpers ─────────────────────────────────────────────

export async function getBarterStats(tenantId: string) {
  const supabase = await createClient();
  const [listings, transactions, transfers] = await Promise.all([
    supabase.from('barter_listings').select('id,status,offer_type,offer_count,view_count,created_at').eq('tenant_id', tenantId),
    supabase.from('barter_transactions').select('id,initiator_gave,responder_gave,completed_at').eq('tenant_id', tenantId),
    supabase.from('point_transfers').select('id,amount,transfer_type,created_at').eq('tenant_id', tenantId),
  ]);
  const totalListings   = listings.data?.length ?? 0;
  const activeListings  = listings.data?.filter((l) => l.status === 'open').length ?? 0;
  const completedTrades = transactions.data?.length ?? 0;
  const pointsTransferred = transfers.data?.reduce((s, r) => s + (r.amount as number), 0) ?? 0;
  const byType = listings.data?.reduce<Record<string, number>>((acc, l) => {
    acc[l.offer_type as string] = (acc[l.offer_type as string] ?? 0) + 1;
    return acc;
  }, {}) ?? {};
  return { totalListings, activeListings, completedTrades, pointsTransferred, byType };
}
