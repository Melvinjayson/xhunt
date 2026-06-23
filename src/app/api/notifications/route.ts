import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSessionUser } from '@/lib/auth/session';

// GET /api/notifications — returns the user's 40 most recent notifications
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();

  const { data, error } = await admin
    .from('notifications')
    .select('id, type, title, body, link, read, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(40);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const unread = (data ?? []).filter((n) => !n.read).length;
  return NextResponse.json({ notifications: data ?? [], unread });
}

// POST /api/notifications — insert a notification (internal / server-side use only)
// Body: { user_id, type, title, body?, link? }
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Only platform_admin or system cron can create notifications for others
  const body = await req.json() as {
    user_id?: string;
    type: string;
    title: string;
    body?: string;
    link?: string;
  };

  const targetUserId = body.user_id ?? user.id;
  if (targetUserId !== user.id && user.role !== 'platform_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('notifications')
    .insert({
      user_id: targetUserId,
      type:    body.type,
      title:   body.title,
      body:    body.body ?? null,
      link:    body.link ?? null,
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
