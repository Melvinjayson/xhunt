import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) =>
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    },
  );
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = await getSupabase();

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single();

  if (!profile?.tenant_id) {
    return NextResponse.json({ error: 'No tenant found' }, { status: 400 });
  }

  const body = await req.json() as {
    title?: string;
    description?: string;
    tasks?: string[];
    reward?: string;
    estimated_time?: string;
    status?: string;
  };

  if (!body.title?.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  const steps = Array.isArray(body.tasks)
    ? body.tasks.map((task, i) => ({
        id: `step-${i + 1}`,
        title: task,
        instructions: task,
        type: 'action',
      }))
    : [];

  const { data: mission, error } = await supabase
    .from('missions')
    .insert({
      tenant_id: profile.tenant_id,
      created_by: user.id,
      title: body.title.trim(),
      story_context: body.description ?? '',
      steps,
      reward: body.reward ?? '$0',
      estimated_time: body.estimated_time ?? '30 minutes',
      tags: [],
      status: body.status ?? 'active',
      difficulty: 'easy',
    })
    .select('id')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: mission.id });
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = await getSupabase();

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single();

  if (!profile?.tenant_id) {
    return NextResponse.json({ missions: [] });
  }

  const { data: missions, error } = await supabase
    .from('missions')
    .select('id, title, status, created_at, difficulty, estimated_time, reward')
    .eq('tenant_id', profile.tenant_id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ missions: missions ?? [] });
}
