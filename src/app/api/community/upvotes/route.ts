import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/server';
import {
  upvote, removeUpvote, getUpvoteSummary,
  type UpvoteTargetType,
} from '@/lib/economy/community';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = session.sub;

  const { searchParams } = new URL(req.url);
  const targetType = searchParams.get('target_type') as UpvoteTargetType;
  const targetId   = searchParams.get('target_id');

  if (!targetType || !targetId) {
    return NextResponse.json({ error: 'target_type and target_id required' }, { status: 400 });
  }

  const summary = await getUpvoteSummary(targetType, targetId);
  // Check if this user already voted
  const supabase = await createClient();
  const { data: myVote } = await supabase
    .from('community_upvotes')
    .select('id')
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .eq('voter_id', userId)
    .single();

  return NextResponse.json({ ...summary, hasVoted: !!myVote });
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = session.sub;

  const body = await req.json() as Record<string, unknown>;
  const action = body.action as string;

  if (action === 'upvote') {
    // Fetch voter's trust score
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from('trust_profiles')
      .select('composite_score')
      .eq('user_id', userId)
      .single();
    const trustScore = profile
      ? Math.round((profile.composite_score as number) * 100)
      : 0;

    const vote = await upvote(
      userId,
      body.target_type as UpvoteTargetType,
      body.target_id as string,
      trustScore
    );
    if (!vote) return NextResponse.json({ error: 'Already voted or failed' }, { status: 409 });
    return NextResponse.json(vote, { status: 201 });
  }

  if (action === 'remove') {
    const ok = await removeUpvote(
      userId,
      body.target_type as UpvoteTargetType,
      body.target_id as string
    );
    return NextResponse.json({ success: ok });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
