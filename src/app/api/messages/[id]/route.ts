import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSessionUser } from '@/lib/auth/session';

type Ctx = { params: Promise<{ id: string }> };

// GET /api/messages/[id] — fetch messages for a conversation (user must be a member)
export async function GET(req: NextRequest, { params }: Ctx) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const admin = createAdminClient();

  // Verify membership
  const { data: member } = await admin
    .from('conversation_members')
    .select('id, last_read_at')
    .eq('conversation_id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!member) return NextResponse.json({ error: 'Not a member' }, { status: 403 });

  // Fetch messages with sender profile
  const { data: messages, error } = await admin
    .from('messages')
    .select(`
      id, content, message_type, metadata, created_at, edited_at, is_deleted,
      sender:sender_id ( id, display_name, avatar_url )
    `)
    .eq('conversation_id', id)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch conversation info
  const { data: conv } = await admin
    .from('conversations')
    .select('id, type, name, mission_id')
    .eq('id', id)
    .single();

  // Update last_read_at
  await admin
    .from('conversation_members')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', id)
    .eq('user_id', user.id);

  return NextResponse.json({ conversation: conv, messages: messages ?? [] });
}

// POST /api/messages/[id] — send a message
export async function POST(req: NextRequest, { params }: Ctx) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json() as { content: string; message_type?: string };

  if (!body.content?.trim()) {
    return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Verify membership
  const { data: member } = await admin
    .from('conversation_members')
    .select('id')
    .eq('conversation_id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!member) return NextResponse.json({ error: 'Not a member' }, { status: 403 });

  const { data: message, error } = await admin
    .from('messages')
    .insert({
      conversation_id: id,
      sender_id:       user.id,
      content:         body.content.trim(),
      message_type:    body.message_type ?? 'text',
    })
    .select(`
      id, content, message_type, created_at,
      sender:sender_id ( id, display_name, avatar_url )
    `)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(message, { status: 201 });
}
