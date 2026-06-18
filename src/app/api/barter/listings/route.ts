import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ALLOWED_TYPES = ['skill_offer', 'coupon_trade', 'badge_offer', 'certificate', 'perk'];

export async function GET(req: NextRequest) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type   = searchParams.get('type') ?? undefined;
  const limit  = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 50);
  const offset = parseInt(searchParams.get('offset') ?? '0', 10);

  let query = sb
    .from('barter_listings')
    .select('id, user_id, listing_type, title, description, offering, ask_xp, ask_description, status, expires_at, created_at, user:user_profiles!user_id(id, display_name)', { count: 'exact' })
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (type && ALLOWED_TYPES.includes(type)) {
    query = query.eq('listing_type', type);
  }

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ listings: data ?? [], total: count ?? 0 });
}

export async function POST(req: NextRequest) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as {
    listing_type?: string;
    title?: string;
    description?: string;
    offering?: Record<string, unknown>;
    ask_xp?: number;
    ask_description?: string;
    expires_at?: string;
  };

  if (!body.listing_type || !ALLOWED_TYPES.includes(body.listing_type)) {
    return NextResponse.json({ error: 'Invalid listing_type' }, { status: 400 });
  }
  if (!body.title?.trim()) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 });
  }

  const { data, error } = await sb
    .from('barter_listings')
    .insert({
      user_id: user.id,
      listing_type: body.listing_type,
      title: body.title.trim().slice(0, 120),
      description: body.description?.trim().slice(0, 500) ?? null,
      offering: body.offering ?? {},
      ask_xp: body.ask_xp && body.ask_xp > 0 ? Math.floor(body.ask_xp) : null,
      ask_description: body.ask_description?.trim().slice(0, 200) ?? null,
      expires_at: body.expires_at ?? null,
    })
    .select('id, listing_type, title, status, created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ listing: data }, { status: 201 });
}
