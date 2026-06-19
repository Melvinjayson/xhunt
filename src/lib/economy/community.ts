import { createClient } from '@/lib/supabase/server';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PoolType = 'crowdfunded_mission' | 'validation_pool' | 'recognition_fund' | 'skill_pool';
export type PoolStatus = 'open' | 'active' | 'distributing' | 'closed' | 'cancelled';
export type DistributionMethod = 'equal' | 'weighted' | 'quadratic' | 'trust_weighted';
export type TaskType = 'survey' | 'data_collection' | 'content_review' | 'skill_contribution' | 'community_vote' | 'open';
export type UpvoteTargetType = 'contribution' | 'pool_contribution' | 'crowd_task_completion' | 'barter_listing' | 'outcome' | 'mission';

export interface CommunityPool {
  id: string;
  tenant_id: string | null;
  mission_id: string | null;
  created_by: string;
  name: string;
  description: string | null;
  pool_type: PoolType;
  target_amount: number;
  current_amount: number;
  total_pool: number;
  distribution_method: DistributionMethod;
  distribution_rule: Record<string, number>;
  min_contribution: number;
  status: PoolStatus;
  contributors_count: number;
  completion_pct: number;
  closes_at: string | null;
  distributed_at: string | null;
  created_at: string;
  updated_at: string;
  creator?: { display_name: string; avatar_url: string | null };
}

export interface PoolContribution {
  id: string;
  pool_id: string;
  user_id: string;
  amount: number;
  impact_weight: number;
  computed_weight: number | null;
  trust_score_snapshot: number;
  upvote_weight_snapshot: number;
  timing_rank: number | null;
  status: 'pending' | 'validated' | 'rejected';
  contributed_at: string;
  user?: { display_name: string; avatar_url: string | null };
}

export interface PoolDistribution {
  id: string;
  pool_id: string;
  user_id: string;
  amount_distributed: number;
  distribution_share: number;
  calculated_weight: number | null;
  calculation_method: string;
  calculation_inputs: Record<string, unknown>;
  distributed_at: string;
  user?: { display_name: string; avatar_url: string | null };
}

export interface CommunityUpvote {
  id: string;
  target_type: UpvoteTargetType;
  target_id: string;
  voter_id: string;
  voter_trust_score: number;
  weight: number;
  created_at: string;
}

export interface CrowdTask {
  id: string;
  mission_id: string | null;
  pool_id: string | null;
  tenant_id: string | null;
  created_by: string;
  title: string;
  description: string | null;
  task_type: TaskType;
  instructions: string | null;
  required_fields: unknown[];
  max_participants: number | null;
  required_completions: number;
  current_participants: number;
  current_completions: number;
  reward_per_completion: number;
  validation_threshold: number;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  deadline: string | null;
  created_at: string;
  updated_at: string;
  pool?: Pick<CommunityPool, 'id' | 'name' | 'pool_type'>;
}

export interface CrowdTaskCompletion {
  id: string;
  task_id: string;
  user_id: string;
  pool_contribution_id: string | null;
  proof_text: string | null;
  proof_url: string | null;
  metadata: Record<string, unknown>;
  upvote_count: number;
  upvote_weight: number;
  validation_count: number;
  rejection_count: number;
  status: 'submitted' | 'validated' | 'rejected';
  submitted_at: string;
  validated_at: string | null;
  user?: { display_name: string; avatar_url: string | null };
}

// ─── Econometric Distribution Formulas ───────────────────────────────────────

export interface ContributorInput {
  userId: string;
  amount: number;
  impactWeight: number;
  qualityScore: number;     // normalized 0–1 (from upvotes + validations)
  timingRank: number;       // 1 = first contributor (lower = earlier)
  totalContributors: number;
  trustScore: number;       // 0–100 composite trust
  upvoteWeight: number;     // weighted sum of upvotes received
}

export interface DistributionResult {
  userId: string;
  share: number;            // 0–1 fraction of pool
  amount: number;           // floor(pool × share)
  rawWeight: number;        // pre-normalised econometric weight
  breakdown: {
    qualityMultiplier: number;
    timingMultiplier: number;
    trustFactor: number;
  };
}

export function computeRawWeight(c: ContributorInput, rule: Record<string, number> = {}): number {
  const timingBonus = rule.timing_bonus ?? 0.20;
  const trustFloor  = rule.trust_floor  ?? 0.70;
  const qualityCap  = rule.quality_cap  ?? 0.50;

  const qualityMultiplier = 1 + Math.min(c.qualityScore, qualityCap);
  const timingMultiplier  = 1 + timingBonus
    * ((c.totalContributors - c.timingRank)
       / Math.max(c.totalContributors - 1, 1));
  const trustFactor = trustFloor + (1 - trustFloor) * (c.trustScore / 100);

  return c.amount * c.impactWeight * qualityMultiplier * timingMultiplier * trustFactor;
}

export function distributePool(
  totalPool: number,
  contributors: ContributorInput[],
  method: DistributionMethod,
  rule: Record<string, number> = {}
): DistributionResult[] {
  if (contributors.length === 0 || totalPool <= 0) return [];

  const withWeights = contributors.map((c) => {
    const qm = 1 + Math.min(c.qualityScore, rule.quality_cap ?? 0.50);
    const tm = 1 + (rule.timing_bonus ?? 0.20)
      * ((c.totalContributors - c.timingRank)
         / Math.max(c.totalContributors - 1, 1));
    const tf = (rule.trust_floor ?? 0.70) + (1 - (rule.trust_floor ?? 0.70)) * (c.trustScore / 100);
    return { ...c, rawWeight: c.amount * c.impactWeight * qm * tm * tf, qm, tm, tf };
  });

  let normalised: number[];
  switch (method) {
    case 'equal':
      normalised = contributors.map(() => 1 / contributors.length);
      break;
    case 'weighted': {
      const total = withWeights.reduce((s, w) => s + w.rawWeight, 0);
      normalised = total > 0
        ? withWeights.map((w) => w.rawWeight / total)
        : contributors.map(() => 1 / contributors.length);
      break;
    }
    case 'quadratic': {
      const sqrts = withWeights.map((w) => Math.sqrt(Math.max(w.rawWeight, 0)));
      const totalSqrt = sqrts.reduce((s, v) => s + v, 0);
      normalised = totalSqrt > 0
        ? sqrts.map((v) => v / totalSqrt)
        : contributors.map(() => 1 / contributors.length);
      break;
    }
    case 'trust_weighted': {
      const tw = withWeights.map((w) => w.rawWeight * (0.5 + 0.5 * (w.trustScore / 100)));
      const totalTW = tw.reduce((s, v) => s + v, 0);
      normalised = totalTW > 0
        ? tw.map((v) => v / totalTW)
        : contributors.map(() => 1 / contributors.length);
      break;
    }
    default:
      normalised = contributors.map(() => 1 / contributors.length);
  }

  return withWeights.map((w, i) => ({
    userId: w.userId,
    share: normalised[i],
    amount: Math.floor(totalPool * normalised[i]),
    rawWeight: w.rawWeight,
    breakdown: { qualityMultiplier: w.qm, timingMultiplier: w.tm, trustFactor: w.tf },
  }));
}

export function qualityScore(upvoteWeight: number, validationCount: number): number {
  return Math.min(upvoteWeight * 0.1 + validationCount * 0.05, 1.0);
}

// ─── Pool CRUD ────────────────────────────────────────────────────────────────

export async function getPools(opts?: {
  tenantId?: string;
  status?: PoolStatus;
  limit?: number;
}): Promise<CommunityPool[]> {
  const supabase = await createClient();
  let q = supabase
    .from('community_pools')
    .select('*, creator:user_profiles!created_by(display_name,avatar_url)')
    .order('created_at', { ascending: false })
    .limit(opts?.limit ?? 50);
  if (opts?.tenantId) q = q.eq('tenant_id', opts.tenantId);
  if (opts?.status)   q = q.eq('status', opts.status);
  const { data } = await q;
  return (data ?? []) as unknown as CommunityPool[];
}

export async function getPool(id: string): Promise<CommunityPool | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('community_pools')
    .select('*, creator:user_profiles!created_by(display_name,avatar_url)')
    .eq('id', id)
    .single();
  return data as unknown as CommunityPool | null;
}

export async function createPool(
  createdBy: string,
  input: {
    name: string;
    description?: string;
    pool_type: PoolType;
    target_amount: number;
    total_pool?: number;
    distribution_method?: DistributionMethod;
    distribution_rule?: Record<string, number>;
    min_contribution?: number;
    closes_at?: string;
    tenant_id?: string;
    mission_id?: string;
  }
): Promise<CommunityPool | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('community_pools')
    .insert({
      created_by: createdBy,
      tenant_id: input.tenant_id ?? null,
      mission_id: input.mission_id ?? null,
      name: input.name,
      description: input.description ?? null,
      pool_type: input.pool_type,
      target_amount: input.target_amount,
      total_pool: input.total_pool ?? 0,
      distribution_method: input.distribution_method ?? 'weighted',
      distribution_rule: input.distribution_rule ?? {},
      min_contribution: input.min_contribution ?? 1,
      closes_at: input.closes_at ?? null,
    })
    .select()
    .single();
  if (error) { console.error('createPool:', error.message); return null; }
  return data as unknown as CommunityPool;
}

// ─── Pool Contributions ───────────────────────────────────────────────────────

export async function getPoolContributions(poolId: string): Promise<PoolContribution[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('pool_contributions')
    .select('*, user:user_profiles!user_id(display_name,avatar_url)')
    .eq('pool_id', poolId)
    .order('contributed_at', { ascending: true });
  return (data ?? []) as unknown as PoolContribution[];
}

export async function contributeToPool(
  userId: string,
  poolId: string,
  amount: number,
  opts?: { impactWeight?: number; ledgerId?: string; trustScore?: number; tenantId?: string }
): Promise<PoolContribution | null> {
  const supabase = await createClient();
  // Upsert: if user already contributed, add to their amount
  const { data: existing } = await supabase
    .from('pool_contributions')
    .select('id, amount')
    .eq('pool_id', poolId)
    .eq('user_id', userId)
    .single();
  let row: unknown;
  if (existing) {
    const { data } = await supabase
      .from('pool_contributions')
      .update({ amount: (existing.amount as number) + amount })
      .eq('id', (existing as Record<string, unknown>).id as string)
      .select()
      .single();
    row = data;
  } else {
    const { data } = await supabase
      .from('pool_contributions')
      .insert({
        pool_id: poolId,
        user_id: userId,
        tenant_id: opts?.tenantId ?? null,
        contribution_ledger_id: opts?.ledgerId ?? null,
        amount,
        impact_weight: opts?.impactWeight ?? 1.0,
        trust_score_snapshot: opts?.trustScore ?? 0,
      })
      .select()
      .single();
    row = data;
    // Increment contributors_count
    const { data: pool } = await supabase
      .from('community_pools')
      .select('contributors_count, current_amount')
      .eq('id', poolId)
      .single();
    if (pool) {
      await supabase.from('community_pools').update({
        contributors_count: (pool.contributors_count as number) + 1,
        current_amount: (pool.current_amount as number) + amount,
      }).eq('id', poolId);
    }
  }
  return row as unknown as PoolContribution | null;
}

// ─── Distribution Engine ─────────────────────────────────────────────────────

export async function previewDistribution(poolId: string): Promise<DistributionResult[]> {
  const supabase = await createClient();
  const [poolRes, contribsRes] = await Promise.all([
    supabase.from('community_pools').select('*').eq('id', poolId).single(),
    supabase.from('pool_contributions')
      .select('*, upvote_agg:community_upvotes!target_id(weight.sum())')
      .eq('pool_id', poolId)
      .eq('status', 'validated')
      .order('contributed_at', { ascending: true }),
  ]);
  if (!poolRes.data) return [];
  const pool = poolRes.data as unknown as CommunityPool;
  const contribs = (contribsRes.data ?? []) as unknown as (PoolContribution & { upvote_agg?: { sum: number } })[];
  const total = contribs.length;
  const inputs: ContributorInput[] = contribs.map((c, i) => ({
    userId: c.user_id,
    amount: c.amount,
    impactWeight: c.impact_weight,
    qualityScore: qualityScore(c.upvote_weight_snapshot, 0),
    timingRank: i + 1,
    totalContributors: total,
    trustScore: c.trust_score_snapshot,
    upvoteWeight: c.upvote_weight_snapshot,
  }));
  return distributePool(pool.total_pool, inputs, pool.distribution_method, pool.distribution_rule);
}

export async function executeDistribution(poolId: string, createdBy: string): Promise<{ distributed: number; recipients: number } | null> {
  const supabase = await createClient();
  const results = await previewDistribution(poolId);
  if (results.length === 0) return null;
  // Insert all distribution records
  const { error } = await supabase.from('pool_distributions').insert(
    results.map((r) => ({
      pool_id: poolId,
      user_id: r.userId,
      amount_distributed: r.amount,
      distribution_share: r.share,
      calculated_weight: r.rawWeight,
      calculation_method: 'weighted',
      calculation_inputs: r.breakdown,
    }))
  );
  if (error) { console.error('executeDistribution:', error.message); return null; }
  // Mark pool as distributed
  await supabase.from('community_pools').update({
    status: 'closed',
    distributed_at: new Date().toISOString(),
  }).eq('id', poolId);
  return {
    distributed: results.reduce((s, r) => s + r.amount, 0),
    recipients: results.length,
  };
}

// ─── Upvotes ──────────────────────────────────────────────────────────────────

export async function getUpvoteSummary(targetType: UpvoteTargetType, targetId: string): Promise<{
  count: number; totalWeight: number; hasVoted: boolean; voterId?: string;
}> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('community_upvotes')
    .select('voter_id, weight')
    .eq('target_type', targetType)
    .eq('target_id', targetId);
  const votes = (data ?? []) as Array<{ voter_id: string; weight: number }>;
  return {
    count: votes.length,
    totalWeight: votes.reduce((s, v) => s + (v.weight as number), 0),
    hasVoted: false, // set client-side with userId context
  };
}

export async function upvote(
  voterId: string,
  targetType: UpvoteTargetType,
  targetId: string,
  voterTrustScore: number
): Promise<CommunityUpvote | null> {
  const supabase = await createClient();
  const weight = Math.max(voterTrustScore / 100, 0.10);
  const { data, error } = await supabase
    .from('community_upvotes')
    .insert({
      target_type: targetType,
      target_id: targetId,
      voter_id: voterId,
      voter_trust_score: voterTrustScore,
      weight,
    })
    .select()
    .single();
  if (error) { console.error('upvote:', error.message); return null; }
  // Sync upvote stats on crowd_task_completions if applicable
  if (targetType === 'crowd_task_completion') {
    const { data: existing } = await supabase
      .from('crowd_task_completions')
      .select('upvote_count, upvote_weight')
      .eq('id', targetId)
      .single();
    if (existing) {
      const newCount  = (existing.upvote_count as number) + 1;
      const newWeight = (existing.upvote_weight as number) + weight;
      await supabase.from('crowd_task_completions')
        .update({ upvote_count: newCount, upvote_weight: newWeight })
        .eq('id', targetId);
    }
  }
  return data as unknown as CommunityUpvote;
}

export async function removeUpvote(
  voterId: string,
  targetType: UpvoteTargetType,
  targetId: string
): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('community_upvotes')
    .delete()
    .eq('voter_id', voterId)
    .eq('target_type', targetType)
    .eq('target_id', targetId);
  return !error;
}

// ─── Crowd Tasks ─────────────────────────────────────────────────────────────

export async function getCrowdTasks(opts?: {
  tenantId?: string;
  poolId?: string;
  missionId?: string;
  status?: string;
  limit?: number;
}): Promise<CrowdTask[]> {
  const supabase = await createClient();
  let q = supabase
    .from('crowd_tasks')
    .select('*, pool:community_pools!pool_id(id,name,pool_type)')
    .order('created_at', { ascending: false })
    .limit(opts?.limit ?? 50);
  if (opts?.tenantId)  q = q.eq('tenant_id', opts.tenantId);
  if (opts?.poolId)    q = q.eq('pool_id', opts.poolId);
  if (opts?.missionId) q = q.eq('mission_id', opts.missionId);
  if (opts?.status)    q = q.eq('status', opts.status);
  const { data } = await q;
  return (data ?? []) as unknown as CrowdTask[];
}

export async function createCrowdTask(
  createdBy: string,
  input: {
    title: string;
    description?: string;
    task_type?: TaskType;
    instructions?: string;
    max_participants?: number;
    required_completions?: number;
    reward_per_completion?: number;
    validation_threshold?: number;
    deadline?: string;
    pool_id?: string;
    mission_id?: string;
    tenant_id?: string;
  }
): Promise<CrowdTask | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('crowd_tasks')
    .insert({
      created_by: createdBy,
      tenant_id: input.tenant_id ?? null,
      pool_id: input.pool_id ?? null,
      mission_id: input.mission_id ?? null,
      title: input.title,
      description: input.description ?? null,
      task_type: input.task_type ?? 'open',
      instructions: input.instructions ?? null,
      max_participants: input.max_participants ?? null,
      required_completions: input.required_completions ?? 1,
      reward_per_completion: input.reward_per_completion ?? 0,
      validation_threshold: input.validation_threshold ?? 2,
      deadline: input.deadline ?? null,
    })
    .select()
    .single();
  if (error) { console.error('createCrowdTask:', error.message); return null; }
  return data as unknown as CrowdTask;
}

export async function submitCompletion(
  userId: string,
  taskId: string,
  input: { proof_text?: string; proof_url?: string; metadata?: Record<string, unknown> }
): Promise<CrowdTaskCompletion | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('crowd_task_completions')
    .insert({
      task_id: taskId,
      user_id: userId,
      proof_text: input.proof_text ?? null,
      proof_url: input.proof_url ?? null,
      metadata: input.metadata ?? {},
    })
    .select()
    .single();
  if (error) { console.error('submitCompletion:', error.message); return null; }
  // Increment task participants
  const { data: task } = await supabase
    .from('crowd_tasks')
    .select('current_participants')
    .eq('id', taskId)
    .single();
  if (task) {
    await supabase.from('crowd_tasks')
      .update({ current_participants: (task.current_participants as number) + 1 })
      .eq('id', taskId);
  }
  return data as unknown as CrowdTaskCompletion;
}

export async function getCompletions(taskId: string): Promise<CrowdTaskCompletion[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('crowd_task_completions')
    .select('*, user:user_profiles!user_id(display_name,avatar_url)')
    .eq('task_id', taskId)
    .order('submitted_at', { ascending: false });
  return (data ?? []) as unknown as CrowdTaskCompletion[];
}

// ─── Community Stats ──────────────────────────────────────────────────────────

export async function getCommunityStats(tenantId: string) {
  const supabase = await createClient();
  const [pools, tasks, upvotes] = await Promise.all([
    supabase.from('community_pools').select('id,status,contributors_count,current_amount,total_pool').eq('tenant_id', tenantId),
    supabase.from('crowd_tasks').select('id,status,current_participants,current_completions,reward_per_completion').eq('tenant_id', tenantId),
    supabase.from('community_upvotes').select('id,weight').gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()),
  ]);
  const poolIds = (pools.data ?? []).map((p: Record<string, unknown>) => p.id as string);
  const distributions = poolIds.length > 0
    ? await supabase.from('pool_distributions').select('amount_distributed').in('pool_id', poolIds)
    : { data: [] };
  return {
    activePools: (pools.data ?? []).filter((p: Record<string, unknown>) => p.status === 'open' || p.status === 'active').length,
    totalPoolValue: (pools.data ?? []).reduce((s: number, p: Record<string, unknown>) => s + (p.total_pool as number), 0),
    totalContributors: (pools.data ?? []).reduce((s: number, p: Record<string, unknown>) => s + (p.contributors_count as number), 0),
    activeTasks: (tasks.data ?? []).filter((t: Record<string, unknown>) => t.status === 'open' || t.status === 'in_progress').length,
    totalParticipations: (tasks.data ?? []).reduce((s: number, t: Record<string, unknown>) => s + (t.current_participants as number), 0),
    upvotesLast30Days: (upvotes.data ?? []).length,
    totalUpvoteWeight: (upvotes.data ?? []).reduce((s: number, u: Record<string, unknown>) => s + (u.weight as number), 0),
    totalDistributed: (distributions.data ?? []).reduce((s: number, d: Record<string, unknown>) => s + (d.amount_distributed as number), 0),
  };
}
