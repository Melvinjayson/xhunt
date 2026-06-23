import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSessionUser } from '@/lib/auth/session';

// GET /api/messages/conversations — list conversations the user is a member of
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();

  const { data: memberships, error } = await admin
    .from('conversation_members')
    .select(`
      last_read_at,
      conversations:conversation_id (
        id, type, name, avatar_url, last_message_at, created_at, mission_id,
        messages (
          id, content, sender_id, message_type, created_at
        )
      )
    `)
    .eq('user_id', user.id)
    .order('conversations(last_message_at)', { ascending: false, nullsFirst: false })
    .limit(40);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  type ConvRow = {
    id: string; type: string; name: string | null; avatar_url: string | null;
    last_message_at: string | null; created_at: string; mission_id: string | null;
    messages: Array<{ id: string; content: string; created_at: string }> | null;
  };

  const conversations = (memberships ?? []).map((m) => {
    const conv = (m.conversations as unknown) as ConvRow;
    const msgs = conv.messages ?? [];
    const last = msgs.sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    const lastReadAt = m.last_read_at ? new Date(m.last_read_at).getTime() : 0;
    const unreadCount = msgs.filter(
      (msg) => new Date(msg.created_at).getTime() > lastReadAt
    ).length;

    return {
      id:            conv.id,
      type:          conv.type,
      name:          conv.name ?? (conv.mission_id ? 'Mission Chat' : 'Direct Message'),
      avatar_url:    conv.avatar_url ?? null,
      last_message:  last?.content ?? '',
      last_message_at: conv.last_message_at ?? conv.created_at,
      unread_count:  unreadCount,
    };
  });

  return NextResponse.json({ conversations });
}

// POST /api/messages/conversations
// Find or create a conversation.
// Body: { type: 'direct' | 'mission' | 'team', mission_id?, participant_ids?, name? }
// Returns: { conversation_id: string }

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as {
    type: 'direct' | 'mission' | 'team' | 'organization' | 'community';
    mission_id?: string;
    participant_ids?: string[];
    name?: string;
  };

  const admin = createAdminClient();

  // ── Mission conversation ──────────────────────────────────────────────────
  if (body.type === 'mission' && body.mission_id) {
    const { data: existing } = await admin
      .from('conversations')
      .select('id')
      .eq('type', 'mission')
      .eq('mission_id', body.mission_id)
      .maybeSingle();

    let convId: string;

    if (existing) {
      convId = existing.id;
    } else {
      // Fetch mission name for conversation label
      const { data: mission } = await admin
        .from('missions')
        .select('title, tenant_id')
        .eq('id', body.mission_id)
        .single();

      const { data: conv, error } = await admin
        .from('conversations')
        .insert({
          type:       'mission',
          mission_id: body.mission_id,
          tenant_id:  mission?.tenant_id ?? null,
          name:       mission?.title ? `${mission.title} Chat` : 'Mission Chat',
          created_by: user.id,
        })
        .select('id')
        .single();

      if (error || !conv) {
        return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
      }
      convId = conv.id;
    }

    // Ensure requesting user is a member
    await admin
      .from('conversation_members')
      .upsert(
        { conversation_id: convId, user_id: user.id, role: 'member' },
        { onConflict: 'conversation_id,user_id', ignoreDuplicates: true }
      );

    return NextResponse.json({ conversation_id: convId });
  }

  // ── Direct message ────────────────────────────────────────────────────────
  if (body.type === 'direct' && body.participant_ids?.length === 1) {
    const otherId = body.participant_ids[0];
    if (!otherId || otherId === user.id) {
      return NextResponse.json({ error: 'Invalid participant' }, { status: 400 });
    }

    // Find existing direct conversation between these two users
    const { data: existingId } = await admin.rpc('find_direct_conversation', {
      user_a: user.id,
      user_b: otherId,
    });

    if (existingId) {
      return NextResponse.json({ conversation_id: existingId });
    }

    // Create new direct conversation
    const { data: conv, error } = await admin
      .from('conversations')
      .insert({ type: 'direct', created_by: user.id })
      .select('id')
      .single();

    if (error || !conv) {
      return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
    }

    // Add both users as members
    await admin.from('conversation_members').insert([
      { conversation_id: conv.id, user_id: user.id,  role: 'owner' },
      { conversation_id: conv.id, user_id: otherId,  role: 'member' },
    ]);

    return NextResponse.json({ conversation_id: conv.id });
  }

  // ── Named group / community ────────────────────────────────────────────────
  if (['team', 'organization', 'community'].includes(body.type) && body.name) {
    const { data: conv, error } = await admin
      .from('conversations')
      .insert({ type: body.type, name: body.name, created_by: user.id })
      .select('id')
      .single();

    if (error || !conv) {
      return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
    }

    const members = [
      { conversation_id: conv.id, user_id: user.id, role: 'owner' },
      ...(body.participant_ids ?? []).map((uid) => ({
        conversation_id: conv.id, user_id: uid, role: 'member' as const,
      })),
    ];
    await admin.from('conversation_members').insert(members);

    return NextResponse.json({ conversation_id: conv.id });
  }

  return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
}
