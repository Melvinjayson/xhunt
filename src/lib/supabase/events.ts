/**
 * Fire-and-forget event pipeline.
 * All functions are safe to call without await — they never throw.
 * Only emits when Supabase env vars are present AND user is authenticated.
 */

export type EventType =
  | 'mission_viewed'
  | 'mission_started'
  | 'mission_resumed'
  | 'step_started'
  | 'step_completed'
  | 'step_skipped'
  | 'reward_viewed'
  | 'reward_claimed'
  | 'mission_completed'
  | 'mission_abandoned';

export interface EmitOptions {
  missionId?: string;
  stepId?: number;
  metadata?: Record<string, unknown>;
}

function isConfigured(): boolean {
  return Boolean(
    typeof window !== 'undefined' &&
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

function isUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

// Cached tenant/user info per session
let _cachedContext: { userId: string; tenantId: string | null } | null = null;

async function getContext(): Promise<{ userId: string; tenantId: string | null } | null> {
  if (_cachedContext) return _cachedContext;
  try {
    const { createClient } = await import('./client');
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return null;
    const { data: profile } = await sb.from('user_profiles').select('tenant_id').eq('id', user.id).single();
    _cachedContext = { userId: user.id, tenantId: profile?.tenant_id ?? null };
    return _cachedContext;
  } catch {
    return null;
  }
}

// Reset cache on sign-out
if (typeof window !== 'undefined') {
  window.addEventListener('focus', () => { _cachedContext = null; });
}

export function emitEvent(type: EventType, opts: EmitOptions = {}): void {
  if (!isConfigured()) return;
  if (opts.missionId && !isUUID(opts.missionId)) return; // mock hunts use non-UUID IDs

  void (async () => {
    try {
      const ctx = await getContext();
      if (!ctx) return;
      const { createClient } = await import('./client');
      const sb = createClient();
      await sb.from('mission_events').insert({
        user_id: ctx.userId,
        tenant_id: ctx.tenantId,
        mission_id: opts.missionId ?? null,
        step_id: opts.stepId ?? null,
        event_type: type,
        metadata: opts.metadata ?? {},
      });
    } catch {}
  })();
}

export function syncProgress(
  missionId: string,
  progress: { currentStepIndex: number; completedSteps: number[]; startedAt: string; completedAt?: string }
): void {
  if (!isConfigured() || !isUUID(missionId)) return;

  void (async () => {
    try {
      const ctx = await getContext();
      if (!ctx) return;
      const { createClient } = await import('./client');
      const sb = createClient();
      await sb.from('mission_progress').upsert(
        {
          user_id: ctx.userId,
          mission_id: missionId,
          tenant_id: ctx.tenantId,
          current_step_index: progress.currentStepIndex,
          completed_steps: progress.completedSteps,
          started_at: progress.startedAt,
          completed_at: progress.completedAt ?? null,
        },
        { onConflict: 'user_id,mission_id' }
      );
    } catch {}
  })();
}

export function emitRewardClaimed(missionId: string, reward: string): void {
  if (!isConfigured() || !isUUID(missionId)) return;

  void (async () => {
    try {
      const ctx = await getContext();
      if (!ctx) return;
      const { createClient } = await import('./client');
      const sb = createClient();
      await sb.from('reward_events').insert({
        user_id: ctx.userId,
        mission_id: missionId,
        tenant_id: ctx.tenantId,
        reward_type: 'mission_completion',
        reward_value: { reward },
        redeemed: false,
        issued_at: new Date().toISOString(),
      });
    } catch {}
  })();
}

export async function fetchSupabaseMissions(): Promise<import('../types').Hunt[] | null> {
  if (!isConfigured()) return null;
  try {
    const { createClient } = await import('./client');
    const sb = createClient();
    const { data } = await sb
      .from('missions')
      .select('*')
      .in('status', ['active', 'published'])
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (!data || data.length === 0) return null;

    return data.map((m) => ({
      id: m.id,
      title: m.title,
      story_context: m.story_context ?? '',
      difficulty: m.difficulty,
      estimated_time: m.estimated_time ?? '',
      steps: (m.steps as import('../types').Step[]) ?? [],
      reward: m.reward,
      tags: m.tags ?? [],
      createdAt: m.created_at,
    }));
  } catch {
    return null;
  }
}
