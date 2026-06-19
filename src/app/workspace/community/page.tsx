'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Coins, Zap, BarChart3, CheckCircle2, Clock,
  Plus, X, ChevronRight, Play, Shield, Award, Activity,
  TrendingUp, Gift, Layers, Brain, Globe, RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { t } from '@/theme/colors';

type PoolType = 'crowdfunded_mission' | 'validation_pool' | 'recognition_fund' | 'skill_pool';
type DistMethod = 'equal' | 'weighted' | 'quadratic' | 'trust_weighted';
type TaskType = 'survey' | 'data_collection' | 'content_review' | 'skill_contribution' | 'community_vote' | 'open';

interface Pool {
  id: string;
  name: string;
  description: string | null;
  pool_type: PoolType;
  target_amount: number;
  current_amount: number;
  total_pool: number;
  distribution_method: DistMethod;
  min_contribution: number;
  status: string;
  contributors_count: number;
  completion_pct: number;
  closes_at: string | null;
  created_at: string;
}

interface Contrib {
  id: string;
  pool_id: string;
  user_id: string;
  amount: number;
  trust_score_snapshot: number;
  status: string;
  contributed_at: string;
  user?: { display_name: string; avatar_url: string | null };
}

interface DistResult {
  userId: string;
  share: number;
  amount: number;
  rawWeight: number;
  breakdown: { qualityMultiplier: number; timingMultiplier: number; trustFactor: number };
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  task_type: TaskType;
  max_participants: number | null;
  required_completions: number;
  current_participants: number;
  current_completions: number;
  reward_per_completion: number;
  validation_threshold: number;
  status: string;
  deadline: string | null;
  created_at: string;
  pool?: { id: string; name: string };
}

interface Completion {
  id: string;
  task_id: string;
  user_id: string;
  proof_text: string | null;
  upvote_count: number;
  upvote_weight: number;
  status: string;
  submitted_at: string;
  user?: { display_name: string; avatar_url: string | null };
}

const POOL_TYPE_COLOR: Record<PoolType, string> = {
  crowdfunded_mission: t.accent,
  validation_pool: t.warning,
  recognition_fund: t.ai,
  skill_pool: t.info,
};

const POOL_TYPE_LABEL: Record<PoolType, string> = {
  crowdfunded_mission: 'Crowdfunded Mission',
  validation_pool: 'Validation Pool',
  recognition_fund: 'Recognition Fund',
  skill_pool: 'Skill Pool',
};

const DIST_LABEL: Record<DistMethod, string> = {
  equal: 'Equal Split',
  weighted: 'Merit-Weighted',
  quadratic: 'Quadratic √W',
  trust_weighted: 'Trust-Weighted',
};

const TASK_TYPE_LABEL: Record<TaskType, string> = {
  survey: 'Survey',
  data_collection: 'Data Collection',
  content_review: 'Content Review',
  skill_contribution: 'Skill Contribution',
  community_vote: 'Community Vote',
  open: 'Open',
};

function timeLeft(iso: string | null): string {
  if (!iso) return 'No deadline';
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'Expired';
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  return d > 0 ? `${d}d left` : `${h}h left`;
}

function initials(name: string): string {
  const p = name.trim().split(' ');
  return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}

function computeW(amount: number, quality: number, timingRank: number, N: number, trust: number): number {
  const qm = 1 + Math.min(quality, 0.5);
  const tm = 1 + 0.2 * ((N - timingRank) / Math.max(N - 1, 1));
  const tf = 0.7 + 0.3 * (trust / 100);
  return amount * qm * tm * tf;
}

const SIM_CONTRIBUTORS = [
  { id: 'A', amount: 500, trust: 82, quality: 0.4, timingRank: 1 },
  { id: 'B', amount: 300, trust: 91, quality: 0.35, timingRank: 2 },
  { id: 'C', amount: 400, trust: 45, quality: 0.2, timingRank: 3 },
  { id: 'D', amount: 200, trust: 30, quality: 0.15, timingRank: 4 },
  { id: 'E', amount: 150, trust: 60, quality: 0.1, timingRank: 5 },
];

const SIM_N = SIM_CONTRIBUTORS.length;

function computeShares(method: DistMethod): Record<string, number> {
  const weights = SIM_CONTRIBUTORS.map(c =>
    computeW(c.amount, c.quality, c.timingRank, SIM_N, c.trust)
  );
  const sqrtWeights = weights.map(w => Math.sqrt(w));
  const trustWeights = SIM_CONTRIBUTORS.map((c, i) =>
    weights[i] * (0.7 + 0.3 * (c.trust / 100))
  );
  if (method === 'equal') {
    return Object.fromEntries(SIM_CONTRIBUTORS.map(c => [c.id, 1 / SIM_N]));
  }
  if (method === 'weighted') {
    const total = weights.reduce((s, w) => s + w, 0);
    return Object.fromEntries(SIM_CONTRIBUTORS.map((c, i) => [c.id, weights[i] / total]));
  }
  if (method === 'quadratic') {
    const total = sqrtWeights.reduce((s, w) => s + w, 0);
    return Object.fromEntries(SIM_CONTRIBUTORS.map((c, i) => [c.id, sqrtWeights[i] / total]));
  }
  const total = trustWeights.reduce((s, w) => s + w, 0);
  return Object.fromEntries(SIM_CONTRIBUTORS.map((c, i) => [c.id, trustWeights[i] / total]));
}

const inputBase: React.CSSProperties = {
  background: t.surface,
  border: `1px solid ${t.border}`,
  color: t.txt,
  borderRadius: 8,
  padding: '8px 12px',
  fontSize: 14,
  outline: 'none',
  width: '100%',
};

const labelBase: React.CSSProperties = {
  color: t.txtDim,
  fontSize: 12,
  marginBottom: 4,
  display: 'block',
};

function StatusBadge({ status }: { status: string }) {
  const color =
    status === 'open' || status === 'active' ? t.accent :
    status === 'in_progress' ? t.ai :
    status === 'completed' || status === 'validated' ? t.info :
    status === 'submitted' ? t.warning :
    status === 'distributed' ? t.ai :
    t.txtFaint;
  return (
    <span
      className="px-2 py-0.5 rounded text-xs font-medium flex-shrink-0"
      style={{ color, background: color + '18' }}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function AvatarInitials({ name }: { name: string }) {
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
      style={{ background: t.ai + '28', color: t.ai }}
    >
      {initials(name)}
    </div>
  );
}

export default function WorkspaceCommunityPage() {
  const [tab, setTab] = useState<'pools' | 'tasks' | 'econometrics'>('pools');
  const [pools, setPools] = useState<Pool[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreatePool, setShowCreatePool] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
  const [poolContribs, setPoolContribs] = useState<Contrib[]>([]);
  const [distPreview, setDistPreview] = useState<DistResult[]>([]);
  const [contribPanelMode, setContribPanelMode] = useState<'contributions' | 'preview' | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [distributing, setDistributing] = useState<string | null>(null);

  const [simMethod, setSimMethod] = useState<DistMethod>('equal');

  const [cpName, setCpName] = useState('');
  const [cpDesc, setCpDesc] = useState('');
  const [cpPoolType, setCpPoolType] = useState<PoolType>('crowdfunded_mission');
  const [cpTarget, setCpTarget] = useState('');
  const [cpTotalPool, setCpTotalPool] = useState('');
  const [cpDist, setCpDist] = useState<DistMethod>('equal');
  const [cpMinContrib, setCpMinContrib] = useState('');
  const [cpClosesAt, setCpClosesAt] = useState('');
  const [cpCreating, setCpCreating] = useState(false);

  const [ctTitle, setCtTitle] = useState('');
  const [ctDesc, setCtDesc] = useState('');
  const [ctType, setCtType] = useState<TaskType>('open');
  const [ctMaxP, setCtMaxP] = useState('');
  const [ctReqC, setCtReqC] = useState('');
  const [ctReward, setCtReward] = useState('');
  const [ctValThresh, setCtValThresh] = useState('');
  const [ctDeadline, setCtDeadline] = useState('');
  const [ctPoolId, setCtPoolId] = useState('');
  const [ctCreating, setCtCreating] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/community/pools').then(r => r.json()).catch(() => []),
      fetch('/api/community/crowd-tasks').then(r => r.json()).catch(() => []),
    ]).then(([p, tk]) => {
      setPools(Array.isArray(p) ? p : []);
      setTasks(Array.isArray(tk) ? tk : []);
      setLoading(false);
    });
  }, []);

  const activePools = pools.filter(p => p.status === 'open' || p.status === 'active').length;
  const activeTasks = tasks.filter(tk => tk.status === 'open' || tk.status === 'in_progress').length;
  const totalPoolValue = pools.reduce((s, p) => s + p.total_pool, 0);
  const distributedPools = pools.filter(p => p.status === 'distributed').length;

  async function loadContributions(pool: Pool) {
    setSelectedPool(pool);
    setContribPanelMode('contributions');
    setDistPreview([]);
    const res = await fetch(`/api/community/pools?pool_id=${pool.id}&view=contributions`);
    const data = await res.json().catch(() => []);
    setPoolContribs(Array.isArray(data) ? data : []);
  }

  async function loadPreview(pool: Pool) {
    setSelectedPool(pool);
    setContribPanelMode('preview');
    setPoolContribs([]);
    const res = await fetch(`/api/community/pools?pool_id=${pool.id}&view=preview`);
    const data = await res.json().catch(() => []);
    setDistPreview(Array.isArray(data) ? data : []);
  }

  function closePoolPanel() {
    setSelectedPool(null);
    setContribPanelMode(null);
    setPoolContribs([]);
    setDistPreview([]);
  }

  async function handleDistribute(pool: Pool) {
    if (!window.confirm(`Distribute pool "${pool.name}"? This action cannot be undone.`)) return;
    setDistributing(pool.id);
    await fetch('/api/community/pools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'distribute', pool_id: pool.id }),
    }).catch(() => null);
    const res = await fetch('/api/community/pools');
    const data = await res.json().catch(() => []);
    setPools(Array.isArray(data) ? data : []);
    setDistributing(null);
  }

  async function handleCreatePool() {
    if (!cpName || !cpTarget) return;
    setCpCreating(true);
    await fetch('/api/community/pools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        name: cpName,
        description: cpDesc || undefined,
        pool_type: cpPoolType,
        target_amount: Number(cpTarget),
        total_pool: cpTotalPool ? Number(cpTotalPool) : undefined,
        distribution_method: cpDist,
        min_contribution: cpMinContrib ? Number(cpMinContrib) : undefined,
        closes_at: cpClosesAt || undefined,
      }),
    }).catch(() => null);
    const res = await fetch('/api/community/pools');
    const data = await res.json().catch(() => []);
    setPools(Array.isArray(data) ? data : []);
    setShowCreatePool(false);
    setCpName(''); setCpDesc(''); setCpPoolType('crowdfunded_mission');
    setCpTarget(''); setCpTotalPool(''); setCpDist('equal');
    setCpMinContrib(''); setCpClosesAt('');
    setCpCreating(false);
  }

  async function loadCompletions(task: Task) {
    setSelectedTask(task);
    const res = await fetch(`/api/community/crowd-tasks?task_id=${task.id}&view=completions`);
    const data = await res.json().catch(() => []);
    setCompletions(Array.isArray(data) ? data : []);
  }

  async function handleValidate(completionId: string) {
    await fetch('/api/community/crowd-tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'validate', completion_id: completionId }),
    }).catch(() => null);
    if (selectedTask) await loadCompletions(selectedTask);
  }

  async function handleCreateTask() {
    if (!ctTitle || !ctReqC || !ctReward) return;
    setCtCreating(true);
    await fetch('/api/community/crowd-tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        title: ctTitle,
        description: ctDesc || undefined,
        task_type: ctType,
        max_participants: ctMaxP ? Number(ctMaxP) : undefined,
        required_completions: Number(ctReqC),
        reward_per_completion: Number(ctReward),
        validation_threshold: ctValThresh ? Number(ctValThresh) : undefined,
        deadline: ctDeadline || undefined,
        pool_id: ctPoolId || undefined,
      }),
    }).catch(() => null);
    const res = await fetch('/api/community/crowd-tasks');
    const data = await res.json().catch(() => []);
    setTasks(Array.isArray(data) ? data : []);
    setShowCreateTask(false);
    setCtTitle(''); setCtDesc(''); setCtType('open');
    setCtMaxP(''); setCtReqC(''); setCtReward('');
    setCtValThresh(''); setCtDeadline(''); setCtPoolId('');
    setCtCreating(false);
  }

  const simShares = computeShares(simMethod);

  return (
    <div className="min-h-screen p-6" style={{ background: t.bg }}>
      <div className="max-w-7xl mx-auto">

        <div className="flex items-start gap-4 mb-8">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: t.ai + '18' }}
          >
            <Users size={22} style={{ color: t.ai }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: t.txt }}>Community</h1>
            <p className="text-sm mt-0.5" style={{ color: t.txtDim }}>
              Manage pools, crowd tasks, and recognition distribution
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Active Pools', value: activePools, icon: Layers, color: t.accent },
            { label: 'Total Pool Value (pts)', value: totalPoolValue.toLocaleString(), icon: Coins, color: t.warning },
            { label: 'Active Tasks', value: activeTasks, icon: Zap, color: t.ai },
            { label: 'Pools Distributed', value: distributedPools, icon: Gift, color: t.info },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl p-4 flex items-center gap-3"
              style={{ background: t.card, border: `1px solid ${t.border}` }}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: stat.color + '18' }}
              >
                <stat.icon size={16} style={{ color: stat.color }} />
              </div>
              <div>
                <div className="text-lg font-bold" style={{ color: t.txt }}>{stat.value}</div>
                <div className="text-xs" style={{ color: t.txtDim }}>{stat.label}</div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="flex gap-2 mb-6">
          {(['pools', 'tasks', 'econometrics'] as const).map(tb => (
            <button
              key={tb}
              onClick={() => setTab(tb)}
              className={cn('px-4 py-2 rounded-full text-sm font-medium transition-all capitalize')}
              style={{
                background: tab === tb ? t.accent : t.card,
                color: tab === tb ? t.bg : t.txtDim,
                border: `1px solid ${tab === tb ? t.accent : t.border}`,
              }}
            >
              {tb === 'econometrics' ? 'Econometrics' : tb.charAt(0).toUpperCase() + tb.slice(1)}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex items-center gap-2 py-16 justify-center" style={{ color: t.txtDim }}>
            <RefreshCw size={18} className="animate-spin" />
            <span className="text-sm">Loading…</span>
          </div>
        )}

        {!loading && tab === 'pools' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold" style={{ color: t.txt }}>Community Pools</h2>
              <button
                onClick={() => setShowCreatePool(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium"
                style={{ background: t.accent, color: t.bg }}
              >
                <Plus size={14} />
                Create Pool
              </button>
            </div>

            {pools.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Coins size={36} style={{ color: t.txtFaint }} />
                <p className="text-sm" style={{ color: t.txtDim }}>No community pools yet</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {pools.map((pool, i) => {
                  const ptColor = POOL_TYPE_COLOR[pool.pool_type];
                  return (
                    <motion.div
                      key={pool.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <div
                        className="rounded-xl p-4"
                        style={{ background: t.card, border: `1px solid ${t.border}` }}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="text-sm font-bold" style={{ color: t.txt }}>{pool.name}</span>
                          <StatusBadge status={pool.status} />
                        </div>

                        <div className="flex items-center gap-2 mb-3">
                          <span
                            className="text-xs px-2 py-0.5 rounded font-medium"
                            style={{ color: ptColor, background: ptColor + '18' }}
                          >
                            {POOL_TYPE_LABEL[pool.pool_type]}
                          </span>
                        </div>

                        {pool.description && (
                          <p
                            className="text-xs mb-3 line-clamp-2"
                            style={{ color: t.txtDim }}
                          >
                            {pool.description}
                          </p>
                        )}

                        <div className="mb-1">
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: t.surface }}>
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(pool.completion_pct, 100)}%` }}
                              transition={{ duration: 0.6, delay: i * 0.05 }}
                              className="h-full rounded-full"
                              style={{ background: ptColor }}
                            />
                          </div>
                          <p className="text-xs mt-1" style={{ color: t.txtDim }}>
                            {pool.completion_pct}% · {pool.current_amount.toLocaleString()} / {pool.target_amount.toLocaleString()} pts
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs mt-2 mb-2" style={{ color: t.txtFaint }}>
                          <span>{pool.contributors_count} contributors</span>
                          <span>{pool.total_pool.toLocaleString()} pts pool</span>
                          <span>{DIST_LABEL[pool.distribution_method]}</span>
                        </div>

                        <div className="flex items-center gap-1 text-xs mb-3" style={{ color: t.txtFaint }}>
                          <Clock size={11} />
                          <span>{timeLeft(pool.closes_at)}</span>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => loadContributions(pool)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium"
                            style={{ background: t.surface, color: t.txtDim, border: `1px solid ${t.border}` }}
                          >
                            <Users size={12} />
                            View Contributions
                          </button>
                          <button
                            onClick={() => loadPreview(pool)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium"
                            style={{ background: t.surface, color: t.txtDim, border: `1px solid ${t.border}` }}
                          >
                            <BarChart3 size={12} />
                            Preview Distribution
                          </button>
                          {(pool.status === 'open' || pool.status === 'active') && (
                            <button
                              onClick={() => handleDistribute(pool)}
                              disabled={distributing === pool.id}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium"
                              style={{
                                background: t.accent + '18',
                                color: t.accent,
                                border: `1px solid ${t.accent}40`,
                                opacity: distributing === pool.id ? 0.6 : 1,
                              }}
                            >
                              <Play size={12} />
                              {distributing === pool.id ? 'Distributing…' : 'Distribute'}
                            </button>
                          )}
                        </div>
                      </div>

                      <AnimatePresence>
                        {selectedPool?.id === pool.id && contribPanelMode === 'contributions' && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div
                              className="rounded-xl mt-2 p-4"
                              style={{ background: t.surface, border: `1px solid ${t.border}` }}
                            >
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-semibold" style={{ color: t.txt }}>Contributions</span>
                                <button onClick={closePoolPanel}>
                                  <X size={16} style={{ color: t.txtDim }} />
                                </button>
                              </div>
                              {poolContribs.length === 0 ? (
                                <p className="text-xs text-center py-4" style={{ color: t.txtFaint }}>No contributions yet</p>
                              ) : (
                                <div className="flex flex-col gap-2">
                                  {poolContribs.map(c => (
                                    <div key={c.id} className="flex items-center gap-3">
                                      <AvatarInitials name={c.user?.display_name ?? c.user_id.slice(0, 8)} />
                                      <div className="flex-1 min-w-0">
                                        <div className="text-xs font-medium truncate" style={{ color: t.txt }}>
                                          {c.user?.display_name ?? c.user_id.slice(0, 12)}
                                        </div>
                                        <div className="text-xs" style={{ color: t.txtDim }}>
                                          Trust: {c.trust_score_snapshot}
                                        </div>
                                      </div>
                                      <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
                                        <div className="text-xs font-semibold" style={{ color: t.accent }}>
                                          {c.amount.toLocaleString()} pts
                                        </div>
                                        <StatusBadge status={c.status} />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}

                        {selectedPool?.id === pool.id && contribPanelMode === 'preview' && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div
                              className="rounded-xl mt-2 p-4"
                              style={{ background: t.surface, border: `1px solid ${t.border}` }}
                            >
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-semibold" style={{ color: t.txt }}>Distribution Preview</span>
                                <button onClick={closePoolPanel}>
                                  <X size={16} style={{ color: t.txtDim }} />
                                </button>
                              </div>
                              {distPreview.length === 0 ? (
                                <p className="text-xs text-center py-4" style={{ color: t.txtFaint }}>No preview available</p>
                              ) : (
                                <>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr style={{ color: t.txtFaint }}>
                                          <th className="text-left pb-2 font-medium">#</th>
                                          <th className="text-left pb-2 font-medium">Contributor</th>
                                          <th className="text-right pb-2 font-medium">Weight</th>
                                          <th className="text-right pb-2 font-medium">Share %</th>
                                          <th className="text-right pb-2 font-medium">Amount (pts)</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {distPreview.map((r, idx) => (
                                          <tr key={r.userId} style={{ borderTop: `1px solid ${t.border}` }}>
                                            <td className="py-1.5" style={{ color: t.txtFaint }}>{idx + 1}</td>
                                            <td className="py-1.5" style={{ color: t.txt }}>{r.userId.slice(0, 10)}…</td>
                                            <td className="py-1.5 text-right" style={{ color: t.txtDim }}>{r.rawWeight.toFixed(1)}</td>
                                            <td className="py-1.5 text-right font-semibold" style={{ color: t.accent }}>{(r.share * 100).toFixed(1)}%</td>
                                            <td className="py-1.5 text-right" style={{ color: t.txt }}>{r.amount.toLocaleString()}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                  <div
                                    className="mt-3 p-2 rounded-lg text-xs"
                                    style={{ background: t.warning + '10', color: t.warning, border: `1px solid ${t.warning}30` }}
                                  >
                                    This preview reflects current weights. Execution is irreversible.
                                  </div>
                                  <button
                                    onClick={() => handleDistribute(pool)}
                                    className="mt-3 w-full py-2 rounded-lg text-xs font-semibold"
                                    style={{ background: t.accent, color: t.bg }}
                                  >
                                    Execute Distribution
                                  </button>
                                </>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {!loading && tab === 'tasks' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold" style={{ color: t.txt }}>Crowd Tasks</h2>
              <button
                onClick={() => setShowCreateTask(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium"
                style={{ background: t.accent, color: t.bg }}
              >
                <Plus size={14} />
                Create Task
              </button>
            </div>

            {tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Users size={36} style={{ color: t.txtFaint }} />
                <p className="text-sm" style={{ color: t.txtDim }}>No crowd tasks yet</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {tasks.map((task, i) => {
                  const completionPct = task.required_completions > 0
                    ? Math.min((task.current_completions / task.required_completions) * 100, 100)
                    : 0;
                  return (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <div
                        className="rounded-xl p-4"
                        style={{ background: t.card, border: `1px solid ${t.border}` }}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                            <span className="text-sm font-bold" style={{ color: t.txt }}>{task.title}</span>
                            <span
                              className="text-xs px-2 py-0.5 rounded font-medium flex-shrink-0"
                              style={{ color: t.ai, background: t.ai + '18' }}
                            >
                              {TASK_TYPE_LABEL[task.task_type]}
                            </span>
                          </div>
                          <StatusBadge status={task.status} />
                        </div>

                        {task.description && (
                          <p className="text-xs mb-3 line-clamp-2" style={{ color: t.txtDim }}>
                            {task.description}
                          </p>
                        )}

                        <div className="mb-1">
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: t.surface }}>
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${completionPct}%` }}
                              transition={{ duration: 0.6, delay: i * 0.05 }}
                              className="h-full rounded-full"
                              style={{ background: t.accent }}
                            />
                          </div>
                          <p className="text-xs mt-1" style={{ color: t.txtDim }}>
                            {task.current_completions}/{task.required_completions} completions
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs mt-2 mb-2" style={{ color: t.txtFaint }}>
                          <span>{task.current_participants} participants</span>
                          <span>{task.reward_per_completion} pts/completion</span>
                          <span>{timeLeft(task.deadline)}</span>
                        </div>

                        {task.pool && (
                          <div
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs mb-3"
                            style={{ background: t.ai + '18', color: t.ai }}
                          >
                            <Layers size={10} />
                            {task.pool.name}
                          </div>
                        )}

                        <button
                          onClick={() => loadCompletions(task)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium"
                          style={{ background: t.surface, color: t.txtDim, border: `1px solid ${t.border}` }}
                        >
                          <ChevronRight size={12} />
                          View Submissions
                        </button>
                      </div>

                      <AnimatePresence>
                        {selectedTask?.id === task.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div
                              className="rounded-xl mt-2 p-4"
                              style={{ background: t.surface, border: `1px solid ${t.border}` }}
                            >
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-semibold" style={{ color: t.txt }}>Submissions</span>
                                <button onClick={() => setSelectedTask(null)}>
                                  <X size={16} style={{ color: t.txtDim }} />
                                </button>
                              </div>
                              {completions.length === 0 ? (
                                <p className="text-xs text-center py-4" style={{ color: t.txtFaint }}>No submissions yet</p>
                              ) : (
                                <div className="flex flex-col gap-3">
                                  {completions.map(c => (
                                    <div
                                      key={c.id}
                                      className="flex items-start gap-3 p-3 rounded-lg"
                                      style={{ background: t.card, border: `1px solid ${t.border}` }}
                                    >
                                      <AvatarInitials name={c.user?.display_name ?? c.user_id.slice(0, 8)} />
                                      <div className="flex-1 min-w-0">
                                        <div className="text-xs font-medium mb-0.5" style={{ color: t.txt }}>
                                          {c.user?.display_name ?? c.user_id.slice(0, 12)}
                                        </div>
                                        {c.proof_text && (
                                          <p className="text-xs mb-1 line-clamp-2" style={{ color: t.txtDim }}>
                                            {c.proof_text}
                                          </p>
                                        )}
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs" style={{ color: t.txtFaint }}>
                                            {c.upvote_count} upvotes
                                          </span>
                                          <StatusBadge status={c.status} />
                                        </div>
                                      </div>
                                      {c.status === 'submitted' && (
                                        <button
                                          onClick={() => handleValidate(c.id)}
                                          className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium flex-shrink-0"
                                          style={{ background: t.accent + '18', color: t.accent, border: `1px solid ${t.accent}40` }}
                                        >
                                          <CheckCircle2 size={11} />
                                          Validate
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'econometrics' && (
          <div>
            <div className="mb-6">
              <h2 className="text-base font-semibold mb-1" style={{ color: t.txt }}>Distribution Formulas</h2>
              <p className="text-sm" style={{ color: t.txtDim }}>
                How pool rewards are calculated under each method
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-8">
              {[
                {
                  key: 'equal' as DistMethod,
                  icon: Globe,
                  formula: 'share = 1/n',
                  title: 'Equal Split',
                  desc: 'Most egalitarian; everyone gets the same slice regardless of contribution size.',
                  color: t.accent,
                },
                {
                  key: 'weighted' as DistMethod,
                  icon: TrendingUp,
                  formula: 'share = W / ΣW',
                  title: 'Merit-Weighted',
                  desc: 'W = amount × quality × timing × trust — rewards effort and quality.',
                  color: t.warning,
                },
                {
                  key: 'quadratic' as DistMethod,
                  icon: Activity,
                  formula: 'share = √W / Σ√W',
                  title: 'Quadratic √W',
                  desc: 'Reduces winner-take-all dynamics; better for communities with varied contribution sizes.',
                  color: t.ai,
                },
                {
                  key: 'trust_weighted' as DistMethod,
                  icon: Shield,
                  formula: 'share = W·T / Σ(W·T)',
                  title: 'Trust-Weighted',
                  desc: "Amplifies trusted contributors' weight; trust score acts as a multiplier.",
                  color: t.info,
                },
              ].map((card, i) => (
                <motion.div
                  key={card.key}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl p-4"
                  style={{ background: t.card, border: `1px solid ${t.border}` }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: card.color + '18' }}
                    >
                      <card.icon size={15} style={{ color: card.color }} />
                    </div>
                    <span className="text-sm font-semibold" style={{ color: t.txt }}>{card.title}</span>
                  </div>
                  <div
                    className="px-3 py-2 rounded-lg font-mono text-xs mb-3"
                    style={{ background: t.surface, color: card.color }}
                  >
                    {card.formula}
                  </div>
                  <p className="text-xs" style={{ color: t.txtDim }}>{card.desc}</p>
                </motion.div>
              ))}
            </div>

            <div
              className="rounded-xl p-5"
              style={{ background: t.card, border: `1px solid ${t.border}` }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Brain size={16} style={{ color: t.ai }} />
                <h3 className="text-sm font-semibold" style={{ color: t.txt }}>Live Simulation</h3>
                <span className="text-xs ml-1" style={{ color: t.txtFaint }}>5 synthetic contributors</span>
              </div>

              <div className="flex gap-2 flex-wrap mb-5">
                {(['equal', 'weighted', 'quadratic', 'trust_weighted'] as DistMethod[]).map(m => (
                  <button
                    key={m}
                    onClick={() => setSimMethod(m)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: simMethod === m ? t.ai : t.surface,
                      color: simMethod === m ? t.txt : t.txtDim,
                      border: `1px solid ${simMethod === m ? t.ai : t.border}`,
                    }}
                  >
                    {DIST_LABEL[m]}
                  </button>
                ))}
              </div>

              <div>
                <div className="grid grid-cols-5 gap-2 mb-2 text-xs" style={{ color: t.txtFaint }}>
                  <span>ID</span>
                  <span className="text-right">Amount</span>
                  <span className="text-right">Trust</span>
                  <span className="text-right">Share</span>
                  <span>Distribution</span>
                </div>
                {SIM_CONTRIBUTORS.map((c, idx) => {
                  const share = simShares[c.id] ?? 0;
                  const pct = (share * 100).toFixed(1);
                  return (
                    <div key={c.id} className="grid grid-cols-5 gap-2 items-center py-1.5" style={{ borderTop: `1px solid ${t.border}` }}>
                      <span className="text-xs font-bold" style={{ color: t.txt }}>{c.id}</span>
                      <span className="text-xs text-right" style={{ color: t.txtDim }}>{c.amount}</span>
                      <span className="text-xs text-right" style={{ color: t.txtDim }}>{c.trust}</span>
                      <span className="text-xs text-right font-semibold" style={{ color: t.accent }}>{pct}%</span>
                      <div className="h-4 rounded overflow-hidden" style={{ background: t.surface }}>
                        <motion.div
                          key={`${simMethod}-${c.id}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(share * 200, 100)}%` }}
                          transition={{ duration: 0.5, delay: idx * 0.05 }}
                          className="h-full rounded"
                          style={{ background: t.ai }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div
                className="mt-4 p-3 rounded-lg text-xs"
                style={{ background: t.surface, color: t.txtFaint }}
              >
                Bar width is scaled (×2) for visual clarity. Percentages are exact shares.
              </div>
            </div>
          </div>
        )}

      </div>

      <AnimatePresence>
        {showCreatePool && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-end md:items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.65)' }}
            onClick={e => { if (e.target === e.currentTarget) setShowCreatePool(false); }}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              className="w-full max-w-lg rounded-2xl p-6 overflow-y-auto"
              style={{ background: t.card, border: `1px solid ${t.border}`, maxHeight: '90vh' }}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-semibold" style={{ color: t.txt }}>Create Pool</h3>
                <button onClick={() => setShowCreatePool(false)}>
                  <X size={18} style={{ color: t.txtDim }} />
                </button>
              </div>

              <div className="flex flex-col gap-4">
                <div>
                  <label style={labelBase}>Name *</label>
                  <input
                    style={inputBase}
                    placeholder="Pool name"
                    value={cpName}
                    onChange={e => setCpName(e.target.value)}
                  />
                </div>

                <div>
                  <label style={labelBase}>Description</label>
                  <textarea
                    style={{ ...inputBase, resize: 'vertical', minHeight: 64 }}
                    placeholder="Optional description"
                    value={cpDesc}
                    onChange={e => setCpDesc(e.target.value)}
                  />
                </div>

                <div>
                  <label style={labelBase}>Pool Type</label>
                  <div className="flex flex-wrap gap-2">
                    {(['crowdfunded_mission', 'validation_pool', 'recognition_fund', 'skill_pool'] as PoolType[]).map(pt => {
                      const ptColor = POOL_TYPE_COLOR[pt];
                      const active = cpPoolType === pt;
                      return (
                        <button
                          key={pt}
                          onClick={() => setCpPoolType(pt)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium"
                          style={{
                            background: active ? ptColor + '28' : t.surface,
                            color: active ? ptColor : t.txtDim,
                            border: `1px solid ${active ? ptColor : t.border}`,
                          }}
                        >
                          {POOL_TYPE_LABEL[pt]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label style={labelBase}>Target Amount *</label>
                    <input
                      style={inputBase}
                      type="number"
                      placeholder="1000"
                      value={cpTarget}
                      onChange={e => setCpTarget(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={labelBase}>Total Pool</label>
                    <input
                      style={inputBase}
                      type="number"
                      placeholder="0"
                      value={cpTotalPool}
                      onChange={e => setCpTotalPool(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label style={labelBase}>Distribution Method</label>
                  <div className="flex flex-wrap gap-2">
                    {(['equal', 'weighted', 'quadratic', 'trust_weighted'] as DistMethod[]).map(dm => {
                      const active = cpDist === dm;
                      return (
                        <button
                          key={dm}
                          onClick={() => setCpDist(dm)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium"
                          style={{
                            background: active ? t.ai + '28' : t.surface,
                            color: active ? t.ai : t.txtDim,
                            border: `1px solid ${active ? t.ai : t.border}`,
                          }}
                        >
                          {DIST_LABEL[dm]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label style={labelBase}>Min Contribution</label>
                    <input
                      style={inputBase}
                      type="number"
                      placeholder="0"
                      value={cpMinContrib}
                      onChange={e => setCpMinContrib(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={labelBase}>Closes At</label>
                    <input
                      style={inputBase}
                      type="datetime-local"
                      value={cpClosesAt}
                      onChange={e => setCpClosesAt(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  onClick={handleCreatePool}
                  disabled={cpCreating || !cpName || !cpTarget}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold mt-1"
                  style={{
                    background: t.accent,
                    color: t.bg,
                    opacity: cpCreating || !cpName || !cpTarget ? 0.5 : 1,
                  }}
                >
                  {cpCreating ? 'Creating…' : 'Create Pool'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCreateTask && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-end md:items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.65)' }}
            onClick={e => { if (e.target === e.currentTarget) setShowCreateTask(false); }}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              className="w-full max-w-lg rounded-2xl p-6 overflow-y-auto"
              style={{ background: t.card, border: `1px solid ${t.border}`, maxHeight: '90vh' }}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-semibold" style={{ color: t.txt }}>Create Task</h3>
                <button onClick={() => setShowCreateTask(false)}>
                  <X size={18} style={{ color: t.txtDim }} />
                </button>
              </div>

              <div className="flex flex-col gap-4">
                <div>
                  <label style={labelBase}>Title *</label>
                  <input
                    style={inputBase}
                    placeholder="Task title"
                    value={ctTitle}
                    onChange={e => setCtTitle(e.target.value)}
                  />
                </div>

                <div>
                  <label style={labelBase}>Description</label>
                  <textarea
                    style={{ ...inputBase, resize: 'vertical', minHeight: 64 }}
                    placeholder="Optional description"
                    value={ctDesc}
                    onChange={e => setCtDesc(e.target.value)}
                  />
                </div>

                <div>
                  <label style={labelBase}>Task Type</label>
                  <select
                    style={{ ...inputBase, cursor: 'pointer' }}
                    value={ctType}
                    onChange={e => setCtType(e.target.value as TaskType)}
                  >
                    {(['survey', 'data_collection', 'content_review', 'skill_contribution', 'community_vote', 'open'] as TaskType[]).map(tt => (
                      <option key={tt} value={tt} style={{ background: t.card }}>
                        {TASK_TYPE_LABEL[tt]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label style={labelBase}>Max Participants</label>
                    <input
                      style={inputBase}
                      type="number"
                      placeholder="Unlimited"
                      value={ctMaxP}
                      onChange={e => setCtMaxP(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={labelBase}>Required Completions *</label>
                    <input
                      style={inputBase}
                      type="number"
                      placeholder="10"
                      value={ctReqC}
                      onChange={e => setCtReqC(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label style={labelBase}>Reward Per Completion *</label>
                    <input
                      style={inputBase}
                      type="number"
                      placeholder="50"
                      value={ctReward}
                      onChange={e => setCtReward(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={labelBase}>Validation Threshold</label>
                    <input
                      style={inputBase}
                      type="number"
                      placeholder="0.6"
                      step="0.1"
                      value={ctValThresh}
                      onChange={e => setCtValThresh(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label style={labelBase}>Deadline</label>
                    <input
                      style={inputBase}
                      type="datetime-local"
                      value={ctDeadline}
                      onChange={e => setCtDeadline(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={labelBase}>Link Pool (pool_id)</label>
                    <input
                      style={inputBase}
                      placeholder="Optional pool ID"
                      value={ctPoolId}
                      onChange={e => setCtPoolId(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  onClick={handleCreateTask}
                  disabled={ctCreating || !ctTitle || !ctReqC || !ctReward}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold mt-1"
                  style={{
                    background: t.accent,
                    color: t.bg,
                    opacity: ctCreating || !ctTitle || !ctReqC || !ctReward ? 0.5 : 1,
                  }}
                >
                  {ctCreating ? 'Creating…' : 'Create Task'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
