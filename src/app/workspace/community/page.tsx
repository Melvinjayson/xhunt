'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Coins, Zap, Brain, BarChart3, CheckCircle2, Clock, Plus, X,
  ChevronRight, ArrowRight, Play, RotateCcw, Shield, Globe, Award,
  Activity, TrendingUp, ArrowLeftRight, Gift, Layers
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { t } from '@/theme/colors';

type PoolType = 'crowdfunded_mission' | 'validation_pool' | 'recognition_fund' | 'skill_pool';
type DistributionMethod = 'equal' | 'weighted' | 'quadratic' | 'trust_weighted';
type TaskType = 'survey' | 'data_collection' | 'content_review' | 'skill_contribution' | 'community_vote' | 'open';

interface CommunityPool {
  id: string;
  name: string;
  description: string;
  pool_type: PoolType;
  target_amount: number;
  current_amount: number;
  total_pool: number;
  distribution_method: DistributionMethod;
  distribution_rule: Record<string, number>;
  min_contribution: number;
  status: string;
  contributors_count: number;
  completion_pct: number;
  closes_at: string | null;
  created_at: string;
  creator?: { display_name: string; avatar_url: string | null };
}

interface PoolContribution {
  id: string;
  pool_id: string;
  user_id: string;
  amount: number;
  impact_weight: number;
  computed_weight: number;
  trust_score_snapshot: number;
  upvote_weight_snapshot: number;
  timing_rank: number;
  status: string;
  contributed_at: string;
  user?: { display_name: string; avatar_url: string | null };
}

interface DistributionResult {
  userId: string;
  share: number;
  amount: number;
  rawWeight: number;
  breakdown: { qualityMultiplier: number; timingMultiplier: number; trustFactor: number };
}

interface CrowdTask {
  id: string;
  title: string;
  description: string;
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
  pool?: { id: string; name: string; pool_type: PoolType };
}

interface CrowdTaskCompletion {
  id: string;
  task_id: string;
  user_id: string;
  proof_text: string;
  proof_url: string | null;
  upvote_count: number;
  upvote_weight: number;
  validation_count: number;
  rejection_count: number;
  status: string;
  submitted_at: string;
  user?: { display_name: string; avatar_url: string | null };
}

type TabId = 'pools' | 'tasks' | 'econometrics' | 'analytics';

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg', className)} style={{ background: t.panel }} />;
}

function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide"
      style={{ color, background: bg }}
    >
      {label}
    </span>
  );
}

const POOL_TYPE_CONFIG: Record<PoolType, { label: string; color: string; bg: string }> = {
  crowdfunded_mission: { label: 'Crowdfunded', color: t.accent, bg: `${t.accent}1A` },
  validation_pool:     { label: 'Validation',  color: t.warning, bg: `${t.warning}1A` },
  recognition_fund:    { label: 'Recognition', color: t.ai, bg: `${t.ai}1A` },
  skill_pool:          { label: 'Skill Pool',  color: t.info, bg: `${t.info}1A` },
};

const TASK_TYPE_CONFIG: Record<TaskType, { label: string; color: string; bg: string }> = {
  survey:              { label: 'Survey',       color: t.accent, bg: `${t.accent}1A` },
  data_collection:     { label: 'Data',         color: t.info, bg: `${t.info}1A` },
  content_review:      { label: 'Review',       color: t.warning, bg: `${t.warning}1A` },
  skill_contribution:  { label: 'Skill',        color: t.ai, bg: `${t.ai}1A` },
  community_vote:      { label: 'Vote',         color: t.error, bg: `${t.error}1A` },
  open:                { label: 'Open',         color: t.txtDim, bg: `${t.txtDim}1A` },
};

const STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  open:         { color: t.accent, bg: `${t.accent}1A` },
  active:       { color: t.ai, bg: `${t.ai}1A` },
  completed:    { color: t.txtFaint, bg: `${t.txtFaint}1A` },
  closed:       { color: t.txtFaint, bg: `${t.txtFaint}1A` },
  cancelled:    { color: t.error, bg: `${t.error}1A` },
  distributing: { color: t.warning, bg: `${t.warning}1A` },
  in_progress:  { color: t.ai, bg: `${t.ai}1A` },
  submitted:    { color: t.warning, bg: `${t.warning}1A` },
  validated:    { color: t.accent, bg: `${t.accent}1A` },
  rejected:     { color: t.error, bg: `${t.error}1A` },
};

const DISTRIBUTION_LABELS: Record<DistributionMethod, string> = {
  equal:         'Equal Split',
  weighted:      'Weighted (W)',
  quadratic:     'Quadratic (√W)',
  trust_weighted: 'Trust-Weighted',
};

function getStatusCfg(status: string) {
  return STATUS_CONFIG[status] ?? { color: t.txtDim, bg: `${t.txtDim}1A` };
}

function countdown(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return 'Closed';
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  if (d > 0) return `${d}d ${h}h left`;
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}h ${m}m left`;
}

function Initials({ name, size = 32 }: { name: string; size?: number }) {
  const letters = name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0 font-bold"
      style={{ width: size, height: size, background: t.panel, color: t.txtDim, fontSize: size * 0.35 }}
    >
      {letters || '?'}
    </div>
  );
}

function InputField({
  label, value, onChange, type = 'text', required, placeholder, min,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; required?: boolean; placeholder?: string; min?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12px] font-semibold" style={{ color: t.txtDim }}>
        {label}{required && <span style={{ color: t.error }}> *</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        min={min}
        className="h-9 px-3 rounded-xl text-[13px] outline-none transition-colors w-full"
        style={{
          background: t.panel,
          border: `1px solid ${t.border}`,
          color: t.txt,
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = t.borderMid; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = t.border; }}
      />
    </div>
  );
}

function TextareaField({
  label, value, onChange, placeholder, rows = 3,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; rows?: number;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12px] font-semibold" style={{ color: t.txtDim }}>{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="px-3 py-2 rounded-xl text-[13px] outline-none transition-colors w-full resize-none"
        style={{ background: t.panel, border: `1px solid ${t.border}`, color: t.txt }}
        onFocus={(e) => { e.currentTarget.style.borderColor = t.borderMid; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = t.border; }}
      />
    </div>
  );
}

function RadioGrid<T extends string>({
  label, value, onChange, options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; desc?: string }[];
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12px] font-semibold" style={{ color: t.txtDim }}>{label}</label>
      <div className="grid grid-cols-2 gap-2">
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className="p-2.5 rounded-xl text-left transition-all"
              style={{
                background: active ? `${t.ai}1A` : t.panel,
                border: `1px solid ${active ? t.ai : t.border}`,
              }}
            >
              <p className="text-[12px] font-semibold" style={{ color: active ? t.ai : t.txt }}>{opt.label}</p>
              {opt.desc && <p className="text-[10px] mt-0.5" style={{ color: t.txtFaint }}>{opt.desc}</p>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Drawer({
  open, onClose, title, children,
}: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(5,8,22,0.75)' }}
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="fixed right-0 top-0 h-full z-50 flex flex-col overflow-hidden"
            style={{
              width: 480,
              maxWidth: '95vw',
              background: t.surface,
              borderLeft: `1px solid ${t.border}`,
            }}
          >
            <div
              className="flex items-center justify-between px-5 py-4 flex-shrink-0"
              style={{ borderBottom: `1px solid ${t.border}` }}
            >
              <h2 className="text-[15px] font-bold" style={{ color: t.txt }}>{title}</h2>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                style={{ background: t.panel }}
                onMouseEnter={(e) => { e.currentTarget.style.background = t.card; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = t.panel; }}
              >
                <X size={15} strokeWidth={2} style={{ color: t.txtDim }} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  const pct = Math.min(Math.max(value, 0), 100);
  return (
    <div className="h-1.5 rounded-full overflow-hidden w-full" style={{ background: t.panel }}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

function CreatePoolDrawer({
  open, onClose, onCreated, pools,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  pools: CommunityPool[];
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [poolType, setPoolType] = useState<PoolType>('crowdfunded_mission');
  const [targetAmount, setTargetAmount] = useState('1000');
  const [totalPool, setTotalPool] = useState('500');
  const [distributionMethod, setDistributionMethod] = useState<DistributionMethod>('weighted');
  const [minContribution, setMinContribution] = useState('10');
  const [closesAt, setClosesAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate() {
    if (!name.trim()) { setError('Name is required.'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/community/pools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          name: name.trim(),
          description: description.trim() || undefined,
          pool_type: poolType,
          target_amount: parseFloat(targetAmount) || 1000,
          total_pool: parseFloat(totalPool) || 500,
          distribution_method: distributionMethod,
          min_contribution: parseFloat(minContribution) || 10,
          closes_at: closesAt || undefined,
        }),
      });
      if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? 'Failed'); }
      onCreated();
      onClose();
      setName(''); setDescription(''); setTargetAmount('1000'); setTotalPool('500');
      setMinContribution('10'); setClosesAt('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create pool');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title="Create Community Pool">
      <InputField label="Pool Name" value={name} onChange={setName} required placeholder="e.g. Q3 Mission Fund" />
      <TextareaField label="Description" value={description} onChange={setDescription} placeholder="What is this pool for?" />
      <RadioGrid<PoolType>
        label="Pool Type"
        value={poolType}
        onChange={setPoolType}
        options={[
          { value: 'crowdfunded_mission', label: 'Crowdfunded Mission', desc: 'Community funds a mission goal' },
          { value: 'validation_pool',     label: 'Validation Pool',     desc: 'Reward peer validators' },
          { value: 'recognition_fund',    label: 'Recognition Fund',    desc: 'Acknowledge top contributors' },
          { value: 'skill_pool',          label: 'Skill Pool',          desc: 'Reward specific skill contributions' },
        ]}
      />
      <div className="grid grid-cols-2 gap-3">
        <InputField label="Target Amount (pts)" value={targetAmount} onChange={setTargetAmount} type="number" min="0" />
        <InputField label="Total Pool (pts)" value={totalPool} onChange={setTotalPool} type="number" min="0" />
      </div>
      <RadioGrid<DistributionMethod>
        label="Distribution Method"
        value={distributionMethod}
        onChange={setDistributionMethod}
        options={[
          { value: 'equal',         label: 'Equal Split',      desc: '1/n per contributor' },
          { value: 'weighted',      label: 'Weighted (W)',      desc: 'W_i / ΣW per contributor' },
          { value: 'quadratic',     label: 'Quadratic (√W)',    desc: '√W_i / Σ√W balances inequality' },
          { value: 'trust_weighted', label: 'Trust-Weighted',  desc: 'W_i×T_i / Σ(W_j×T_j)' },
        ]}
      />
      <div className="grid grid-cols-2 gap-3">
        <InputField label="Min Contribution (pts)" value={minContribution} onChange={setMinContribution} type="number" min="0" />
        <InputField label="Closes At" value={closesAt} onChange={setClosesAt} type="date" />
      </div>
      {error && <p className="text-[12px] font-medium" style={{ color: t.error }}>{error}</p>}
      <button
        onClick={handleCreate}
        disabled={saving}
        className="w-full h-10 rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
        style={{ background: t.accent, color: t.bg }}
      >
        {saving ? <RotateCcw size={14} strokeWidth={2.5} className="animate-spin" /> : <Plus size={14} strokeWidth={2.5} />}
        {saving ? 'Creating...' : 'Create Pool'}
      </button>
    </Drawer>
  );
}

function ContributionsDrawer({
  open, onClose, pool,
}: {
  open: boolean; onClose: () => void; pool: CommunityPool | null;
}) {
  const [contributions, setContributions] = useState<PoolContribution[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !pool) return;
    setLoading(true);
    fetch(`/api/community/pools?pool_id=${pool.id}&view=contributions`)
      .then((r) => r.json())
      .then((d) => setContributions(d.contributions ?? d ?? []))
      .catch(() => setContributions([]))
      .finally(() => setLoading(false));
  }, [open, pool]);

  return (
    <Drawer open={open} onClose={onClose} title={pool ? `Contributors — ${pool.name}` : 'Contributors'}>
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
        </div>
      ) : contributions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Users size={28} strokeWidth={1.5} style={{ color: t.txtFaint }} />
          <p className="text-[13px]" style={{ color: t.txtDim }}>No contributions yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {contributions.map((c) => {
            const scfg = getStatusCfg(c.status);
            return (
              <div
                key={c.id}
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: t.card, border: `1px solid ${t.border}` }}
              >
                <Initials name={c.user?.display_name ?? c.user_id} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold truncate" style={{ color: t.txt }}>
                    {c.user?.display_name ?? 'Unknown'}
                  </p>
                  <p className="text-[11px]" style={{ color: t.txtFaint }}>
                    Trust: {c.trust_score_snapshot} · Rank #{c.timing_rank}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[13px] font-bold" style={{ color: t.accent }}>{c.amount} pts</p>
                  <Badge label={c.status} color={scfg.color} bg={scfg.bg} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Drawer>
  );
}

function DistributionPreviewDrawer({
  open, onClose, pool, onExecute,
}: {
  open: boolean; onClose: () => void; pool: CommunityPool | null; onExecute: () => void;
}) {
  const [results, setResults] = useState<DistributionResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    if (!open || !pool) return;
    setLoading(true);
    fetch(`/api/community/pools?pool_id=${pool.id}&view=preview`)
      .then((r) => r.json())
      .then((d) => setResults(Array.isArray(d) ? d : (d.results ?? [])))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [open, pool]);

  async function handleExecute() {
    if (!pool) return;
    setExecuting(true);
    try {
      await fetch('/api/community/pools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'distribute', pool_id: pool.id }),
      });
      onExecute();
      onClose();
    } catch {
    } finally {
      setExecuting(false);
      setConfirm(false);
    }
  }

  const sorted = [...results].sort((a, b) => b.share - a.share);

  return (
    <Drawer open={open} onClose={onClose} title={pool ? `Distribution Preview — ${pool.name}` : 'Distribution Preview'}>
      {pool && (
        <div className="p-3 rounded-xl flex items-center justify-between" style={{ background: t.card, border: `1px solid ${t.border}` }}>
          <span className="text-[12px]" style={{ color: t.txtDim }}>Total pool value</span>
          <span className="text-[15px] font-bold" style={{ color: t.accent }}>{pool.total_pool} pts</span>
        </div>
      )}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center py-10 gap-3">
          <BarChart3 size={24} strokeWidth={1.5} style={{ color: t.txtFaint }} />
          <p className="text-[13px]" style={{ color: t.txtDim }}>No distribution data available</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl" style={{ border: `1px solid ${t.border}` }}>
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ borderBottom: `1px solid ${t.border}`, background: t.panel }}>
                {['Rank', 'Contributor', 'Raw Weight', 'Share %', 'Amount (pts)'].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-bold uppercase tracking-wide text-[10px]" style={{ color: t.txtFaint }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => (
                <tr key={r.userId} style={{ borderBottom: i < sorted.length - 1 ? `1px solid ${t.border}` : undefined }}>
                  <td className="px-3 py-2.5 font-bold" style={{ color: t.txtFaint }}>#{i + 1}</td>
                  <td className="px-3 py-2.5 font-medium truncate max-w-[120px]" style={{ color: t.txt }}>{r.userId.slice(0, 8)}…</td>
                  <td className="px-3 py-2.5 tabular-nums" style={{ color: t.txtDim }}>{r.rawWeight.toFixed(2)}</td>
                  <td className="px-3 py-2.5 font-bold tabular-nums" style={{ color: t.ai }}>{(r.share * 100).toFixed(1)}%</td>
                  <td className="px-3 py-2.5 font-bold tabular-nums" style={{ color: t.accent }}>{r.amount.toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {sorted.length > 0 && (
        <div className="pt-2 space-y-2">
          {!confirm ? (
            <button
              onClick={() => setConfirm(true)}
              className="w-full h-10 rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 transition-opacity"
              style={{ background: t.warning, color: t.bg }}
            >
              <Play size={14} strokeWidth={2.5} />
              Execute Distribution
            </button>
          ) : (
            <div className="p-3 rounded-xl space-y-3" style={{ background: `${t.error}0D`, border: `1px solid ${t.error}33` }}>
              <p className="text-[12px] font-medium" style={{ color: t.warning }}>
                This will distribute {pool?.total_pool} pts to {sorted.length} contributors. This action cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirm(false)}
                  className="flex-1 h-9 rounded-xl text-[12px] font-semibold"
                  style={{ background: t.panel, color: t.txtDim }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecute}
                  disabled={executing}
                  className="flex-1 h-9 rounded-xl text-[12px] font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
                  style={{ background: t.error, color: t.txt }}
                >
                  {executing ? <RotateCcw size={12} className="animate-spin" /> : <Play size={12} />}
                  Confirm
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}

function CreateTaskDrawer({
  open, onClose, onCreated, pools,
}: {
  open: boolean; onClose: () => void; onCreated: () => void; pools: CommunityPool[];
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [taskType, setTaskType] = useState<TaskType>('open');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [requiredCompletions, setRequiredCompletions] = useState('3');
  const [rewardPerCompletion, setRewardPerCompletion] = useState('50');
  const [validationThreshold, setValidationThreshold] = useState('2');
  const [selectedPool, setSelectedPool] = useState('');
  const [deadline, setDeadline] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate() {
    if (!title.trim()) { setError('Title is required.'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/community/crowd-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          title: title.trim(),
          description: description.trim() || undefined,
          instructions: instructions.trim() || undefined,
          task_type: taskType,
          max_participants: maxParticipants ? parseInt(maxParticipants) : undefined,
          required_completions: parseInt(requiredCompletions) || 3,
          reward_per_completion: parseFloat(rewardPerCompletion) || 50,
          validation_threshold: parseInt(validationThreshold) || 2,
          pool_id: selectedPool || undefined,
          deadline: deadline || undefined,
        }),
      });
      if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? 'Failed'); }
      onCreated();
      onClose();
      setTitle(''); setDescription(''); setInstructions('');
      setMaxParticipants(''); setRequiredCompletions('3');
      setRewardPerCompletion('50'); setSelectedPool('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create task');
    } finally {
      setSaving(false);
    }
  }

  const openPools = pools.filter((p) => p.status === 'open' || p.status === 'active');

  return (
    <Drawer open={open} onClose={onClose} title="Create Crowd Task">
      <InputField label="Task Title" value={title} onChange={setTitle} required placeholder="e.g. Validate Mission Outcomes" />
      <TextareaField label="Description" value={description} onChange={setDescription} placeholder="Describe what participants will do" />
      <TextareaField label="Instructions" value={instructions} onChange={setInstructions} placeholder="Step-by-step instructions for participants" />
      <RadioGrid<TaskType>
        label="Task Type"
        value={taskType}
        onChange={setTaskType}
        options={[
          { value: 'survey',             label: 'Survey',           desc: 'Collect opinions/data' },
          { value: 'data_collection',    label: 'Data Collection',  desc: 'Gather structured data' },
          { value: 'content_review',     label: 'Content Review',   desc: 'Review and rate content' },
          { value: 'skill_contribution', label: 'Skill Contribution', desc: 'Apply a specific skill' },
          { value: 'community_vote',     label: 'Community Vote',   desc: 'Vote on a decision' },
          { value: 'open',              label: 'Open Task',         desc: 'Free-form contribution' },
        ]}
      />
      <div className="grid grid-cols-2 gap-3">
        <InputField label="Max Participants" value={maxParticipants} onChange={setMaxParticipants} type="number" min="1" placeholder="Unlimited" />
        <InputField label="Required Completions" value={requiredCompletions} onChange={setRequiredCompletions} type="number" min="1" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <InputField label="Reward per Completion (pts)" value={rewardPerCompletion} onChange={setRewardPerCompletion} type="number" min="0" />
        <InputField label="Validation Threshold" value={validationThreshold} onChange={setValidationThreshold} type="number" min="1" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-[12px] font-semibold" style={{ color: t.txtDim }}>Link to Pool (optional)</label>
        <select
          value={selectedPool}
          onChange={(e) => setSelectedPool(e.target.value)}
          className="h-9 px-3 rounded-xl text-[13px] outline-none w-full"
          style={{ background: t.panel, border: `1px solid ${t.border}`, color: selectedPool ? t.txt : t.txtFaint }}
        >
          <option value="">— No pool —</option>
          {openPools.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <InputField label="Deadline" value={deadline} onChange={setDeadline} type="date" />
      {error && <p className="text-[12px] font-medium" style={{ color: t.error }}>{error}</p>}
      <button
        onClick={handleCreate}
        disabled={saving}
        className="w-full h-10 rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
        style={{ background: t.ai, color: t.txt }}
      >
        {saving ? <RotateCcw size={14} strokeWidth={2.5} className="animate-spin" /> : <Plus size={14} strokeWidth={2.5} />}
        {saving ? 'Creating...' : 'Create Task'}
      </button>
    </Drawer>
  );
}

function SubmissionsDrawer({
  open, onClose, task,
}: {
  open: boolean; onClose: () => void; task: CrowdTask | null;
}) {
  const [completions, setCompletions] = useState<CrowdTaskCompletion[]>([]);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !task) return;
    setLoading(true);
    fetch(`/api/community/crowd-tasks?task_id=${task.id}&view=completions`)
      .then((r) => r.json())
      .then((d) => setCompletions(Array.isArray(d) ? d : (d.completions ?? [])))
      .catch(() => setCompletions([]))
      .finally(() => setLoading(false));
  }, [open, task]);

  async function handleValidate(completionId: string) {
    setValidating(completionId);
    try {
      await fetch('/api/community/crowd-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'validate', completion_id: completionId }),
      });
      setCompletions((prev) => prev.map((c) => c.id === completionId ? { ...c, status: 'validated' } : c));
    } catch {
    } finally {
      setValidating(null);
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title={task ? `Submissions — ${task.title}` : 'Submissions'}>
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : completions.length === 0 ? (
        <div className="flex flex-col items-center py-12 gap-3">
          <CheckCircle2 size={28} strokeWidth={1.5} style={{ color: t.txtFaint }} />
          <p className="text-[13px]" style={{ color: t.txtDim }}>No submissions yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {completions.map((c) => {
            const scfg = getStatusCfg(c.status);
            return (
              <div
                key={c.id}
                className="p-3 rounded-xl"
                style={{ background: t.card, border: `1px solid ${t.border}` }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Initials name={c.user?.display_name ?? c.user_id} size={28} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold" style={{ color: t.txt }}>{c.user?.display_name ?? 'Unknown'}</p>
                    <p className="text-[10px]" style={{ color: t.txtFaint }}>
                      {new Date(c.submitted_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px]" style={{ color: t.txtDim }}>
                      {c.upvote_count} upvotes
                    </span>
                    <Badge label={c.status} color={scfg.color} bg={scfg.bg} />
                  </div>
                </div>
                {c.proof_text && (
                  <p className="text-[12px] line-clamp-2 mb-2" style={{ color: t.txtDim }}>{c.proof_text}</p>
                )}
                {c.status === 'submitted' && (
                  <button
                    onClick={() => handleValidate(c.id)}
                    disabled={validating === c.id}
                    className="flex items-center gap-1.5 h-7 px-3 rounded-lg text-[11px] font-bold transition-opacity disabled:opacity-50"
                    style={{ background: `${t.accent}1A`, color: t.accent, border: `1px solid ${t.accent}33` }}
                  >
                    {validating === c.id ? <RotateCcw size={10} className="animate-spin" /> : <CheckCircle2 size={10} strokeWidth={2.5} />}
                    Validate
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Drawer>
  );
}

function PoolCard({
  pool, index, onViewContributions, onPreviewDistribution, onDistribute,
}: {
  pool: CommunityPool;
  index: number;
  onViewContributions: (p: CommunityPool) => void;
  onPreviewDistribution: (p: CommunityPool) => void;
  onDistribute: (p: CommunityPool) => void;
}) {
  const ptCfg = POOL_TYPE_CONFIG[pool.pool_type];
  const stCfg = getStatusCfg(pool.status);
  const ct = countdown(pool.closes_at);
  const canDistribute = (pool.status === 'open' || pool.status === 'active') && pool.contributors_count > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35 }}
      className="rounded-2xl p-4 flex flex-col gap-3 transition-colors"
      style={{ background: t.card, border: `1px solid ${t.panel}` }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = t.borderMid; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = t.panel; }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold truncate" style={{ color: t.txt }}>{pool.name}</p>
          {pool.description && (
            <p className="text-[12px] mt-0.5 line-clamp-2" style={{ color: t.txtDim }}>{pool.description}</p>
          )}
        </div>
        <Badge label={ptCfg.label} color={ptCfg.color} bg={ptCfg.bg} />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px]" style={{ color: t.txtFaint }}>Progress</span>
          <span className="text-[11px] font-bold tabular-nums" style={{ color: t.accent }}>
            {pool.current_amount} / {pool.target_amount} pts ({pool.completion_pct.toFixed(0)}%)
          </span>
        </div>
        <ProgressBar value={pool.completion_pct} color={t.accent} />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="text-center">
          <p className="text-[13px] font-bold tabular-nums" style={{ color: t.txt }}>{pool.contributors_count}</p>
          <p className="text-[10px]" style={{ color: t.txtFaint }}>Contributors</p>
        </div>
        <div className="text-center">
          <p className="text-[13px] font-bold tabular-nums" style={{ color: t.ai }}>{pool.total_pool}</p>
          <p className="text-[10px]" style={{ color: t.txtFaint }}>Pool (pts)</p>
        </div>
        <div className="text-center">
          <Badge label={DISTRIBUTION_LABELS[pool.distribution_method]} color={t.txtDim} bg={t.panel} />
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Badge label={pool.status} color={stCfg.color} bg={stCfg.bg} />
        {ct && (
          <span className="flex items-center gap-1 text-[10px]" style={{ color: t.txtFaint }}>
            <Clock size={10} strokeWidth={2} />
            {ct}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2 pt-1" style={{ borderTop: `1px solid ${t.panel}` }}>
        <button
          onClick={() => onViewContributions(pool)}
          className="flex items-center gap-1 h-7 px-2.5 rounded-lg text-[11px] font-semibold transition-colors"
          style={{ background: t.panel, color: t.txtDim, border: `1px solid ${t.border}` }}
          onMouseEnter={(e) => { e.currentTarget.style.color = t.txt; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = t.txtDim; }}
        >
          <Users size={10} strokeWidth={2} />
          View Contributions
        </button>
        <button
          onClick={() => onPreviewDistribution(pool)}
          className="flex items-center gap-1 h-7 px-2.5 rounded-lg text-[11px] font-semibold transition-colors"
          style={{ background: t.panel, color: t.txtDim, border: `1px solid ${t.border}` }}
          onMouseEnter={(e) => { e.currentTarget.style.color = t.txt; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = t.txtDim; }}
        >
          <BarChart3 size={10} strokeWidth={2} />
          Preview Distribution
        </button>
        {canDistribute && (
          <button
            onClick={() => onDistribute(pool)}
            className="flex items-center gap-1 h-7 px-2.5 rounded-lg text-[11px] font-bold transition-colors"
            style={{ background: `${t.warning}1A`, color: t.warning, border: `1px solid ${t.warning}33` }}
          >
            <Play size={10} strokeWidth={2.5} />
            Execute Distribution
          </button>
        )}
      </div>
    </motion.div>
  );
}

function TaskCard({
  task, index, onViewSubmissions,
}: {
  task: CrowdTask; index: number; onViewSubmissions: (t: CrowdTask) => void;
}) {
  const ttCfg = TASK_TYPE_CONFIG[task.task_type];
  const stCfg = getStatusCfg(task.status);
  const ct = countdown(task.deadline);
  const completionPct = task.required_completions > 0
    ? Math.min((task.current_completions / task.required_completions) * 100, 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35 }}
      className="rounded-2xl p-4 flex flex-col gap-3 transition-colors"
      style={{ background: t.card, border: `1px solid ${t.panel}` }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = t.borderMid; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = t.panel; }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold truncate" style={{ color: t.txt }}>{task.title}</p>
          {task.description && (
            <p className="text-[12px] mt-0.5 line-clamp-2" style={{ color: t.txtDim }}>{task.description}</p>
          )}
        </div>
        <Badge label={ttCfg.label} color={ttCfg.color} bg={ttCfg.bg} />
      </div>

      {task.pool && (
        <div className="flex items-center gap-1.5 text-[11px]" style={{ color: t.txtFaint }}>
          <Layers size={10} strokeWidth={2} />
          Pool: <span style={{ color: t.ai }}>{task.pool.name}</span>
        </div>
      )}

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px]" style={{ color: t.txtFaint }}>Completions</span>
          <span className="text-[11px] font-bold tabular-nums" style={{ color: t.ai }}>
            {task.current_completions} / {task.required_completions}
          </span>
        </div>
        <ProgressBar value={completionPct} color={t.ai} />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="text-center">
          <p className="text-[13px] font-bold tabular-nums" style={{ color: t.txt }}>{task.current_participants}</p>
          <p className="text-[10px]" style={{ color: t.txtFaint }}>Participants</p>
        </div>
        <div className="text-center">
          <p className="text-[13px] font-bold tabular-nums" style={{ color: t.accent }}>{task.reward_per_completion}</p>
          <p className="text-[10px]" style={{ color: t.txtFaint }}>Pts / Completion</p>
        </div>
        <div className="text-center">
          <p className="text-[13px] font-bold tabular-nums" style={{ color: t.warning }}>{task.validation_threshold}</p>
          <p className="text-[10px]" style={{ color: t.txtFaint }}>Validations needed</p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Badge label={task.status} color={stCfg.color} bg={stCfg.bg} />
        {ct && (
          <span className="flex items-center gap-1 text-[10px]" style={{ color: t.txtFaint }}>
            <Clock size={10} strokeWidth={2} />
            {ct}
          </span>
        )}
      </div>

      <div className="pt-1" style={{ borderTop: `1px solid ${t.panel}` }}>
        <button
          onClick={() => onViewSubmissions(task)}
          className="flex items-center gap-1 h-7 px-2.5 rounded-lg text-[11px] font-semibold transition-colors"
          style={{ background: t.panel, color: t.txtDim, border: `1px solid ${t.border}` }}
          onMouseEnter={(e) => { e.currentTarget.style.color = t.txt; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = t.txtDim; }}
        >
          <ChevronRight size={10} strokeWidth={2} />
          View Submissions
        </button>
      </div>
    </motion.div>
  );
}

function computeWeight(amount: number, impactWeight: number, qualityScore: number, timingRank: number, trustScore: number, n: number) {
  const qualityMul = 1 + Math.min(qualityScore, 0.5);
  const timingMul = 1 + 0.2 * ((n - timingRank) / Math.max(n - 1, 1));
  const trustFactor = 0.7 + 0.3 * (trustScore / 100);
  return amount * impactWeight * qualityMul * timingMul * trustFactor;
}

function getShares(weights: number[], trustScores: number[], method: DistributionMethod): number[] {
  const n = weights.length;
  if (n === 0) return [];
  if (method === 'equal') return weights.map(() => 1 / n);
  if (method === 'weighted') {
    const total = weights.reduce((a, b) => a + b, 0);
    return weights.map((w) => (total === 0 ? 1 / n : w / total));
  }
  if (method === 'quadratic') {
    const sqrts = weights.map((w) => Math.sqrt(w));
    const total = sqrts.reduce((a, b) => a + b, 0);
    return sqrts.map((s) => (total === 0 ? 1 / n : s / total));
  }
  const tw = weights.map((w, i) => w * (0.7 + 0.3 * (trustScores[i] / 100)));
  const total = tw.reduce((a, b) => a + b, 0);
  return tw.map((v) => (total === 0 ? 1 / n : v / total));
}

function EconometricsTab() {
  const [numContributors, setNumContributors] = useState(8);

  const syntheticData = Array.from({ length: numContributors }, (_, i) => ({
    amount: (i + 1) * 100,
    impactWeight: 1.0,
    trustScore: i * 4 + 20,
    qualityScore: i * 0.05,
    timingRank: i + 1,
  }));

  const weights = syntheticData.map((d) =>
    computeWeight(d.amount, d.impactWeight, d.qualityScore, d.timingRank, d.trustScore, numContributors)
  );
  const trustScores = syntheticData.map((d) => d.trustScore);

  const methods: DistributionMethod[] = ['equal', 'weighted', 'quadratic', 'trust_weighted'];
  const allShares: Record<DistributionMethod, number[]> = {
    equal:         getShares(weights, trustScores, 'equal'),
    weighted:      getShares(weights, trustScores, 'weighted'),
    quadratic:     getShares(weights, trustScores, 'quadratic'),
    trust_weighted: getShares(weights, trustScores, 'trust_weighted'),
  };

  const formulaCards = [
    {
      method: 'equal' as DistributionMethod,
      formula: 'share = 1 / n',
      note: 'Most egalitarian — ignores effort differences',
      color: t.accent,
    },
    {
      method: 'weighted' as DistributionMethod,
      formula: 'share = W_i / ΣW',
      note: 'Rewards larger or higher-quality contributions more',
      color: t.ai,
    },
    {
      method: 'quadratic' as DistributionMethod,
      formula: 'share = √W_i / Σ√W',
      note: 'Reduces inequality vs weighted — better for communities',
      color: t.warning,
    },
    {
      method: 'trust_weighted' as DistributionMethod,
      formula: 'share = (W_i × T_i) / Σ(W_j × T_j)',
      note: 'Amplifies trusted contributors via trust score factor',
      color: t.info,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {formulaCards.map((card, i) => (
          <motion.div
            key={card.method}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="rounded-2xl p-4"
            style={{ background: t.card, border: `1px solid ${t.panel}` }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${card.color}1A` }}>
                <BarChart3 size={13} strokeWidth={2} style={{ color: card.color }} />
              </div>
              <p className="text-[13px] font-bold" style={{ color: t.txt }}>{DISTRIBUTION_LABELS[card.method]}</p>
            </div>
            <p
              className="font-mono text-[12px] px-3 py-2 rounded-lg mb-2"
              style={{ background: t.panel, color: card.color }}
            >
              {card.formula}
            </p>
            <p className="text-[12px]" style={{ color: t.txtFaint }}>{card.note}</p>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="rounded-2xl p-5"
        style={{ background: t.card, border: `1px solid ${t.panel}` }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[14px] font-bold" style={{ color: t.txt }}>Live Simulation</p>
            <p className="text-[12px]" style={{ color: t.txtFaint }}>Synthetic contributors with graduated amounts, trust, and quality</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[12px]" style={{ color: t.txtDim }}>Contributors: {numContributors}</span>
            <input
              type="range"
              min={2}
              max={20}
              value={numContributors}
              onChange={(e) => setNumContributors(parseInt(e.target.value))}
              className="w-32"
              style={{ accentColor: t.accent }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {methods.map((method, mi) => {
            const shares = allShares[method];
            const maxShare = Math.max(...shares);
            const color = formulaCards[mi].color;
            return (
              <div key={method}>
                <p className="text-[12px] font-bold mb-3" style={{ color }}>
                  {DISTRIBUTION_LABELS[method]}
                </p>
                <div className="flex items-end gap-1 h-24">
                  {shares.map((share, i) => (
                    <motion.div
                      key={i}
                      className="flex-1 rounded-t-sm"
                      initial={{ height: 0 }}
                      animate={{ height: `${(share / maxShare) * 100}%` }}
                      transition={{ duration: 0.4, delay: i * 0.02 }}
                      style={{ background: color, opacity: 0.7 + (i / shares.length) * 0.3 }}
                      title={`Contributor ${i + 1}: ${(share * 100).toFixed(1)}%`}
                    />
                  ))}
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[10px]" style={{ color: t.txtFaint }}>C1</span>
                  <span className="text-[10px]" style={{ color: t.txtFaint }}>C{numContributors}</span>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="rounded-2xl p-5"
        style={{ background: t.card, border: `1px solid ${t.panel}` }}
      >
        <p className="text-[14px] font-bold mb-4" style={{ color: t.txt }}>Component Weight Formula</p>
        <div className="space-y-3">
          {[
            { label: 'Base weight', formula: 'W = amount × impactWeight × qualityMul × timingMul × trustFactor', color: t.accent },
            { label: 'Quality multiplier', formula: 'qualityMul = 1 + min(qualityScore, 0.5)', color: t.ai },
            { label: 'Timing multiplier', formula: 'timingMul = 1 + 0.2 × ((N − rank) / max(N−1, 1))', color: t.warning },
            { label: 'Trust factor', formula: 'trustFactor = 0.7 + 0.3 × (trustScore / 100)', color: t.info },
          ].map((row) => (
            <div key={row.label} className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="text-[11px] font-semibold w-36 flex-shrink-0" style={{ color: t.txtDim }}>{row.label}</span>
              <code
                className="font-mono text-[11px] px-3 py-1.5 rounded-lg flex-1"
                style={{ background: t.panel, color: row.color }}
              >
                {row.formula}
              </code>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function AnalyticsTab({
  pools, tasks,
}: {
  pools: CommunityPool[];
  tasks: CrowdTask[];
}) {
  const [upvoteActivity, setUpvoteActivity] = useState<{ user?: { display_name?: string }; weight?: number; created_at: string }[]>([]);
  const [upvoteLoading, setUpvoteLoading] = useState(true);

  useEffect(() => {
    fetch('/api/community/upvotes')
      .then((r) => r.json())
      .then((d) => setUpvoteActivity(Array.isArray(d) ? d : (d.upvotes ?? [])))
      .catch(() => setUpvoteActivity([]))
      .finally(() => setUpvoteLoading(false));
  }, []);

  const activePools = pools.filter((p) => p.status === 'open' || p.status === 'active').length;
  const totalPoolValue = pools.reduce((s, p) => s + (p.total_pool ?? 0), 0);
  const activeTasks = tasks.filter((t) => t.status === 'open' || t.status === 'in_progress').length;
  const totalParticipations = tasks.reduce((s, t) => s + t.current_participants, 0);

  const statCards = [
    { label: 'Active Pools', value: activePools, icon: Layers, color: t.accent, bg: `${t.accent}1A` },
    { label: 'Total Pool Value (pts)', value: totalPoolValue, icon: Coins, color: t.ai, bg: `${t.ai}1A` },
    { label: 'Active Tasks', value: activeTasks, icon: CheckCircle2, color: t.warning, bg: `${t.warning}1A` },
    { label: 'Total Participations', value: totalParticipations, icon: Users, color: t.info, bg: `${t.info}1A` },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="rounded-2xl p-4"
            style={{ background: t.card, border: `1px solid ${t.panel}` }}
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3" style={{ background: card.bg }}>
              <card.icon size={15} strokeWidth={1.8} style={{ color: card.color }} />
            </div>
            <p className="text-[22px] font-bold tabular-nums" style={{ color: card.color }}>{card.value}</p>
            <p className="text-[11px] mt-0.5" style={{ color: t.txtDim }}>{card.label}</p>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl p-5"
        style={{ background: t.card, border: `1px solid ${t.panel}` }}
      >
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp size={15} strokeWidth={2} style={{ color: t.ai }} />
          <p className="text-[14px] font-bold" style={{ color: t.txt }}>Upvote Economy</p>
        </div>
        <p className="text-[12px] mb-4" style={{ color: t.txtFaint }}>
          Community upvotes determine contribution quality and feed into trust-weighted distributions.
          Higher upvote weight amplifies a contributor's share in quadratic and trust-weighted pools.
        </p>
        <div className="flex items-center gap-2 mb-4">
          <Activity size={14} strokeWidth={2} style={{ color: t.warning }} />
          <p className="text-[13px] font-semibold" style={{ color: t.txt }}>Community Upvote Activity</p>
        </div>
        {upvoteLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
          </div>
        ) : upvoteActivity.length === 0 ? (
          <div className="flex flex-col items-center py-8 gap-2">
            <ArrowLeftRight size={24} strokeWidth={1.5} style={{ color: t.txtFaint }} />
            <p className="text-[13px]" style={{ color: t.txtDim }}>No upvote activity yet</p>
            <p className="text-[12px]" style={{ color: t.txtFaint }}>Upvotes will appear here as community members validate contributions.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {upvoteActivity.slice(0, 10).map((ev, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-2.5 rounded-xl"
                style={{ background: t.panel }}
              >
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${t.accent}1A` }}>
                  <TrendingUp size={10} strokeWidth={2.5} style={{ color: t.accent }} />
                </div>
                <p className="text-[12px] flex-1" style={{ color: t.txtDim }}>
                  {ev.user?.display_name ?? 'Community member'} upvoted
                  {ev.weight ? ` (weight: ${ev.weight})` : ''}
                </p>
                <span className="text-[10px]" style={{ color: t.txtFaint }}>
                  {new Date(ev.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default function CommunityPage() {
  const [tab, setTab] = useState<TabId>('pools');
  const [pools, setPools] = useState<CommunityPool[]>([]);
  const [tasks, setTasks] = useState<CrowdTask[]>([]);
  const [loadingPools, setLoadingPools] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(true);

  const [createPoolOpen, setCreatePoolOpen] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);

  const [contributionsPool, setContributionsPool] = useState<CommunityPool | null>(null);
  const [previewPool, setPreviewPool] = useState<CommunityPool | null>(null);
  const [distributePool, setDistributePool] = useState<CommunityPool | null>(null);
  const [submissionsTask, setSubmissionsTask] = useState<CrowdTask | null>(null);

  const fetchPools = useCallback(() => {
    setLoadingPools(true);
    fetch('/api/community/pools')
      .then((r) => r.json())
      .then((d) => setPools(Array.isArray(d) ? d : (d.pools ?? [])))
      .catch(() => setPools([]))
      .finally(() => setLoadingPools(false));
  }, []);

  const fetchTasks = useCallback(() => {
    setLoadingTasks(true);
    fetch('/api/community/crowd-tasks')
      .then((r) => r.json())
      .then((d) => setTasks(Array.isArray(d) ? d : (d.tasks ?? [])))
      .catch(() => setTasks([]))
      .finally(() => setLoadingTasks(false));
  }, []);

  useEffect(() => { fetchPools(); }, [fetchPools]);
  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const activePools = pools.filter((p) => p.status === 'open' || p.status === 'active').length;
  const totalPoolValue = pools.reduce((s, p) => s + (p.total_pool ?? 0), 0);
  const activeTasks = tasks.filter((t) => t.status === 'open' || t.status === 'in_progress').length;
  const communityUpvotes = tasks.reduce((s, t) => s + t.current_participants, 0);

  const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'pools',        label: 'Pools',        icon: Layers },
    { id: 'tasks',        label: 'Crowd Tasks',  icon: CheckCircle2 },
    { id: 'econometrics', label: 'Econometrics', icon: Brain },
    { id: 'analytics',   label: 'Analytics',    icon: BarChart3 },
  ];

  const statChips = [
    { label: 'Active Pools',      value: activePools,       color: t.accent },
    { label: 'Total Pool Value',  value: `${totalPoolValue} pts`, color: t.ai },
    { label: 'Active Tasks',      value: activeTasks,       color: t.warning },
    { label: 'Community Upvotes (30d)', value: communityUpvotes, color: t.info },
  ];

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto" style={{ color: t.txt }}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${t.ai}1A`, border: `1px solid ${t.ai}33` }}>
            <Users size={17} strokeWidth={1.8} style={{ color: t.ai }} />
          </div>
          <div>
            <h1 className="text-[22px] font-bold leading-tight" style={{ color: t.txt }}>Community</h1>
            <p className="text-[13px]" style={{ color: t.txtDim }}>Manage pools, crowd tasks, and collective rewards</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {statChips.map((chip) => (
          <div
            key={chip.label}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
            style={{ background: t.card, border: `1px solid ${t.panel}` }}
          >
            <span className="text-[13px] font-bold tabular-nums" style={{ color: chip.color }}>{chip.value}</span>
            <span className="text-[11px]" style={{ color: t.txtFaint }}>{chip.label}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-1 mb-6 overflow-x-auto pb-1" style={{ borderBottom: `1px solid ${t.panel}` }}>
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-semibold whitespace-nowrap transition-colors rounded-t-lg"
              style={{
                color: active ? t.ai : t.txtDim,
                borderBottom: active ? `2px solid ${t.ai}` : '2px solid transparent',
                background: 'transparent',
              }}
            >
              <Icon size={13} strokeWidth={2} />
              {label}
            </button>
          );
        })}
      </div>

      {tab === 'pools' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-[15px] font-bold" style={{ color: t.txt }}>Community Pools</p>
            <button
              onClick={() => setCreatePoolOpen(true)}
              className="flex items-center gap-1.5 h-8 px-3 rounded-xl text-[12px] font-bold transition-opacity hover:opacity-80"
              style={{ background: t.ai, color: t.txt }}
            >
              <Plus size={13} strokeWidth={2.5} />
              Create Pool
            </button>
          </div>
          {loadingPools ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}
            </div>
          ) : pools.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: `${t.ai}1A`, border: `1px solid ${t.ai}33` }}>
                <Layers size={24} strokeWidth={1.5} style={{ color: t.ai }} />
              </div>
              <p className="text-[15px] font-bold" style={{ color: t.txt }}>No pools yet</p>
              <p className="text-[13px]" style={{ color: t.txtDim }}>Create a community pool to start funding and rewarding collective efforts.</p>
              <button
                onClick={() => setCreatePoolOpen(true)}
                className="flex items-center gap-2 h-9 px-5 rounded-xl text-[13px] font-bold"
                style={{ background: t.ai, color: t.txt }}
              >
                <Plus size={14} strokeWidth={2.5} />
                Create Your First Pool
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {pools.map((pool, i) => (
                <PoolCard
                  key={pool.id}
                  pool={pool}
                  index={i}
                  onViewContributions={(p) => setContributionsPool(p)}
                  onPreviewDistribution={(p) => setPreviewPool(p)}
                  onDistribute={(p) => setDistributePool(p)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'tasks' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-[15px] font-bold" style={{ color: t.txt }}>Crowd Tasks</p>
            <button
              onClick={() => setCreateTaskOpen(true)}
              className="flex items-center gap-1.5 h-8 px-3 rounded-xl text-[12px] font-bold transition-opacity hover:opacity-80"
              style={{ background: t.accent, color: t.bg }}
            >
              <Plus size={13} strokeWidth={2.5} />
              Create Task
            </button>
          </div>
          {loadingTasks ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-2xl" />)}
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: `${t.accent}1A`, border: `1px solid ${t.accent}33` }}>
                <CheckCircle2 size={24} strokeWidth={1.5} style={{ color: t.accent }} />
              </div>
              <p className="text-[15px] font-bold" style={{ color: t.txt }}>No tasks yet</p>
              <p className="text-[13px]" style={{ color: t.txtDim }}>Create crowd tasks to engage community members in collective work.</p>
              <button
                onClick={() => setCreateTaskOpen(true)}
                className="flex items-center gap-2 h-9 px-5 rounded-xl text-[13px] font-bold"
                style={{ background: t.accent, color: t.bg }}
              >
                <Plus size={14} strokeWidth={2.5} />
                Create Your First Task
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {tasks.map((task, i) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  index={i}
                  onViewSubmissions={(tk) => setSubmissionsTask(tk)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'econometrics' && <EconometricsTab />}

      {tab === 'analytics' && <AnalyticsTab pools={pools} tasks={tasks} />}

      <CreatePoolDrawer
        open={createPoolOpen}
        onClose={() => setCreatePoolOpen(false)}
        onCreated={fetchPools}
        pools={pools}
      />

      <CreateTaskDrawer
        open={createTaskOpen}
        onClose={() => setCreateTaskOpen(false)}
        onCreated={fetchTasks}
        pools={pools}
      />

      <ContributionsDrawer
        open={contributionsPool !== null}
        onClose={() => setContributionsPool(null)}
        pool={contributionsPool}
      />

      <DistributionPreviewDrawer
        open={previewPool !== null}
        onClose={() => setPreviewPool(null)}
        pool={previewPool}
        onExecute={fetchPools}
      />

      <DistributionPreviewDrawer
        open={distributePool !== null}
        onClose={() => setDistributePool(null)}
        pool={distributePool}
        onExecute={fetchPools}
      />

      <SubmissionsDrawer
        open={submissionsTask !== null}
        onClose={() => setSubmissionsTask(null)}
        task={submissionsTask}
      />
    </div>
  );
}
