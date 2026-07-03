'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Radar, Search, ChevronRight, Sparkles, AlertTriangle, CheckCircle2,
  Plus, SlidersHorizontal, Bot, TrendingDown, ShieldCheck, Flame
} from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/context';
import { cn } from '@/lib/cn';
import { t } from '@/theme/colors';
import type { DbMission, DbMissionScore } from '@/lib/supabase/types';

type StatusFilter = 'all' | 'active' | 'draft' | 'paused' | 'archived';
type MissionHealth = 'healthy' | 'at-risk' | 'critical' | 'inactive';

interface MissionRow extends DbMission {
  score?: DbMissionScore;
  completions: number;
  participants: number;
  health: MissionHealth;
  completionRate: number;
  dropOffStep: { stepIdx: number; count: number } | null;
}

interface IntelPanel {
  missionId: string;
  title: string;
  analysis: string;
  rewardEffective: boolean;
  recommendation: string;
  loading: boolean;
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg', className)} style={{ background: t.panel }} />;
}

const STATUS_CONFIG = {
  active:    { label: 'Active',    color: t.accent,   bg: 'rgba(34,255,170,0.1)',  dot: t.accent },
  draft:     { label: 'Draft',     color: t.warning,  bg: 'rgba(255,184,77,0.1)',  dot: t.warning },
  paused:    { label: 'Paused',    color: t.txtDim,   bg: 'rgba(139,156,192,0.1)', dot: t.txtDim },
  archived:  { label: 'Archived',  color: t.txtFaint, bg: 'rgba(74,85,120,0.1)',   dot: t.txtFaint },
  published: { label: 'Published', color: t.accent,   bg: 'rgba(34,255,170,0.1)',  dot: t.accent },
};

const HEALTH_CONFIG: Record<MissionHealth, {
  label: string; color: string; bg: string; border: string; dot: string; glow: string;
}> = {
  healthy:  { label: 'Healthy',  color: t.accent,   bg: 'rgba(34,255,170,0.1)',  border: 'rgba(34,255,170,0.2)',  dot: t.accent,   glow: t.accent },
  'at-risk':{ label: 'At Risk',  color: t.warning,  bg: 'rgba(255,184,77,0.1)',  border: 'rgba(255,184,77,0.2)',  dot: t.warning,  glow: t.warning },
  critical: { label: 'Critical', color: t.error,    bg: 'rgba(255,92,122,0.1)',  border: 'rgba(255,92,122,0.2)',  dot: t.error,    glow: t.error },
  inactive: { label: 'Inactive', color: t.txtFaint, bg: 'rgba(74,85,120,0.1)',   border: 'rgba(74,85,120,0.2)',   dot: t.txtFaint, glow: t.txtFaint },
};

const DIFF_CONFIG = {
  easy:   { label: 'Easy',   color: t.accent },
  medium: { label: 'Medium', color: t.warning },
  hard:   { label: 'Hard',   color: t.error },
};

function computeHealth(m: { status: string; participants: number; completions: number; score?: DbMissionScore }): MissionHealth {
  const isActive = m.status === 'active' || m.status === 'published';
  if (!isActive) return 'inactive';
  if (m.participants === 0) return 'critical';
  const rate = m.completions / m.participants;
  const mei  = m.score?.mei ?? 0;
  if (mei >= 65 && rate >= 0.5) return 'healthy';
  if (mei >= 35 || rate >= 0.25) return 'at-risk';
  return 'critical';
}

export default function MissionControlPage() {
  const [missions, setMissions] = useState<MissionRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState<StatusFilter>('all');
  const [search, setSearch]     = useState('');
  const [selected, setSelected] = useState<MissionRow | null>(null);
  const [intel, setIntel]       = useState<IntelPanel | null>(null);
  const { user, isLoaded } = useAuth();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      if (!isLoaded || !user) return;

      const { data: profile } = await supabase
        .from('user_profiles').select('tenant_id').eq('id', user.id).single();
      if (!profile?.tenant_id) { setLoading(false); return; }

      const [missionsRes, scoresRes, progressRes] = await Promise.all([
        supabase.from('missions').select('*').eq('tenant_id', profile.tenant_id).order('updated_at', { ascending: false }),
        supabase.from('mission_scores').select('*').eq('tenant_id', profile.tenant_id),
        supabase.from('mission_progress')
          .select('mission_id, user_id, completed_at, current_step_index')
          .eq('tenant_id', profile.tenant_id),
      ]);

      const scoreMap: Record<string, DbMissionScore> = {};
      (scoresRes.data ?? []).forEach((s) => { scoreMap[s.mission_id] = s; });

      const completionMap:  Record<string, number>       = {};
      const participantMap: Record<string, Set<string>>  = {};
      const dropOffMap:     Record<string, Record<number, number>> = {};

      (progressRes.data ?? []).forEach((p) => {
        if (p.completed_at) completionMap[p.mission_id] = (completionMap[p.mission_id] ?? 0) + 1;
        if (!participantMap[p.mission_id]) participantMap[p.mission_id] = new Set();
        participantMap[p.mission_id].add(p.user_id);
        // users stuck mid-mission: track which step index they're blocked on
        if (!p.completed_at && (p.current_step_index ?? 0) > 0) {
          if (!dropOffMap[p.mission_id]) dropOffMap[p.mission_id] = {};
          const idx = p.current_step_index ?? 0;
          dropOffMap[p.mission_id][idx] = (dropOffMap[p.mission_id][idx] ?? 0) + 1;
        }
      });

      setMissions(
        (missionsRes.data ?? []).map((m) => {
          const completions = completionMap[m.id] ?? 0;
          const participants = participantMap[m.id]?.size ?? 0;
          const score = scoreMap[m.id];
          const health = computeHealth({ status: m.status, participants, completions, score });
          const completionRate = participants > 0 ? completions / participants : 0;

          let dropOffStep: { stepIdx: number; count: number } | null = null;
          const drops = dropOffMap[m.id];
          if (drops) {
            let maxCount = 0, maxIdx = -1;
            for (const [idx, count] of Object.entries(drops)) {
              if (count > maxCount) { maxCount = count; maxIdx = parseInt(idx); }
            }
            if (maxIdx >= 0 && maxCount >= 2) dropOffStep = { stepIdx: maxIdx, count: maxCount };
          }

          return { ...m, score, completions, participants, health, completionRate, dropOffStep };
        })
      );
      setLoading(false);
    }
    load();
  }, [supabase, user, isLoaded]);

  async function loadIntel(mission: MissionRow) {
    setSelected(mission);
    setIntel({ missionId: mission.id, title: mission.title, analysis: '', rewardEffective: true, recommendation: '', loading: true });
    try {
      const res = await fetch('/api/agents/behavioral-analyst', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: `Mission: "${mission.title}". Steps: ${(mission.steps as unknown[]).length}. Completions: ${mission.completions}. Participants: ${mission.participants}. MEI: ${mission.score?.mei ?? 'N/A'}. Health: ${mission.health}. Completion rate: ${Math.round(mission.completionRate * 100)}%.`,
        }),
      });
      const json = await res.json();
      const text: string = json.content ?? json.message ?? '';
      setIntel({
        missionId: mission.id, title: mission.title,
        analysis: text.slice(0, 350) || `"${mission.title}" has ${mission.completions} completions from ${mission.participants} participants.`,
        rewardEffective: mission.completions > 3,
        recommendation: mission.completions < 3
          ? 'Simplify early steps and add motivational checkpoints to reduce abandonment.'
          : 'Expand to a larger audience segment to maximise impact.',
        loading: false,
      });
    } catch {
      setIntel({
        missionId: mission.id, title: mission.title,
        analysis: `"${mission.title}" — ${mission.participants} participants, ${mission.completions} completions. Health: ${mission.health}. MEI: ${mission.score?.mei ?? 0}.`,
        rewardEffective: true,
        recommendation: 'Review step difficulty and reward alignment.',
        loading: false,
      });
    }
  }

  const filtered = missions.filter((m) => {
    if (filter !== 'all' && m.status !== filter) return false;
    if (search && !m.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = {
    all:      missions.length,
    active:   missions.filter((m) => m.status === 'active').length,
    draft:    missions.filter((m) => m.status === 'draft').length,
    paused:   missions.filter((m) => m.status === 'paused').length,
    archived: missions.filter((m) => m.status === 'archived').length,
  };

  const healthCounts = {
    healthy:  missions.filter((m) => m.health === 'healthy').length,
    'at-risk':missions.filter((m) => m.health === 'at-risk').length,
    critical: missions.filter((m) => m.health === 'critical').length,
  };

  const criticalActive = missions.filter((m) => m.health === 'critical' && (m.status === 'active' || m.status === 'published'));

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-10 w-80" />
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <Skeleton className="h-[400px] rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-8 h-full flex flex-col gap-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
            <Radar size={18} className="text-accent" strokeWidth={1.8} />
          </div>
          <div>
            <h1 className="text-[22px] font-bold" style={{ color: t.txt }}>Mission Control</h1>
            <p className="text-[12px]" style={{ color: t.txtFaint }}>{missions.length} missions · {counts.active} active</p>
          </div>
        </div>
        <Link href="/workspace/missions/new">
          <button className="flex items-center gap-2 h-9 px-4 bg-accent rounded-xl font-semibold text-[13px] shadow-[0_4px_16px_rgba(34,255,170,0.25)]" style={{ color: '#060a0e' }}>
            <Plus size={14} strokeWidth={2.5} />
            New Mission
          </button>
        </Link>
      </div>

      {/* ── Health Summary ── */}
      <div className="grid grid-cols-3 gap-3">
        {([
          { key: 'healthy'  as const, label: 'Healthy',  Icon: ShieldCheck,    accent: t.accent,  desc: 'MEI ≥ 65 · Completion ≥ 50%' },
          { key: 'at-risk'  as const, label: 'At Risk',  Icon: AlertTriangle,  accent: t.warning, desc: 'MEI 35–64 or low completion' },
          { key: 'critical' as const, label: 'Critical', Icon: Flame,          accent: t.error,   desc: 'MEI < 35 · Needs attention' },
        ]).map(({ key, label, Icon, accent, desc }, i) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="rounded-xl p-4 flex items-center gap-3"
            style={{
              background: t.card,
              border: `1px solid ${t.panel}`,
              boxShadow: healthCounts[key] > 0 ? `0 0 24px ${accent}0F` : undefined,
            }}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${accent}14`, border: `1px solid ${accent}28` }}>
              <Icon size={16} strokeWidth={2} style={{ color: accent }} />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-[26px] font-black leading-none" style={{ color: accent }}>
                  {healthCounts[key]}
                </span>
                <span className="text-[13px] font-semibold" style={{ color: t.txt }}>{label}</span>
              </div>
              <p className="text-[10.5px] mt-0.5 truncate" style={{ color: t.txtFaint }}>{desc}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Critical Alerts Banner ── */}
      <AnimatePresence>
        {criticalActive.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            className="rounded-xl px-4 py-3 flex items-start gap-3"
            style={{ background: 'rgba(255,92,122,0.05)', border: `1px solid rgba(255,92,122,0.18)` }}
          >
            <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" strokeWidth={2} style={{ color: t.error }} />
            <div className="flex-1 min-w-0">
              <p className="text-[12.5px] font-bold" style={{ color: t.error }}>
                {criticalActive.length} active mission{criticalActive.length !== 1 ? 's' : ''} in critical health
              </p>
              <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: t.txtDim }}>
                {criticalActive.map((m, i) => (
                  <span key={m.id}>
                    <span className="font-semibold" style={{ color: t.txt }}>&quot;{m.title}&quot;</span>
                    {m.dropOffStep != null && ` — ${m.dropOffStep.count} users stuck at step ${m.dropOffStep.stepIdx + 1}`}
                    {i < criticalActive.length - 1 ? ' · ' : ''}
                  </span>
                ))}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Filters + Search ── */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 rounded-xl p-1" style={{ background: t.card, border: `1px solid ${t.panel}` }}>
          {(Object.keys(counts) as StatusFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 h-7 rounded-lg text-[12px] font-semibold transition-all"
              style={filter === f ? { background: t.panel, color: t.txt } : { color: t.txtFaint }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              <span className="ml-1.5 text-[10px]" style={{ color: filter === f ? t.accent : t.txtFaint }}>
                {counts[f]}
              </span>
            </button>
          ))}
        </div>
        <div className="flex-1 relative max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" strokeWidth={2} style={{ color: t.txtFaint }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search missions…"
            className="w-full h-9 pl-8 pr-3 rounded-xl text-[13px] focus:outline-none"
            style={{ background: t.card, border: `1px solid ${t.panel}`, color: t.txt }}
          />
        </div>
        <button className="flex items-center gap-2 h-9 px-3 rounded-xl text-[12px] font-medium transition-colors"
          style={{ background: t.card, border: `1px solid ${t.panel}`, color: t.txtDim }}>
          <SlidersHorizontal size={13} strokeWidth={2} />
          Filters
        </button>
      </div>

      {/* ── Table + Intel Panel ── */}
      <div className={cn('flex gap-4 flex-1 min-h-0', selected && 'divide-x')} style={selected ? { borderColor: t.panel } : {}}>

        {/* Table */}
        <div className={cn(
          'flex-1 min-w-0 rounded-2xl overflow-hidden flex flex-col',
          selected && 'max-w-[58%]'
        )} style={{ background: t.card, border: `1px solid ${t.panel}` }}>
          {/* Column headers */}
          <div className="grid px-5 py-3" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 52px', background: t.surface, borderBottom: `1px solid ${t.panel}` }}>
            {['Mission', 'Health', 'Participants', 'Completions', 'Forecast', 'MEI', ''].map((h) => (
              <p key={h} className="text-[10px] font-bold uppercase tracking-wider" style={{ color: t.txtFaint }}>{h}</p>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
              <Radar size={28} className="mx-auto mb-3" strokeWidth={1.5} style={{ color: t.txtFaint }} />
              <p className="font-medium" style={{ color: t.txtDim }}>No missions found</p>
              <p className="text-sm mt-1" style={{ color: t.txtFaint }}>
                {search ? `No results for "${search}"` : 'No missions in this status.'}
              </p>
            </div>
          ) : (
            <div className="overflow-y-auto flex-1" style={{ borderTop: `1px solid ${t.panel}` }}>
              {filtered.map((m) => {
                const h   = HEALTH_CONFIG[m.health];
                const d   = DIFF_CONFIG[m.difficulty];
                const sel = selected?.id === m.id;
                const forecastPct = Math.round(m.completionRate * 100);
                return (
                  <div
                    key={m.id}
                    onClick={() => loadIntel(m)}
                    className="grid px-5 py-3.5 cursor-pointer items-center transition-colors border-l-2"
                    style={{
                      gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 52px',
                      background: sel ? 'rgba(34,255,170,0.05)' : undefined,
                      borderLeftColor: sel ? t.accent : 'transparent',
                    }}
                  >
                    {/* Mission name */}
                    <div className="pr-4">
                      <p className="text-[13px] font-semibold truncate" style={{ color: sel ? t.accent : t.txt }}>{m.title}</p>
                      <p className="text-[11px] mt-0.5" style={{ color: d.color }}>{d.label} · {(m.steps as unknown[]).length} steps</p>
                    </div>

                    {/* Health badge */}
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full w-fit border"
                      style={{ color: h.color, background: h.bg, borderColor: h.border }}>
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: h.dot }} />
                      {h.label}
                    </span>

                    <p className="text-[13px] font-semibold tabular-nums" style={{ color: t.txt }}>{m.participants}</p>
                    <p className="text-[13px] font-semibold tabular-nums" style={{ color: t.txt }}>{m.completions}</p>

                    {/* Completion forecast bar */}
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-1.5 rounded-full overflow-hidden" style={{ background: t.panel }}>
                        <div className="h-full rounded-full" style={{ width: `${forecastPct}%`, backgroundColor: h.glow }} />
                      </div>
                      <span className="text-[11px] font-bold tabular-nums" style={{ color: h.glow }}>{forecastPct}%</span>
                    </div>

                    {/* MEI */}
                    <p className="text-[13px] font-bold tabular-nums"
                      style={{ color: m.score?.mei ? (m.score.mei >= 70 ? t.accent : m.score.mei >= 40 ? t.warning : t.error) : t.txtFaint }}>
                      {m.score?.mei ?? '—'}
                    </p>

                    {/* Actions */}
                    <div className="flex items-center">
                      <Link
                        href={`/workspace/missions/${m.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: t.txtFaint }}
                      >
                        <ChevronRight size={13} strokeWidth={2} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Intel Panel ── */}
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="w-[340px] flex-shrink-0 flex flex-col gap-4 pl-4 overflow-y-auto"
            >
              {/* Mission header */}
              <div className="rounded-2xl p-4" style={{ background: t.card, border: `1px solid ${t.panel}` }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Bot size={14} strokeWidth={2} style={{ color: t.ai }} />
                    <p className="text-[13px] font-bold" style={{ color: t.txt }}>Mission Intelligence</p>
                  </div>
                  <button onClick={() => setSelected(null)} className="text-[11px] leading-none" style={{ color: t.txtFaint }}>✕</button>
                </div>
                <p className="text-[13px] font-semibold mb-2 truncate" style={{ color: t.txt }}>{selected.title}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {(() => {
                    const h = HEALTH_CONFIG[selected.health];
                    return (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border"
                        style={{ color: h.color, background: h.bg, borderColor: h.border }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: h.dot }} />
                        {h.label}
                      </span>
                    );
                  })()}
                  <span className="text-[11px]" style={{ color: t.txtFaint }}>
                    {Math.round(selected.completionRate * 100)}% completion rate
                  </span>
                </div>
              </div>

              {/* Drop-off alert */}
              {selected.dropOffStep != null && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl p-3.5 flex items-start gap-2.5"
                  style={{ background: 'rgba(255,92,122,0.05)', border: `1px solid rgba(255,92,122,0.18)` }}
                >
                  <TrendingDown size={14} className="flex-shrink-0 mt-0.5" strokeWidth={2} style={{ color: t.error }} />
                  <div>
                    <p className="text-[12px] font-bold" style={{ color: t.error }}>
                      ⚠ Step {selected.dropOffStep.stepIdx + 1} causing {Math.round((selected.dropOffStep.count / Math.max(selected.participants, 1)) * 100)}% drop-off
                    </p>
                    <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: t.txtDim }}>
                      {selected.dropOffStep.count} user{selected.dropOffStep.count !== 1 ? 's' : ''} stuck here.
                      Recommended: Split into 2 smaller steps.
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Completion forecast */}
              <div className="rounded-2xl p-4" style={{ background: t.card, border: `1px solid ${t.panel}` }}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: t.txtFaint }}>Completion Forecast</p>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-[32px] font-black leading-none" style={{ color: HEALTH_CONFIG[selected.health].glow }}>
                    {Math.round(selected.completionRate * 100)}%
                  </span>
                  <span className="text-[12px]" style={{ color: t.txtFaint }}>projected completion</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: t.panel }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.round(selected.completionRate * 100)}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{
                      background: HEALTH_CONFIG[selected.health].glow,
                      boxShadow: `0 0 8px ${HEALTH_CONFIG[selected.health].glow}60`,
                    }}
                  />
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-[10px]" style={{ color: t.txtFaint }}>{selected.completions} completed</span>
                  <span className="text-[10px]" style={{ color: t.txtFaint }}>{selected.participants} participants</span>
                </div>
              </div>

              {/* AI Analysis */}
              {intel?.loading ? (
                <div className="rounded-2xl p-4 space-y-3" style={{ background: t.card, border: `1px solid ${t.panel}` }}>
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-4/5" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              ) : intel && (
                <>
                  <div className="rounded-2xl p-4 space-y-4" style={{ background: t.card, border: `1px solid ${t.panel}` }}>
                    <p className="text-[12px] leading-relaxed" style={{ color: t.txtDim }}>{intel.analysis}</p>

                    <div className="flex items-start gap-2 p-3 rounded-xl border"
                      style={
                        intel.rewardEffective
                          ? { background: 'rgba(34,255,170,0.08)', borderColor: 'rgba(34,255,170,0.15)' }
                          : { background: 'rgba(255,184,77,0.08)', borderColor: 'rgba(255,184,77,0.15)' }
                      }>
                      <CheckCircle2 size={13} strokeWidth={2} style={{ color: intel.rewardEffective ? t.accent : t.warning }} />
                      <div>
                        <p className="text-[11px] font-bold" style={{ color: intel.rewardEffective ? t.accent : t.warning }}>
                          Rewards {intel.rewardEffective ? 'Effective' : 'Needs Review'}
                        </p>
                        <p className="text-[11px] mt-0.5" style={{ color: t.txtDim }}>
                          {intel.rewardEffective ? 'Reward structure is driving completions.' : 'Review reward alignment with steps.'}
                        </p>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl" style={{ background: 'rgba(109,93,253,0.08)', border: `1px solid rgba(109,93,253,0.15)` }}>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Sparkles size={11} strokeWidth={2} style={{ color: t.ai }} />
                        <p className="text-[11px] font-bold" style={{ color: t.aiLight }}>AI Recommendation</p>
                      </div>
                      <p className="text-[12px]" style={{ color: t.txtDim }}>{intel.recommendation}</p>
                    </div>
                  </div>

                  {/* MEI Breakdown */}
                  {selected.score && (
                    <div className="rounded-2xl p-4" style={{ background: t.card, border: `1px solid ${t.panel}` }}>
                      <p className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: t.txtFaint }}>MEI Breakdown</p>
                      <div className="space-y-2.5">
                        {[
                          { label: 'Completion', value: selected.score.completion_score, color: t.accent },
                          { label: 'Engagement', value: selected.score.engagement_score, color: t.ai },
                          { label: 'Retention',  value: selected.score.retention_score,  color: t.warning },
                          { label: 'Outcome',    value: selected.score.outcome_score,    color: t.txt },
                        ].map(({ label, value, color }) => (
                          <div key={label}>
                            <div className="flex justify-between text-[11px] mb-1">
                              <span style={{ color: t.txtDim }}>{label}</span>
                              <span className="font-bold tabular-nums" style={{ color }}>{value ?? 0}</span>
                            </div>
                            <div className="h-1 rounded-full overflow-hidden" style={{ background: t.panel }}>
                              <div className="h-full rounded-full" style={{ width: `${value ?? 0}%`, backgroundColor: color }} />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 pt-3 flex items-center justify-between" style={{ borderTop: `1px solid ${t.panel}` }}>
                        <p className="text-[11px]" style={{ color: t.txtFaint }}>MEI Score</p>
                        <p className="text-[20px] font-bold" style={{ color: t.accent }}>{selected.score.mei}</p>
                      </div>
                    </div>
                  )}

                  <Link href={`/workspace/missions/${selected.id}`}>
                    <button className="w-full flex items-center justify-center gap-2 h-9 bg-accent/10 border border-accent/20 text-accent rounded-xl text-[13px] font-semibold hover:bg-accent/15 transition-colors">
                      Open Mission Studio
                      <ChevronRight size={14} strokeWidth={2.5} />
                    </button>
                  </Link>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
