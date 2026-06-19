'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/context';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, CheckCircle2, Award, BarChart3, Users, ArrowUpRight,
  Search, FileCheck, Sparkles, ChevronRight, RefreshCw, Bot,
  Globe, Target, AlertTriangle, ShieldCheck, Flame, Zap, Activity
} from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/cn';
import { CATEGORY_MAP, SDG_META } from '@/lib/missionCategories';
import { t } from '@/theme/colors';
import type { DbOutcomeValidation, DbMissionScore } from '@/lib/supabase/types';

/* ── Types ───────────────────────────────────────────────────────────────── */

type MissionHealth = 'healthy' | 'at-risk' | 'critical' | 'inactive';

interface MissionRow {
  id: string;
  title: string;
  tags: string[];
  status: string;
  difficulty: string;
  stepCount: number;
  completions: number;
  participants: number;
  completionRate: number;
  health: MissionHealth;
  sdgs: number[];
  score?: { mei: number; completion_score: number; engagement_score: number; retention_score: number; outcome_score: number };
}

interface CategoryContrib {
  catId: string;
  count: number;
  label: string;
  emoji: string;
  color: string;
  sdgs: number[];
}

interface Summary {
  totalMissions: number;
  avgMei: number;
  totalParticipants: number;
  totalCompletions: number;
  overallCompletionRate: number;
  sdgReach: number;
  topCategories: CategoryContrib[];
}

/* ── Constants ───────────────────────────────────────────────────────────── */

const HEALTH_CONFIG: Record<MissionHealth, { label: string; clr: string; bg: string; border: string; glow: string }> = {
  healthy:  { label: 'Healthy',  clr: t.accent,   bg: 'bg-[var(--t-accent)]/10', border: 'border-[var(--t-accent)]/20', glow: t.accent   },
  'at-risk':{ label: 'At Risk',  clr: t.warning,  bg: 'bg-[var(--t-warn)]/10',   border: 'border-[var(--t-warn)]/20',   glow: t.warning  },
  critical: { label: 'Critical', clr: t.error,    bg: 'bg-[var(--t-err)]/10',    border: 'border-[var(--t-err)]/20',    glow: t.error    },
  inactive: { label: 'Inactive', clr: t.txtFaint, bg: 'bg-[var(--t-faint)]/10',  border: 'border-[var(--t-faint)]/20',  glow: t.txtFaint },
};

const VALIDATION_STATUS = {
  pending:           { label: 'Pending',        clr: t.warning, bg: 'bg-[var(--t-warn)]/10'   },
  under_review:      { label: 'Under Review',   clr: t.ai,      bg: 'bg-[var(--t-ai)]/10'     },
  approved:          { label: 'Approved',       clr: t.accent,  bg: 'bg-[var(--t-accent)]/10' },
  rejected:          { label: 'Rejected',       clr: t.error,   bg: 'bg-[var(--t-err)]/10'    },
  requires_evidence: { label: 'Needs Evidence', clr: t.warning, bg: 'bg-[var(--t-warn)]/10'   },
};

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('bg-[var(--t-elev)] animate-pulse rounded-lg', className)} />;
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default function OutcomesPage() {
  const [missions, setMissions]         = useState<MissionRow[]>([]);
  const [summary, setSummary]           = useState<Summary | null>(null);
  const [validations, setValidations]   = useState<DbOutcomeValidation[]>([]);
  const [scores, setScores]             = useState<DbMissionScore[]>([]);
  const [rewardConversion, setRewConv]  = useState(0);
  const [loading, setLoading]           = useState(true);
  const [narrative, setNarrative]       = useState('');
  const [generating, setGenerating]     = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [missionSearch, setSearch]      = useState('');
  const { user, isLoaded } = useAuth();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      if (!isLoaded || !user) return;
      const { data: profile } = await supabase.from('user_profiles').select('tenant_id').eq('id', user.id).single();
      if (!profile?.tenant_id) { setLoading(false); return; }

      const [intelRes, validationRes, scoresRes, rewardRes] = await Promise.all([
        fetch('/api/outcomes/intelligence'),
        supabase.from('outcome_validations').select('*').eq('tenant_id', profile.tenant_id).order('created_at', { ascending: false }).limit(50),
        supabase.from('mission_scores').select('*').eq('tenant_id', profile.tenant_id),
        supabase.from('reward_events').select('id, redeemed').eq('tenant_id', profile.tenant_id),
      ]);

      if (intelRes.ok) {
        const intel = await intelRes.json() as { missions: MissionRow[]; summary: Summary };
        setMissions(intel.missions);
        setSummary(intel.summary);
      }

      setValidations(validationRes.data ?? []);
      setScores(scoresRes.data ?? []);

      const rewards = rewardRes.data ?? [];
      const redeemed = rewards.filter((r: { redeemed: boolean }) => r.redeemed).length;
      setRewConv(rewards.length > 0 ? Math.round((redeemed / rewards.length) * 100) : 0);
      setLoading(false);
    }
    load();
  }, [supabase, user, isLoaded]);

  async function generateNarrative() {
    if (!summary) return;
    setGenerating(true);
    setNarrative('');
    try {
      const res = await fetch('/api/agents/behavioral-analyst', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: `Organisation Outcome Report: ${summary.totalMissions} missions active. Average MEI: ${summary.avgMei}. Total participants: ${summary.totalParticipants}. Completion rate: ${summary.overallCompletionRate}%. SDG goals reached: ${summary.sdgReach}. Top impact areas: ${summary.topCategories.slice(0, 3).map((c) => c.label).join(', ')}. Healthy missions: ${missions.filter((m) => m.health === 'healthy').length}. At-risk: ${missions.filter((m) => m.health === 'at-risk').length}. Critical: ${missions.filter((m) => m.health === 'critical').length}.`,
        }),
      });
      const json = await res.json() as { content?: string; message?: string };
      setNarrative((json.content ?? json.message ?? '').slice(0, 600) || 'Your missions are generating meaningful impact across multiple SDG categories. Continue scaling active missions to increase reach.');
    } catch {
      setNarrative('Your missions are generating meaningful impact. Review the MEI breakdown and SDG contributions above to identify growth opportunities.');
    }
    setGenerating(false);
  }

  const filtered = validations.filter((v) => statusFilter === 'all' || v.status === statusFilter);
  const filteredMissions = missions.filter((m) => !missionSearch || m.title.toLowerCase().includes(missionSearch.toLowerCase()));

  const outcomeHealth = summary
    ? Math.round(summary.overallCompletionRate * 0.4 + (summary.avgMei > 0 ? summary.avgMei * 0.4 : 0) + Math.min(summary.sdgReach * 3, 20))
    : 0;

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-8 w-72" />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="col-span-2 h-80 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-[1400px]">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--t-ai)]/10 border border-[var(--t-ai)]/20 flex items-center justify-center">
            <TrendingUp size={18} style={{ color: t.ai }} strokeWidth={1.8} />
          </div>
          <div>
            <h1 className="text-[22px] font-bold" style={{ color: t.txt }}>Outcome Intelligence</h1>
            <p className="text-[12px]" style={{ color: t.txtFaint }}>{summary?.totalMissions ?? 0} missions · {summary?.sdgReach ?? 0} SDG goals · {summary?.totalParticipants ?? 0} participants</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/outcomes/validation">
            <button className="flex items-center gap-2 h-9 px-4 bg-[var(--t-card)] border border-[var(--t-elev)] rounded-xl font-medium text-[13px] hover:border-[var(--t-ai)]/40 transition-colors" style={{ color: t.txt }}>
              <FileCheck size={14} strokeWidth={2} />
              Validation Queue
              {validations.filter((v) => v.status === 'pending').length > 0 && (
                <span className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center" style={{ background: t.warning, color: t.bg }}>
                  {validations.filter((v) => v.status === 'pending').length}
                </span>
              )}
            </button>
          </Link>
          <button
            onClick={generateNarrative}
            disabled={generating}
            className="flex items-center gap-2 h-9 px-4 bg-[var(--t-ai)]/10 border border-[var(--t-ai)]/25 rounded-xl font-medium text-[13px] hover:bg-[var(--t-ai)]/15 transition-colors disabled:opacity-60"
            style={{ color: t.aiLight }}
          >
            {generating
              ? <><RefreshCw size={13} strokeWidth={2} className="animate-spin" /> Generating…</>
              : <><Sparkles size={13} strokeWidth={2} /> Impact Report</>}
          </button>
        </div>
      </div>

      {/* ── AI Narrative ── */}
      <AnimatePresence>
        {narrative && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-gradient-to-r from-[var(--t-bg)] to-[var(--t-card)] border border-[var(--t-ai)]/22 rounded-2xl p-5 flex gap-4"
          >
            <div className="w-9 h-9 rounded-xl bg-[var(--t-ai)]/15 border border-[var(--t-ai)]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Bot size={16} style={{ color: t.aiLight }} strokeWidth={1.8} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: t.ai }}>AI Impact Analysis</p>
              <p className="text-[13px] leading-relaxed" style={{ color: t.txtDim }}>{narrative}</p>
            </div>
            <button onClick={() => setNarrative('')} className="text-[11px] flex-shrink-0 mt-1" style={{ color: t.txtFaint }}>✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── KPI Grid ── */}
      <div className="grid grid-cols-3 gap-4 lg:grid-cols-6">
        {[
          { label: 'Active Missions',     value: summary?.totalMissions ?? 0,           icon: Target,      clr: t.accent,  bg: 'bg-[var(--t-accent)]/8', suffix: '' },
          { label: 'Avg MEI Score',        value: summary?.avgMei ?? 0,                  icon: BarChart3,   clr: t.ai,      bg: 'bg-[var(--t-ai)]/10',    suffix: '' },
          { label: 'Completion Rate',      value: summary?.overallCompletionRate ?? 0,   icon: CheckCircle2,clr: t.accent,  bg: 'bg-[var(--t-accent)]/8', suffix: '%' },
          { label: 'SDG Goals Reached',    value: summary?.sdgReach ?? 0,               icon: Globe,       clr: t.info,    bg: 'bg-[var(--t-info)]/10',  suffix: '' },
          { label: 'Total Participants',   value: summary?.totalParticipants ?? 0,       icon: Users,       clr: t.warning, bg: 'bg-[var(--t-warn)]/10',  suffix: '' },
          { label: 'Reward Conversion',    value: rewardConversion,                      icon: Award,       clr: t.txt,     bg: 'bg-[var(--t-elev)]',     suffix: '%' },
        ].map(({ label, value, icon: Icon, clr, bg, suffix }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-[var(--t-card)] border border-[var(--t-elev)] rounded-2xl p-4 col-span-1"
          >
            <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center mb-3', bg)}>
              <Icon size={15} style={{ color: clr }} strokeWidth={1.8} />
            </div>
            <p className="text-[22px] font-bold tabular-nums leading-none mb-0.5" style={{ color: clr }}>
              {value.toLocaleString()}{suffix}
            </p>
            <p className="text-[11px] font-medium" style={{ color: t.txtFaint }}>{label}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Mission Leaderboard + SDG Grid ── */}
      <div className="grid grid-cols-3 gap-4">

        {/* Mission Effectiveness Leaderboard */}
        <div className="col-span-2 bg-[var(--t-card)] border border-[var(--t-elev)] rounded-2xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--t-elev)]">
            <div className="flex items-center gap-2">
              <Activity size={14} style={{ color: t.accent }} strokeWidth={2} />
              <p className="text-[13px] font-bold" style={{ color: t.txt }}>Mission Effectiveness Index</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold bg-[var(--t-accent)]/10 px-2.5 py-1 rounded-full" style={{ color: t.accent }}>
                Avg {summary?.avgMei ?? 0}
              </span>
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: t.txtFaint }} />
                <input
                  value={missionSearch}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter missions…"
                  className="h-7 pl-7 pr-2.5 w-36 bg-[var(--t-surface)] border border-[var(--t-elev)] rounded-lg text-[11px] focus:outline-none"
                  style={{ color: t.txt }}
                />
              </div>
            </div>
          </div>

          {/* Table header */}
          <div className="grid px-5 py-2.5 border-b border-[var(--t-elev)] bg-[var(--t-surface)]"
            style={{ gridTemplateColumns: '2fr 1fr 80px 70px 60px' }}>
            {['Mission', 'Health', 'MEI', 'Completion', 'Participants'].map((h) => (
              <p key={h} className="text-[10px] font-bold uppercase tracking-wider" style={{ color: t.txtFaint }}>{h}</p>
            ))}
          </div>

          {filteredMissions.length === 0 ? (
            <div className="py-12 text-center flex-1">
              <BarChart3 size={24} className="mx-auto mb-2" style={{ color: t.txtFaint }} strokeWidth={1.5} />
              <p className="font-medium" style={{ color: t.txtDim }}>No missions yet</p>
              <p className="text-sm mt-1" style={{ color: t.txtFaint }}>MEI scores appear once participants complete missions.</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--t-elev)] overflow-y-auto max-h-[360px]">
              {filteredMissions.map((m, i) => {
                const h = HEALTH_CONFIG[m.health];
                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="grid px-5 py-3 items-center hover:bg-[var(--t-elev)] transition-colors"
                    style={{ gridTemplateColumns: '2fr 1fr 80px 70px 60px' }}
                  >
                    <div className="pr-3 min-w-0">
                      <p className="text-[12.5px] font-semibold truncate" style={{ color: t.txt }}>{m.title}</p>
                      <p className="text-[10.5px] mt-0.5" style={{ color: t.txtFaint }}>{m.stepCount} steps · {m.difficulty}</p>
                    </div>
                    <span className={cn('inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full w-fit border', h.bg, h.border)} style={{ color: h.clr }}>
                      <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: h.clr }} />{h.label}
                    </span>
                    <p className="text-[13px] font-bold tabular-nums"
                      style={{ color: (m.score?.mei ?? 0) >= 70 ? t.accent : (m.score?.mei ?? 0) >= 40 ? t.warning : m.score ? t.error : t.txtFaint }}>
                      {m.score?.mei ?? '—'}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <div className="w-8 h-1 bg-[var(--t-elev)] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${m.completionRate}%`, backgroundColor: h.glow }} />
                      </div>
                      <span className="text-[10px] font-bold tabular-nums" style={{ color: h.glow }}>{m.completionRate}%</span>
                    </div>
                    <p className="text-[12px] tabular-nums" style={{ color: t.txtDim }}>{m.participants}</p>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* SDG Impact Breakdown */}
        <div className="bg-[var(--t-card)] border border-[var(--t-elev)] rounded-2xl p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <Globe size={14} style={{ color: t.info }} strokeWidth={2} />
            <p className="text-[13px] font-bold" style={{ color: t.txt }}>SDG Impact Areas</p>
            <span className="ml-auto text-[11px] font-bold bg-[var(--t-info)]/10 px-2 py-0.5 rounded-full" style={{ color: t.info }}>
              {summary?.sdgReach ?? 0} goals
            </span>
          </div>

          {(summary?.topCategories ?? []).length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-center py-8">
              <div>
                <Globe size={24} className="mx-auto mb-2" style={{ color: t.txtFaint }} strokeWidth={1.5} />
                <p className="text-[12px]" style={{ color: t.txtDim }}>Add tags to missions to track SDG impact</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 space-y-3 overflow-y-auto">
              {(summary?.topCategories ?? []).map(({ catId, count, label, emoji, color }, i) => {
                const cat = CATEGORY_MAP.get(catId);
                const maxCount = summary!.topCategories[0]?.count ?? 1;
                return (
                  <motion.div
                    key={catId}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.06 }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px]">{emoji}</span>
                        <span className="text-[12px] font-semibold" style={{ color: t.txt }}>{label}</span>
                      </div>
                      <span className="text-[11px] font-bold" style={{ color }}>{count}</span>
                    </div>
                    <div className="h-1.5 bg-[var(--t-elev)] rounded-full overflow-hidden mb-1.5">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.round((count / maxCount) * 100)}%` }}
                        transition={{ duration: 0.6, delay: 0.2 + i * 0.06 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: color }}
                      />
                    </div>
                    {cat && cat.sdgs.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {cat.sdgs.slice(0, 4).map((sdg) => {
                          const meta = SDG_META[sdg as keyof typeof SDG_META];
                          return meta ? (
                            <span key={sdg} className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${meta.color}18`, color: meta.color, border: `1px solid ${meta.color}30` }}>
                              SDG {sdg}
                            </span>
                          ) : null;
                        })}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Outcome Health + MEI Breakdown ── */}
      <div className="grid grid-cols-3 gap-4">

        {/* Outcome Health Gauge */}
        <div className="bg-[var(--t-card)] border border-[var(--t-elev)] rounded-2xl p-5">
          <p className="text-[11px] font-bold uppercase tracking-wider mb-4" style={{ color: t.txtFaint }}>Portfolio Health</p>
          <div className="flex items-center justify-center mb-5">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke={t.panel} strokeWidth="8" />
                <circle
                  cx="50" cy="50" r="40" fill="none"
                  stroke={outcomeHealth >= 70 ? t.accent : outcomeHealth >= 40 ? t.warning : t.error}
                  strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - Math.min(outcomeHealth, 100) / 100)}`}
                  style={{ transition: 'stroke-dashoffset 1s ease' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold" style={{ color: outcomeHealth >= 70 ? t.accent : outcomeHealth >= 40 ? t.warning : t.error }}>
                  {outcomeHealth}
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: t.txtFaint }}>Score</span>
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            {[
              { label: 'Completion',   value: summary?.overallCompletionRate ?? 0,                   color: t.accent  },
              { label: 'Avg MEI',      value: summary?.avgMei ?? 0,                                  color: t.ai      },
              { label: 'SDG Reach',    value: Math.min((summary?.sdgReach ?? 0) * 6, 100),           color: t.info,    display: `${summary?.sdgReach ?? 0} goals` },
              { label: 'Reward Conv.', value: rewardConversion,                                      color: t.warning },
            ].map(({ label, value, color, display }) => (
              <div key={label}>
                <div className="flex justify-between text-[11px] mb-1">
                  <span style={{ color: t.txtDim }}>{label}</span>
                  <span className="font-bold tabular-nums" style={{ color }}>{display ?? `${value}%`}</span>
                </div>
                <div className="h-1.5 bg-[var(--t-elev)] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${value}%` }}
                    transition={{ delay: 0.4, duration: 0.8 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Per-mission MEI Breakdown */}
        <div className="col-span-2 bg-[var(--t-card)] border border-[var(--t-elev)] rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-[var(--t-elev)]">
            <BarChart3 size={14} style={{ color: t.ai }} strokeWidth={2} />
            <p className="text-[13px] font-bold" style={{ color: t.txt }}>MEI Component Breakdown</p>
          </div>
          {scores.length === 0 ? (
            <div className="py-14 text-center">
              <BarChart3 size={24} className="mx-auto mb-2" style={{ color: t.txtFaint }} strokeWidth={1.5} />
              <p className="font-medium" style={{ color: t.txtDim }}>No MEI data yet</p>
              <p className="text-sm mt-1" style={{ color: t.txtFaint }}>MEI scores compute once participants complete missions.</p>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {missions.filter((m) => m.score).slice(0, 6).map((m, i) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[12px] font-medium truncate max-w-[240px]" style={{ color: t.txtDim }}>{m.title}</p>
                    <p className="text-[12px] font-bold tabular-nums ml-2 flex-shrink-0"
                      style={{ color: (m.score?.mei ?? 0) >= 70 ? t.accent : (m.score?.mei ?? 0) >= 40 ? t.warning : t.error }}>MEI {m.score?.mei}</p>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {[
                      { v: m.score!.completion_score, c: t.accent,  l: 'Completion' },
                      { v: m.score!.engagement_score, c: t.ai,      l: 'Engagement' },
                      { v: m.score!.retention_score,  c: t.warning, l: 'Retention' },
                      { v: m.score!.outcome_score,    c: t.txt,     l: 'Outcome' },
                    ].map(({ v, c, l }) => (
                      <div key={l}>
                        <div className="flex justify-between text-[9.5px] mb-0.5">
                          <span style={{ color: t.txtFaint }}>{l}</span>
                          <span style={{ color: c }}>{v ?? 0}</span>
                        </div>
                        <div className="h-1.5 bg-[var(--t-elev)] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${v ?? 0}%`, backgroundColor: c }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Validation Queue ── */}
      <div className="bg-[var(--t-card)] border border-[var(--t-elev)] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--t-elev)]">
          <div className="flex items-center gap-2">
            <FileCheck size={14} style={{ color: t.ai }} strokeWidth={2} />
            <p className="text-[13px] font-bold" style={{ color: t.txt }}>Outcome Validations</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-[var(--t-surface)] border border-[var(--t-elev)] rounded-xl p-1">
              {['all', 'pending', 'under_review', 'approved', 'rejected'].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={cn('px-2.5 h-6 rounded-lg text-[10px] font-semibold transition-all capitalize',
                    statusFilter === s ? 'bg-[var(--t-elev)]' : ''
                  )}
                  style={{ color: statusFilter === s ? t.txt : t.txtFaint }}
                >{s.replace('_', ' ')}</button>
              ))}
            </div>
            <Link href="/admin/outcomes/validation">
              <button className="text-[11px] font-semibold text-accent flex items-center gap-1 hover:opacity-80 transition-opacity">
                Manage <ChevronRight size={11} strokeWidth={2} />
              </button>
            </Link>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-12 text-center">
            <ShieldCheck size={24} className="mx-auto mb-2" style={{ color: t.txtFaint }} strokeWidth={1.5} />
            <p className="font-medium" style={{ color: t.txtDim }}>No validations</p>
            <p className="text-sm mt-1" style={{ color: t.txtFaint }}>Outcome validations appear as participants submit evidence.</p>
          </div>
        ) : (
          <>
            <div className="grid px-5 py-3 border-b border-[var(--t-elev)] bg-[var(--t-surface)]"
              style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr 100px' }}>
              {['Outcome', 'Type', 'Confidence', 'Submitted', 'Status'].map((h) => (
                <p key={h} className="text-[10px] font-bold uppercase tracking-wider" style={{ color: t.txtFaint }}>{h}</p>
              ))}
            </div>
            <div className="divide-y divide-[var(--t-elev)]">
              {filtered.slice(0, 10).map((v) => {
                const sc = VALIDATION_STATUS[v.status as keyof typeof VALIDATION_STATUS] ?? VALIDATION_STATUS.pending;
                return (
                  <div key={v.id} className="grid px-5 py-3.5 items-center hover:bg-[var(--t-elev)] transition-colors"
                    style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr 100px' }}>
                    <p className="text-[12px] font-medium truncate pr-4" style={{ color: t.txt }}>Outcome #{v.id.slice(0, 8)}</p>
                    <span className="text-[11px] capitalize" style={{ color: t.txtDim }}>{v.validation_type.replace('_', ' ')}</span>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-[var(--t-elev)] rounded-full overflow-hidden max-w-[60px]">
                        <div className="h-full rounded-full" style={{ width: `${(v.confidence_score ?? 0) * 100}%`, background: t.accent }} />
                      </div>
                      <span className="text-[11px] tabular-nums" style={{ color: t.txtDim }}>{Math.round((v.confidence_score ?? 0) * 100)}%</span>
                    </div>
                    <p className="text-[11px]" style={{ color: t.txtFaint }}>
                      {new Date(v.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                    <span className={cn('text-[11px] font-bold px-2 py-0.5 rounded-full w-fit', sc.bg)} style={{ color: sc.clr }}>
                      {sc.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
