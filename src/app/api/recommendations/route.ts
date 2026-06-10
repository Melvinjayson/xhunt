import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const currentMissionId = searchParams.get('mission_id');
  const limitParam = searchParams.get('limit');
  const limit = Math.min(parseInt(limitParam ?? '5', 10), 20);

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('user_profiles').select('tenant_id').eq('id', user.id).single();
  if (!profile?.tenant_id) return NextResponse.json({ error: 'No tenant' }, { status: 403 });
  const tid = profile.tenant_id;

  // Load all active missions + their scores
  const [missionsRes, scoresRes, progressRes] = await Promise.all([
    supabase.from('missions').select('id, title, difficulty, estimated_time, tags, story_context, reward').eq('tenant_id', tid).in('status', ['active', 'published']),
    supabase.from('mission_scores').select('mission_id, mei, completion_score, engagement_score').eq('tenant_id', tid),
    supabase.from('mission_progress').select('mission_id').eq('user_id', user.id).not('completed_at', 'is', null),
  ]);

  const missions = missionsRes.data ?? [];
  const scores = scoresRes.data ?? [];
  const completedMissionIds = new Set((progressRes.data ?? []).map((p: { mission_id: string }) => p.mission_id));

  // Build score map
  const scoreMap = new Map(scores.map((s) => [s.mission_id, s]));

  // Exclude already completed missions
  const candidates = missions.filter((m) => !completedMissionIds.has(m.id) && m.id !== currentMissionId);

  // If we have a current mission, use KG edges to boost related missions
  const kgBoost: Map<string, number> = new Map();
  if (currentMissionId) {
    const { data: edges } = await supabase
      .from('kg_edges')
      .select('from_node_id, to_node_id, weight')
      .or(`from_node_id.eq.${currentMissionId},to_node_id.eq.${currentMissionId}`);

    if (edges) {
      for (const edge of edges as { from_node_id: string; to_node_id: string; weight: number }[]) {
        const relatedId = edge.from_node_id === currentMissionId ? edge.to_node_id : edge.from_node_id;
        kgBoost.set(relatedId, Math.max(kgBoost.get(relatedId) ?? 0, edge.weight ?? 1));
      }
    }
  }

  // Score each candidate: MEI (0-100) + KG boost (0-20) = max 120, normalised to 0-1
  const ranked = candidates
    .map((m) => {
      const s = scoreMap.get(m.id);
      const mei = s?.mei ?? 0;
      const kg = (kgBoost.get(m.id) ?? 0) * 20;
      const score = (mei + kg) / 120;
      return { ...m, score, mei };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ score, mei, ...m }) => ({
      ...m,
      confidence_pct: Math.round(score * 100),
      mei_score: Math.round(mei),
      reason: kgBoost.has(m.id) ? 'Knowledge graph match' : 'High completion rate',
    }));

  return NextResponse.json({ recommendations: ranked, total_candidates: candidates.length });
}
