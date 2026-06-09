import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const sb = await createClient();

  try {
    const [sessionsResult, postsResult] = await Promise.all([
      sb
        .from('live_sessions')
        .select(`
          id, title, description, status, current_step_index, total_steps,
          viewer_count, is_pro_only, started_at, scheduled_for, created_at,
          host:user_profiles!host_id(display_name, avatar_url),
          mission:missions(title)
        `)
        .in('status', ['scheduled', 'live'])
        .order('status', { ascending: false })
        .order('scheduled_for', { ascending: true, nullsFirst: false })
        .limit(20),

      sb
        .from('experience_posts')
        .select(`
          id, post_type, caption, reaction_count, metadata, created_at, mission_id,
          user:user_profiles!user_id(display_name, avatar_url),
          mission:missions(title)
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(40),
    ]);

    const liveSessions = (sessionsResult.data ?? []).map((s: Record<string, unknown>) => ({
      id:                 s.id,
      title:              s.title,
      description:        s.description,
      status:             s.status,
      current_step_index: s.current_step_index,
      total_steps:        s.total_steps,
      viewer_count:       s.viewer_count,
      is_pro_only:        s.is_pro_only,
      started_at:         s.started_at,
      scheduled_for:      s.scheduled_for,
      created_at:         s.created_at,
      host_display_name:  (s.host as Record<string,unknown>)?.display_name ?? 'Unknown',
      host_avatar_url:    (s.host as Record<string,unknown>)?.avatar_url ?? null,
      mission_title:      (s.mission as Record<string,unknown>)?.title ?? null,
    }));

    const posts = (postsResult.data ?? []).map((p: Record<string, unknown>) => ({
      id:                p.id,
      post_type:         p.post_type,
      caption:           p.caption,
      reaction_count:    p.reaction_count,
      metadata:          p.metadata,
      created_at:        p.created_at,
      user_display_name: (p.user as Record<string,unknown>)?.display_name ?? 'User',
      user_avatar_url:   (p.user as Record<string,unknown>)?.avatar_url ?? null,
      mission_title:     (p.mission as Record<string,unknown>)?.title ?? null,
    }));

    return NextResponse.json({ liveSessions, posts });
  } catch (err) {
    console.error('[api/timeline]', err);
    // Tables may not exist yet — return empty feed gracefully
    return NextResponse.json({ liveSessions: [], posts: [] });
  }
}
