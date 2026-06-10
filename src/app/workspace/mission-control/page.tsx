'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Radar, Target, Users, TrendingUp, ArrowUpRight, Filter, Search,
  ChevronRight, MoreHorizontal, Sparkles, Zap, AlertTriangle, CheckCircle2,
  Clock, Play, Pause, Archive, Plus, RefreshCw, SlidersHorizontal,
  BarChart3, Activity, Bot
} from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/cn';
import type { DbMission, DbMissionScore } from '@/lib/supabase/types';

type Filter = 'all' | 'active' | 'draft' | 'paused' | 'archived';

interface MissionRow extends DbMission {
  score?: DbMissionScore;
  completions: number;
  participants: number;
}

interface IntelPanel {
  missionId: string;
  title: string;
  analysis: string;
  dropOffStep: number | null;
  rewardEffective: boolean;
  recommendation: string;
  loading: boolean;
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('bg-[#0D1530] animate-pulse rounded-lg', className)} />;
}

const STATUS_CONFIG = {
  active:   { label: 'Active',   color: 'text-[#22FFAA]', bg: 'bg-[#22FFAA]/10', dot: 'bg-[#22FFAA]' },
  draft:    { label: 'Draft',    color: 'text-[#FFB84D]', bg: 'bg-[#FFB84D]/10', dot: 'bg-[#FFB84D]' },
  paused:   { label: 'Paused',   color: 'text-[#8B9CC0]', bg: 'bg-[#8B9CC0]/10', dot: 'bg-[#8B9CC0]' },
  archived: { label: 'Archived', color: 'text-[#4A5578]', bg: 'bg-[#4A5578]/10', dot: 'bg-[#4A5578]' },
  published:{ label: 'Published',color: 'text-[#22FFAA]', bg: 'bg-[#22FFAA]/10', dot: 'bg-[#22FFAA]' },
};

const DIFF_CONFIG = {
  easy:   { label: 'Easy',   color: 'text-[#22FFAA]' },
  medium: { label: 'Medium', color: 'text-[#FFB84D]' },
  hard:   { label: 'Hard',   color: 'text-[#FF5C7A]' },
};

export default function MissionControlPage() {
  const [missions, setMissions] = useState<MissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<MissionRow | null>(null);
  const [intel, setIntel] = useState<IntelPanel | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('user_profiles').select('tenant_id').eq('id', user.id).single();
      if (!profile?.tenant_id) return;
      setTenantId(profile.tenant_id);

      const [missionsRes, scoresRes, progressRes] = await Promise.all([
        supabase.from('missions').select('*').eq('tenant_id', profile.tenant_id).order('updated_at', { ascending: false }),
        supabase.from('mission_scores').select('*').eq('tenant_id', profile.tenant_id),
        supabase.from('mission_progress').select('mission_id, user_id, completed_at').eq('tenant_id', profile.tenant_id),
      ]);

      const scoreMap: Record<string, DbMissionScore> = {};
      (scoresRes.data ?? []).forEach((s) => { scoreMap[s.mission_id] = s; });

      const completionMap: Record<string, number> = {};
      const participantMap: Record<string, Set<string>> = {};
      (progressRes.data ?? []).forEach((p) => {
        if (p.completed_at) completionMap[p.mission_id] = (completionMap[p.mission_id] ?? 0) + 1;
        if (!participantMap[p.mission_id]) participantMap[p.mission_id] = new Set();
        participantMap[p.mission_id].add(p.user_id);
      });

      setMissions(
        (missionsRes.data ?? []).map((m) => ({
          ...m,
          score: scoreMap[m.id],
          completions: completionMap[m.id] ?? 0,
          participants: participantMap[m.id]?.size ?? 0,
        }))
      );
      setLoading(false);
    }
    load();
  }, [supabase]);

  async function loadIntel(mission: MissionRow) {
    setSelected(mission);
    setIntel({ missionId: mission.id, title: mission.title, analysis: '', dropOffStep: null, rewardEffective: true, recommendation: '', loading: true });

    try {
      const res = await fetch('/api/agents/behavioral-analyst', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: `Mission: "${mission.title}". Steps: ${(mission.steps as unknown[]).length}. Completions: ${mission.completions}. Participants: ${mission.participants}. MEI: ${mission.score?.mei ?? 'N/A'}. Status: ${mission.status}.`,
        }),
      });
      const json = await res.json();
      const text: string = json.content ?? json.message ?? '';
      setIntel({
        missionId: mission.id,
        title: mission.title,
        analysis: text.slice(0, 350) || `"${mission.title}" is performing ${mission.completions > 5 ? 'well' : 'below average'} with ${mission.completions} completions from ${mission.participants} participants.`,
        dropOffStep: mission.completions < mission.participants ? Math.ceil((mission.steps as unknown[]).length / 2) : null,
        rewardEffective: mission.completions > 3,
        recommendation: mission.completions < 3
          ? 'Consider simplifying early steps and adding motivational checkpoints.'
          : 'Expand to a larger audience segment to maximize impact.',
        loading: false,
      });
    } catch {
      setIntel({
        missionId: mission.id,
        title: mission.title,
        analysis: `"${mission.title}" has ${mission.participants} participants with ${mission.completions} completions. MEI: ${mission.score?.mei ?? 0}.`,
        dropOffStep: null,
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
    all: missions.length,
    active: missions.filter((m) => m.status === 'active').length,
    draft: missions.filter((m) => m.status === 'draft').length,
    paused: missions.filter((m) => m.status === 'paused').length,
    archived: missions.filter((m) => m.status === 'archived').length,
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-10 w-80" />
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-20 rounded-full" />)}
        </div>
        <Skeleton className="h-[500px] rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-8 h-full flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
            <Radar size={18} className="text-accent" strokeWidth={1.8} />
          </div>
          <div>
            <h1 className="text-[22px] font-bold text-[#F0F4FF]">Mission Control</h1>
            <p className="text-[#4A5578] text-[12px]">{missions.length} missions · {counts.active} active</p>
          </div>
        </div>
        <Link href="/workspace/missions/new">
          <button className="flex items-center gap-2 h-9 px-4 bg-accent text-[#060a0e] rounded-xl font-semibold text-[13px] shadow-[0_4px_16px_rgba(34,255,170,0.25)]">
            <Plus size={14} strokeWidth={2.5} />
            New Mission
          </button>
        </Link>
      </div>

      {/* Filters + Search */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 bg-[#0A1226] border border-[#0F1D35] rounded-xl p-1">
          {(Object.keys(counts) as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 h-7 rounded-lg text-[12px] font-semibold transition-all',
                filter === f
                  ? 'bg-[#0D1530] text-[#F0F4FF]'
                  : 'text-[#4A5578] hover:text-[#8B9CC0]'
              )}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              <span className={cn('ml-1.5 text-[10px]', filter === f ? 'text-accent' : 'text-[#4A5578]')}>
                {counts[f]}
              </span>
            </button>
          ))}
        </div>
        <div className="flex-1 relative max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4A5578]" strokeWidth={2} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search missions…"
            className="w-full h-9 pl-8 pr-3 bg-[#0A1226] border border-[#0F1D35] rounded-xl text-[13px] text-[#F0F4FF] placeholder:text-[#4A5578] focus:outline-none focus:border-[#162440]"
          />
        </div>
        <button className="flex items-center gap-2 h-9 px-3 bg-[#0A1226] border border-[#0F1D35] rounded-xl text-[12px] font-medium text-[#8B9CC0] hover:text-[#F0F4FF] hover:border-[#162440] transition-colors">
          <SlidersHorizontal size={13} strokeWidth={2} />
          Filters
        </button>
      </div>

      {/* Command Table + Intel Panel */}
      <div className={cn('flex gap-4 flex-1', selected && 'divide-x divide-[#0F1D35]')}>

        {/* Table */}
        <div className={cn('flex-1 min-w-0 bg-[#0A1226] border border-[#0F1D35] rounded-2xl overflow-hidden flex flex-col', selected && 'max-w-[60%]')}>

          {/* Column Headers */}
          <div className="grid gap-0 px-5 py-3 border-b border-[#0F1D35] bg-[#07101F]"
            style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 80px' }}>
            {['Mission', 'Status', 'Participants', 'Completions', 'MEI', 'Updated', 'Actions'].map((h) => (
              <p key={h} className="text-[10px] font-bold text-[#4A5578] uppercase tracking-wider">{h}</p>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
              <Radar size={28} className="text-[#4A5578] mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-[#8B9CC0] font-medium">No missions found</p>
              <p className="text-[#4A5578] text-sm mt-1">
                {search ? `No results for "${search}"` : 'No missions in this status.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#0F1D35] overflow-y-auto flex-1">
              {filtered.map((m) => {
                const s = STATUS_CONFIG[m.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.draft;
                const d = DIFF_CONFIG[m.difficulty];
                const isSelected = selected?.id === m.id;
                return (
                  <div
                    key={m.id}
                    onClick={() => loadIntel(m)}
                    className={cn(
                      'grid gap-0 px-5 py-3.5 cursor-pointer items-center transition-colors',
                      isSelected ? 'bg-accent/5 border-l-2 border-accent' : 'hover:bg-[#0D1530] border-l-2 border-transparent'
                    )}
                    style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 80px' }}
                  >
                    <div className="pr-4">
                      <p className={cn('text-[13px] font-semibold truncate', isSelected ? 'text-accent' : 'text-[#F0F4FF]')}>{m.title}</p>
                      <p className={cn('text-[11px] mt-0.5', d.color)}>{d.label} · {(m.steps as unknown[]).length} steps</p>
                    </div>

                    <span className={cn('inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full w-fit', s.color, s.bg)}>
                      <span className={cn('w-1 h-1 rounded-full flex-shrink-0', s.dot, m.status === 'active' && 'breathe')} />
                      {s.label}
                    </span>

                    <p className="text-[13px] text-[#F0F4FF] font-semibold tabular-nums">{m.participants}</p>
                    <p className="text-[13px] text-[#F0F4FF] font-semibold tabular-nums">{m.completions}</p>

                    <div className="flex items-center gap-1.5">
                      <p className={cn('text-[13px] font-bold tabular-nums',
                        m.score?.mei ? (m.score.mei >= 70 ? 'text-[#22FFAA]' : m.score.mei >= 40 ? 'text-[#FFB84D]' : 'text-[#FF5C7A]') : 'text-[#4A5578]'
                      )}>
                        {m.score?.mei ?? '—'}
                      </p>
                    </div>

                    <p className="text-[11px] text-[#4A5578]">
                      {new Date(m.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>

                    <div className="flex items-center gap-1">
                      <Link
                        href={`/workspace/missions/${m.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 rounded-lg hover:bg-[#162440] text-[#4A5578] hover:text-[#F0F4FF] transition-colors"
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

        {/* Intelligence Panel */}
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="w-[340px] flex-shrink-0 flex flex-col gap-4 pl-4"
            >
              {/* Header */}
              <div className="bg-[#0A1226] border border-[#0F1D35] rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Bot size={14} className="text-[#6D5DFD]" strokeWidth={2} />
                    <p className="text-[13px] font-bold text-[#F0F4FF]">Mission Intelligence</p>
                  </div>
                  <button onClick={() => setSelected(null)} className="text-[#4A5578] hover:text-[#8B9CC0] text-[11px]">✕</button>
                </div>
                <p className="text-[13px] font-semibold text-[#F0F4FF] mb-1 truncate">{selected.title}</p>
                <p className="text-[11px] text-[#4A5578]">Behavioral Analysis · Powered by AI</p>
              </div>

              {intel?.loading ? (
                <div className="bg-[#0A1226] border border-[#0F1D35] rounded-2xl p-4 space-y-3">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-4/5" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              ) : intel && (
                <>
                  <div className="bg-[#0A1226] border border-[#0F1D35] rounded-2xl p-4 space-y-4">
                    <p className="text-[12px] text-[#8B9CC0] leading-relaxed">{intel.analysis}</p>

                    {intel.dropOffStep && (
                      <div className="flex items-start gap-2 p-3 rounded-xl bg-[#FF5C7A]/8 border border-[#FF5C7A]/15">
                        <AlertTriangle size={13} className="text-[#FF5C7A] mt-0.5 flex-shrink-0" strokeWidth={2} />
                        <div>
                          <p className="text-[11px] font-bold text-[#FF5C7A]">Drop-off Signal</p>
                          <p className="text-[11px] text-[#8B9CC0] mt-0.5">High abandonment at Step {intel.dropOffStep}</p>
                        </div>
                      </div>
                    )}

                    <div className={cn(
                      'flex items-start gap-2 p-3 rounded-xl border',
                      intel.rewardEffective
                        ? 'bg-[#22FFAA]/8 border-[#22FFAA]/15'
                        : 'bg-[#FFB84D]/8 border-[#FFB84D]/15'
                    )}>
                      <CheckCircle2 size={13} className={intel.rewardEffective ? 'text-[#22FFAA]' : 'text-[#FFB84D]'} strokeWidth={2} />
                      <div>
                        <p className={cn('text-[11px] font-bold', intel.rewardEffective ? 'text-[#22FFAA]' : 'text-[#FFB84D]')}>
                          Rewards {intel.rewardEffective ? 'Effective' : 'Needs Review'}
                        </p>
                        <p className="text-[11px] text-[#8B9CC0] mt-0.5">
                          {intel.rewardEffective ? 'Reward structure is driving completions.' : 'Review reward alignment with steps.'}
                        </p>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-[#6D5DFD]/8 border border-[#6D5DFD]/15">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Sparkles size={11} className="text-[#6D5DFD]" strokeWidth={2} />
                        <p className="text-[11px] font-bold text-[#A99FFE]">Recommendation</p>
                      </div>
                      <p className="text-[12px] text-[#8B9CC0]">{intel.recommendation}</p>
                    </div>
                  </div>

                  {/* MEI Breakdown */}
                  {selected.score && (
                    <div className="bg-[#0A1226] border border-[#0F1D35] rounded-2xl p-4">
                      <p className="text-[11px] font-bold text-[#4A5578] uppercase tracking-wider mb-3">MEI Breakdown</p>
                      <div className="space-y-2.5">
                        {[
                          { label: 'Completion', value: selected.score.completion_score, color: '#22FFAA' },
                          { label: 'Engagement', value: selected.score.engagement_score, color: '#6D5DFD' },
                          { label: 'Retention',  value: selected.score.retention_score,  color: '#FFB84D' },
                          { label: 'Outcome',    value: selected.score.outcome_score,    color: '#F0F4FF' },
                        ].map(({ label, value, color }) => (
                          <div key={label}>
                            <div className="flex justify-between text-[11px] mb-1">
                              <span className="text-[#8B9CC0]">{label}</span>
                              <span className="font-bold tabular-nums" style={{ color }}>{value ?? 0}</span>
                            </div>
                            <div className="h-1 bg-[#0D1530] rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${value ?? 0}%`, backgroundColor: color }} />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 pt-3 border-t border-[#0F1D35] flex items-center justify-between">
                        <p className="text-[11px] text-[#4A5578]">MEI Score</p>
                        <p className="text-[20px] font-bold text-[#22FFAA]">{selected.score.mei}</p>
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
