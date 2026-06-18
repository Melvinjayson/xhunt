import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PUT(req: NextRequest) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as Record<string, unknown>;

  const allowed = ['display_name', 'interests', 'goals'] as const;
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  if (typeof update.display_name === 'string') {
    update.display_name = update.display_name.trim().slice(0, 80) || undefined;
    if (!update.display_name) delete update.display_name;
  }
  if (!Array.isArray(update.interests)) delete update.interests;
  if (!Array.isArray(update.goals)) delete update.goals;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  update.updated_at = new Date().toISOString();

  const { data, error } = await sb
    .from('user_profiles')
    .update(update)
    .eq('id', user.id)
    .select('id, display_name, interests, goals')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data });
}
