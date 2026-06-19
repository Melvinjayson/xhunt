'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Users, Coins, Zap, BarChart3, CheckCircle2, Clock,
  Plus, X, ChevronRight, Target, Award, Globe, Brain,
  TrendingUp, Star, Activity,
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { cn } from '@/lib/cn';
import { t } from '@/theme/colors';

const LINE = 'rgba(255,255,255,.07)';

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
  min_contribution: number;
  status: string;
  contributors_count: number;
  completion_pct: number;
  closes_at: string;
  created_at: string;
  creator?: { display_name: string; avatar_url: string };
}

interface CrowdTask {
  id: string;
  title: string;
  description: string;
  task_type: TaskType;
  instructions?: string;
  max_participants: number;
  required_completions: number;
  current_participants: number;
  current_completions: number;
  reward_per_completion: number;
  validation_threshold: number;
  status: string;
  deadline: string;
  created_at: string;
  pool?: { id: string; name: string; pool_type: PoolType };
}

function poolTypeColor(pt: PoolType): string {
  if (pt === 'crowdfunded_mission') return t.accent;
  if (pt === 'validation_pool') return t.warning;
  if (pt === 'recognition_fund') return t.ai;
  return t.info;
}

function poolTypeLabel(pt: PoolType): string {
  if (pt === 'crowdfunded_mission') return 'Crowdfunded';
  if (pt === 'validation_pool') return 'Validation';
  if (pt === 'recognition_fund') return 'Recognition';
  return 'Skill Pool';
}

function distLabel(d: DistributionMethod): string {
  if (d === 'equal') return 'Equal Split';
  if (d === 'weighted') return 'Merit-Weighted';
  if (d === 'quadratic') return 'Quadratic';
  return 'Trust-Weighted';
}

function distExplanation(d: DistributionMethod): string {
  if (d === 'equal') return 'Every contributor receives an equal share of the reward pool regardless of amount contributed.';
  if (d === 'weighted') return 'Your share is proportional to your contribution amount multiplied by your trust score.';
  if (d === 'quadratic') return 'Contributions are square-rooted before weighting, reducing the advantage of large contributors.';
  return 'Shares are weighted by your trust score — higher-trust contributors earn a larger portion.';
}

function taskTypeColor(tt: TaskType): string {
  if (tt === 'survey') return t.accent;
  if (tt === 'data_collection') return t.info;
  if (tt === 'content_review') return t.warning;
  if (tt === 'skill_contribution') return t.ai;
  if (tt === 'community_vote') return t.error;
  return t.txtDim;
}

function taskTypeIcon(tt: TaskType): string {
  if (tt === 'survey') return '📋';
  if (tt === 'data_collection') return '📊';
  if (tt === 'content_review') return '⭐';
  if (tt === 'skill_contribution') return '🧠';
  if (tt === 'community_vote') return '🗳️';
  return '✏️';
}

function taskTypeLabel(tt: TaskType): string {
  if (tt === 'survey') return 'Survey';
  if (tt === 'data_collection') return 'Data Collection';
  if (tt === 'content_review') return 'Content Review';
  if (tt === 'skill_contribution') return 'Skill Contribution';
  if (tt === 'community_vote') return 'Community Vote';
  return 'Open Task';
}

function deadlineCountdown(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'Ended';
  const h = Math.floor(ms / 3600000);
  if (h < 24) return `${h}h left`;
  return `${Math.floor(h / 24)}d left`;
}

const LEADERBOARD_ROWS = [
  { rank: 1, name: 'Early Bird',    contribution: 500, trust: 82, share: 34 },
  { rank: 2, name: 'Quality Focus', contribution: 300, trust: 91, share: 28 },
  { rank: 3, name: 'Late Joiner',   contribution: 400, trust: 45, share: 18 },
  { rank: 4, name: 'New Member',    contribution: 200, trust: 30, share: 10 },
  { rank: 5, name: 'Others',        contribution: 0,   trust: 0,  share: 10 },
];

function ContributeDrawer({
  pool,
  onClose,
}: {
  pool: CommunityPool;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState(pool.min_contribution);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const color = poolTypeColor(pool.pool_type);

  async function handleContribute() {
    setLoading(true);
    try {
      await fetch('/api/community/pools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'contribute', pool_id: pool.id, amount }),
      });
      setSuccess(true);
      setTimeout(onClose, 1500);
    } catch {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'flex-end' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 300 }}
        animate={{ y: 0 }}
        exit={{ y: 300 }}
        transition={{ type: 'spring', damping: 26, stiffness: 280 }}
        style={{ width: '100%', maxWidth: 600, margin: '0 auto', background: t.surface, borderRadius: '24px 24px 0 0', padding: '24px 20px 40px', border: `1px solid ${LINE}`, borderBottom: 'none' }}
        onClick={e => e.stopPropagation()}
      >
        {success ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '24px 0' }}>
            <CheckCircle2 size={48} style={{ color: t.accent }} />
            <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: t.txt }}>Contribution sent!</p>
            <p style={{ margin: 0, fontSize: 13, color: t.txtDim }}>{amount.toLocaleString()} pts added to {pool.name}</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0, display: 'block' }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '.06em' }}>{poolTypeLabel(pool.pool_type)}</span>
                </div>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: t.txt }}>{pool.name}</p>
              </div>
              <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: '50%', background: t.card, border: `1px solid ${LINE}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <X size={16} style={{ color: t.txtDim }} />
              </button>
            </div>

            <p style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600, color: t.txt }}>How many points do you want to contribute?</p>

            <input
              type="number"
              min={pool.min_contribution}
              step={1}
              value={amount}
              onChange={e => setAmount(Math.max(pool.min_contribution, parseInt(e.target.value) || 0))}
              style={{ width: '100%', padding: '14px 16px', borderRadius: 14, background: t.card, border: `1px solid ${LINE}`, color: t.txt, fontSize: 22, fontWeight: 800, outline: 'none', boxSizing: 'border-box', textAlign: 'center' }}
            />

            <p style={{ margin: '10px 0 16px', fontSize: 12, color: t.txtDim }}>
              Min contribution: {pool.min_contribution.toLocaleString()} pts &nbsp;·&nbsp; Your contribution earns a share of the {pool.total_pool.toLocaleString()} pt reward pool
            </p>

            <div style={{ padding: '12px 14px', borderRadius: 12, background: t.card, border: `1px solid ${LINE}`, marginBottom: 20 }}>
              <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '.06em' }}>{distLabel(pool.distribution_method)}</p>
              <p style={{ margin: 0, fontSize: 12, color: t.txtDim, lineHeight: 1.55 }}>{distExplanation(pool.distribution_method)}</p>
            </div>

            <button
              onClick={handleContribute}
              disabled={loading || amount < pool.min_contribution}
              style={{ width: '100%', padding: '15px', borderRadius: 14, background: color, border: 'none', color: t.bg, fontSize: 15, fontWeight: 800, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Sending…' : `Contribute ${amount.toLocaleString()} pts`}
            </button>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

function SubmitDrawer({
  task,
  onClose,
}: {
  task: CrowdTask;
  onClose: () => void;
}) {
  const [proofText, setProofText] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const color = taskTypeColor(task.task_type);

  async function handleSubmit() {
    if (!proofText.trim()) return;
    setLoading(true);
    try {
      await fetch('/api/community/crowd-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit', task_id: task.id, proof_text: proofText, proof_url: proofUrl || undefined }),
      });
      setSuccess(true);
    } catch {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'flex-end' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 300 }}
        animate={{ y: 0 }}
        exit={{ y: 300 }}
        transition={{ type: 'spring', damping: 26, stiffness: 280 }}
        style={{ width: '100%', maxWidth: 600, margin: '0 auto', background: t.surface, borderRadius: '24px 24px 0 0', padding: '24px 20px 40px', border: `1px solid ${LINE}`, borderBottom: 'none', maxHeight: '80dvh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        {success ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '24px 0' }}>
            <CheckCircle2 size={48} style={{ color: t.accent }} />
            <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: t.txt }}>Contribution submitted!</p>
            <p style={{ margin: 0, fontSize: 13, color: t.txtDim }}>The community will review your work.</p>
            <button onClick={onClose} style={{ marginTop: 8, padding: '10px 24px', borderRadius: 12, background: t.card, border: `1px solid ${LINE}`, color: t.txt, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Close</button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 14 }}>{taskTypeIcon(task.task_type)}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '.06em' }}>{taskTypeLabel(task.task_type)}</span>
                </div>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: t.txt }}>{task.title}</p>
              </div>
              <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: '50%', background: t.card, border: `1px solid ${LINE}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                <X size={16} style={{ color: t.txtDim }} />
              </button>
            </div>

            {task.instructions && (
              <div style={{ padding: '12px 14px', borderRadius: 12, background: t.card, border: `1px solid ${LINE}`, marginBottom: 16 }}>
                <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '.06em' }}>Instructions</p>
                <p style={{ margin: 0, fontSize: 13, color: t.txtDim, lineHeight: 1.55 }}>{task.instructions}</p>
              </div>
            )}

            <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: t.txt }}>Your contribution</p>
            <textarea
              value={proofText}
              onChange={e => setProofText(e.target.value)}
              placeholder="Describe your contribution or paste your response here…"
              rows={4}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 12, background: t.card, border: `1px solid ${LINE}`, color: t.txt, fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.55 }}
            />

            <p style={{ margin: '12px 0 8px', fontSize: 13, fontWeight: 600, color: t.txtDim }}>Supporting URL (optional)</p>
            <input
              type="url"
              value={proofUrl}
              onChange={e => setProofUrl(e.target.value)}
              placeholder="https://…"
              style={{ width: '100%', padding: '12px 14px', borderRadius: 12, background: t.card, border: `1px solid ${LINE}`, color: t.txt, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            />

            <div style={{ margin: '14px 0 20px', padding: '12px 14px', borderRadius: 12, background: `${t.ai}0D`, border: `1px solid ${t.ai}22` }}>
              <p style={{ margin: 0, fontSize: 12, color: t.txtDim, lineHeight: 1.55 }}>
                Your submission will be reviewed by the community. <span style={{ color: t.ai, fontWeight: 600 }}>{task.validation_threshold} upvotes</span> validates it and triggers the <span style={{ color: t.accent, fontWeight: 600 }}>{task.reward_per_completion.toLocaleString()} pts</span> reward.
              </p>
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading || !proofText.trim()}
              style={{ width: '100%', padding: '15px', borderRadius: 14, background: color, border: 'none', color: t.bg, fontSize: 15, fontWeight: 800, cursor: loading || !proofText.trim() ? 'not-allowed' : 'pointer', opacity: loading || !proofText.trim() ? 0.6 : 1 }}
            >
              {loading ? 'Submitting…' : 'Submit Contribution'}
            </button>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

function PoolCard({ pool, index, onContribute }: { pool: CommunityPool; index: number; onContribute: () => void }) {
  const color = poolTypeColor(pool.pool_type);
  const pct = Math.min(100, (pool.current_amount / pool.target_amount) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      style={{ borderRadius: 18, background: t.card, border: `1px solid ${LINE}`, overflow: 'hidden', marginBottom: 12 }}
    >
      <div style={{ height: 4, background: color }} />
      <div style={{ padding: '14px 16px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: t.txt, flex: 1 }}>{pool.name}</p>
          <span style={{ fontSize: 10, fontWeight: 700, color, background: `${color}15`, border: `1px solid ${color}30`, borderRadius: 6, padding: '3px 8px', flexShrink: 0, textTransform: 'uppercase', letterSpacing: '.05em' }}>{poolTypeLabel(pool.pool_type)}</span>
        </div>
        <p style={{ margin: '0 0 14px', fontSize: 12, color: t.txtDim, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{pool.description}</p>

        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: t.txtDim }}>{pool.current_amount.toLocaleString()} / {pool.target_amount.toLocaleString()} pts contributed</span>
            <span style={{ fontSize: 11, fontWeight: 700, color }}>{Math.round(pct)}%</span>
          </div>
          <div style={{ height: 5, borderRadius: 3, background: t.surface }}>
            <div style={{ height: '100%', width: `${pct}%`, borderRadius: 3, background: color, transition: 'width .6s ease' }} />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
          <span style={{ fontSize: 11, color: t.txtDim, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Users size={11} style={{ color: t.txtFaint }} />{pool.contributors_count} contributors
          </span>
          <span style={{ fontSize: 11, color: t.txtDim, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Coins size={11} style={{ color: t.txtFaint }} />{pool.total_pool.toLocaleString()} pts to share
          </span>
          <span style={{ fontSize: 10, fontWeight: 700, color: t.txtFaint, background: t.surface, border: `1px solid ${LINE}`, borderRadius: 6, padding: '2px 7px' }}>{distLabel(pool.distribution_method)}</span>
        </div>

        {pool.closes_at && (
          <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Clock size={11} style={{ color: t.txtFaint }} />
            <span style={{ fontSize: 11, color: t.txtFaint }}>{deadlineCountdown(pool.closes_at)}</span>
          </div>
        )}

        <button
          onClick={onContribute}
          style={{ width: '100%', padding: '11px', borderRadius: 12, background: `${color}18`, border: `1px solid ${color}35`, color, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          <Plus size={14} /> Contribute
        </button>
      </div>
    </motion.div>
  );
}

function TaskCard({ task, index, onJoin }: { task: CrowdTask; index: number; onJoin: () => void }) {
  const color = taskTypeColor(task.task_type);
  const pct = Math.min(100, (task.current_completions / task.required_completions) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      style={{ borderRadius: 18, background: t.card, border: `1px solid ${LINE}`, overflow: 'hidden', marginBottom: 12 }}
    >
      <div style={{ padding: '14px 16px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}15`, border: `1px solid ${color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
            {taskTypeIcon(task.task_type)}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 800, color: t.txt }}>{task.title}</p>
            <span style={{ fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '.05em' }}>{taskTypeLabel(task.task_type)}</span>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: t.accent, lineHeight: 1 }}>{task.reward_per_completion.toLocaleString()}</p>
            <p style={{ margin: '2px 0 0', fontSize: 9, color: t.txtFaint, fontWeight: 600, textTransform: 'uppercase' }}>pts reward</p>
          </div>
        </div>

        <p style={{ margin: '0 0 12px', fontSize: 12, color: t.txtDim, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{task.description}</p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
          <span style={{ fontSize: 11, color: t.txtDim, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Users size={11} style={{ color: t.txtFaint }} />{task.current_participants} participants
          </span>
          <span style={{ fontSize: 11, color: t.txtDim, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={11} style={{ color: t.txtFaint }} />{deadlineCountdown(task.deadline)}
          </span>
        </div>

        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 11, color: t.txtDim }}>{task.current_completions}/{task.required_completions} completions needed</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: t.accent }}>{Math.round(pct)}%</span>
          </div>
          <div style={{ height: 4, borderRadius: 2, background: t.surface }}>
            <div style={{ height: '100%', width: `${pct}%`, borderRadius: 2, background: t.accent, transition: 'width .6s ease' }} />
          </div>
        </div>

        {task.pool && (
          <div style={{ marginBottom: 12, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 7, background: `${poolTypeColor(task.pool.pool_type)}10`, border: `1px solid ${poolTypeColor(task.pool.pool_type)}25` }}>
            <Target size={10} style={{ color: poolTypeColor(task.pool.pool_type) }} />
            <span style={{ fontSize: 10, fontWeight: 600, color: poolTypeColor(task.pool.pool_type) }}>{task.pool.name}</span>
          </div>
        )}

        <button
          onClick={onJoin}
          style={{ width: '100%', padding: '11px', borderRadius: 12, background: `${color}18`, border: `1px solid ${color}35`, color, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          <ChevronRight size={14} /> Join Task
        </button>
      </div>
    </motion.div>
  );
}

function LeaderboardTab({ onBrowseTasks }: { onBrowseTasks: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
      <div style={{ marginBottom: 20 }}>
        <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '.07em' }}>How Recognition Works</p>
        <div className="flex flex-col gap-3">
          {[
            { icon: <Plus size={18} style={{ color: t.accent }} />, title: 'Contribute', desc: 'Add points to community pools or complete crowd tasks', color: t.accent },
            { icon: <Star size={18} style={{ color: t.warning }} />, title: 'Get Upvoted', desc: 'Community members upvote quality contributions; trust-weighted votes count more', color: t.warning },
            { icon: <Award size={18} style={{ color: t.ai }} />, title: 'Earn Share', desc: 'When pools distribute, your share is calculated by weight: contribution × quality × timing × trust', color: t.ai },
          ].map((item, i) => (
            <motion.div key={item.title} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px', borderRadius: 16, background: t.card, border: `1px solid ${LINE}` }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: `${item.color}14`, border: `1px solid ${item.color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {item.icon}
              </div>
              <div>
                <p style={{ margin: '0 0 3px', fontSize: 13, fontWeight: 700, color: t.txt }}>{item.title}</p>
                <p style={{ margin: 0, fontSize: 12, color: t.txtDim, lineHeight: 1.5 }}>{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '.07em' }}>Example Distribution (Weighted)</p>
        <div style={{ borderRadius: 16, background: t.card, border: `1px solid ${LINE}`, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 72px 52px 52px', gap: 0, padding: '10px 14px', borderBottom: `1px solid ${LINE}` }}>
            {['#', 'Contributor', 'Contribution', 'Trust', 'Share'].map(h => (
              <span key={h} style={{ fontSize: 10, fontWeight: 700, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '.06em' }}>{h}</span>
            ))}
          </div>
          {LEADERBOARD_ROWS.map((row, i) => (
            <motion.div key={row.rank} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 + i * 0.06 }}
              style={{ display: 'grid', gridTemplateColumns: '36px 1fr 72px 52px 52px', gap: 0, padding: '12px 14px', borderBottom: i < LEADERBOARD_ROWS.length - 1 ? `1px solid ${LINE}` : 'none', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: i === 0 ? t.accent : i === 1 ? t.warning : i === 2 ? t.ai : t.txtDim }}>{row.rank}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: t.txt }}>{row.name}</span>
              <span style={{ fontSize: 12, color: t.txtDim }}>{row.contribution > 0 ? `${row.contribution} pts` : '…'}</span>
              <span style={{ fontSize: 12, color: row.trust >= 80 ? t.accent : row.trust >= 50 ? t.warning : t.error }}>{row.trust > 0 ? row.trust : '…'}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ height: 3, width: `${row.share * 1.4}px`, maxWidth: 42, borderRadius: 2, background: i === 0 ? t.accent : i === 1 ? t.warning : i === 2 ? t.ai : t.txtFaint }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: t.txt }}>{row.share}%</span>
              </div>
            </motion.div>
          ))}
        </div>
        <p style={{ margin: '10px 0 0', fontSize: 11, color: t.txtDim, lineHeight: 1.5, fontStyle: 'italic' }}>
          Quadratic distribution reduces inequality — switching to it would equalize the shares above.
        </p>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        style={{ padding: '18px', borderRadius: 18, background: `linear-gradient(135deg, ${t.ai}0A, ${t.accent}07)`, border: `1px solid ${t.ai}22`, marginBottom: 16 }}>
        <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: t.txt, display: 'flex', alignItems: 'center', gap: 7 }}>
          <Activity size={15} style={{ color: t.ai }} /> Your Impact
        </p>
        <p style={{ margin: '0 0 14px', fontSize: 12, color: t.txtDim, lineHeight: 1.55 }}>
          Complete crowd tasks to appear on community leaderboards. Your trust score determines the weight of your upvotes.
        </p>
        <button
          onClick={onBrowseTasks}
          style={{ padding: '10px 20px', borderRadius: 11, background: t.ai, border: 'none', color: t.txt, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Target size={13} /> Browse Tasks
        </button>
      </motion.div>
    </motion.div>
  );
}

export default function CommunityPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'pools' | 'tasks' | 'leaderboard'>('pools');
  const [pools, setPools] = useState<CommunityPool[]>([]);
  const [tasks, setTasks] = useState<CrowdTask[]>([]);
  const [loadingPools, setLoadingPools] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [contributePool, setContributePool] = useState<CommunityPool | null>(null);
  const [joinTask, setJoinTask] = useState<CrowdTask | null>(null);

  useEffect(() => {
    fetch('/api/community/pools')
      .then(r => r.json())
      .then((d: CommunityPool[]) => setPools(d))
      .catch(() => setPools([]))
      .finally(() => setLoadingPools(false));
    fetch('/api/community/crowd-tasks')
      .then(r => r.json())
      .then((d: CrowdTask[]) => setTasks(d))
      .catch(() => setTasks([]))
      .finally(() => setLoadingTasks(false));
  }, []);

  const openPools = pools.filter(p => p.status === 'open' || p.status === 'active');
  const openTasks = tasks.filter(tk => tk.status === 'open' || tk.status === 'in_progress');
  const ptsAvailable = openPools.reduce((s, p) => s + p.total_pool, 0);

  const STATS = [
    { label: 'Active Pools', value: openPools.length, icon: <Coins size={16} style={{ color: t.accent }} />, color: t.accent },
    { label: 'Open Tasks', value: openTasks.length, icon: <Zap size={16} style={{ color: t.warning }} />, color: t.warning },
    { label: 'Pts Available', value: ptsAvailable.toLocaleString(), icon: <TrendingUp size={16} style={{ color: t.ai }} />, color: t.ai },
  ];

  const TABS = [
    { key: 'pools', label: 'Pools', icon: <Coins size={14} /> },
    { key: 'tasks', label: 'Tasks', icon: <Globe size={14} /> },
    { key: 'leaderboard', label: 'Leaderboard', icon: <BarChart3 size={14} /> },
  ] as const;

  return (
    <main className="consumer-app" style={{ background: t.bg, minHeight: '100dvh', paddingBottom: '5.5rem', color: t.txt }}>

      <div style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(5,8,22,.94)', backdropFilter: 'blur(20px)', borderBottom: `1px solid ${LINE}`, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()} style={{ width: 36, height: 36, borderRadius: '50%', background: t.card, border: `1px solid ${LINE}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <ArrowLeft size={16} style={{ color: t.txt }} />
        </button>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 800, margin: 0, lineHeight: 1.2 }}>Community Exchange</h1>
          <p style={{ margin: 0, fontSize: 11, color: t.txtDim, lineHeight: 1.3 }}>Pool resources, complete crowd tasks, and earn recognition</p>
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 16px' }}>

        <div className="flex gap-3 overflow-x-auto" style={{ padding: '16px 0', scrollbarWidth: 'none' }}>
          {STATS.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              style={{ minWidth: 120, flex: '0 0 auto', padding: '13px 14px', borderRadius: 16, background: t.card, border: `1px solid ${LINE}`, textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>{s.icon}</div>
              <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</p>
              <p style={{ margin: '4px 0 0', fontSize: 10, color: t.txtFaint, fontWeight: 600 }}>{s.label}</p>
            </motion.div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 20, padding: '4px', borderRadius: 14, background: t.card, border: `1px solid ${LINE}` }}>
          {TABS.map(tb => (
            <button
              key={tb.key}
              onClick={() => setTab(tb.key)}
              style={{ flex: 1, padding: '9px 6px', borderRadius: 11, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, transition: 'all .18s', background: tab === tb.key ? t.surface : 'transparent', color: tab === tb.key ? t.txt : t.txtFaint, boxShadow: tab === tb.key ? `0 1px 6px rgba(0,0,0,.35)` : 'none' }}
            >
              <span style={{ color: tab === tb.key ? t.accent : t.txtFaint }}>{tb.icon}</span>
              {tb.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {tab === 'pools' && (
            <motion.div key="pools" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              {loadingPools ? (
                <div className="flex flex-col gap-3">
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ height: 200, borderRadius: 18, background: t.card, border: `1px solid ${LINE}`, opacity: 0.5 }} />
                  ))}
                </div>
              ) : openPools.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', borderRadius: 18, background: t.card, border: `1px solid ${LINE}` }}>
                  <Coins size={32} style={{ color: t.txtFaint, marginBottom: 10 }} />
                  <p style={{ margin: 0, fontSize: 14, color: t.txtDim }}>No active pools right now.</p>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: t.txtFaint }}>Check back soon for new community pools.</p>
                </div>
              ) : (
                openPools.map((pool, i) => (
                  <PoolCard key={pool.id} pool={pool} index={i} onContribute={() => setContributePool(pool)} />
                ))
              )}
            </motion.div>
          )}

          {tab === 'tasks' && (
            <motion.div key="tasks" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              {loadingTasks ? (
                <div className="flex flex-col gap-3">
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ height: 200, borderRadius: 18, background: t.card, border: `1px solid ${LINE}`, opacity: 0.5 }} />
                  ))}
                </div>
              ) : openTasks.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', borderRadius: 18, background: t.card, border: `1px solid ${LINE}` }}>
                  <Brain size={32} style={{ color: t.txtFaint, marginBottom: 10 }} />
                  <p style={{ margin: 0, fontSize: 14, color: t.txtDim }}>No open tasks right now.</p>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: t.txtFaint }}>New crowd tasks are posted regularly.</p>
                </div>
              ) : (
                openTasks.map((task, i) => (
                  <TaskCard key={task.id} task={task} index={i} onJoin={() => setJoinTask(task)} />
                ))
              )}
            </motion.div>
          )}

          {tab === 'leaderboard' && (
            <motion.div key="leaderboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <LeaderboardTab onBrowseTasks={() => setTab('tasks')} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {contributePool && (
          <ContributeDrawer pool={contributePool} onClose={() => setContributePool(null)} />
        )}
        {joinTask && (
          <SubmitDrawer task={joinTask} onClose={() => setJoinTask(null)} />
        )}
      </AnimatePresence>

      <BottomNav />
    </main>
  );
}
