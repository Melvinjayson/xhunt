'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Layers, Plus, Search, Filter, Target, Clock, Users, BarChart3,
  ChevronRight, Copy, Archive, Play, Pause, MoreHorizontal, Sparkles,
  ArrowUpRight, Star, TrendingUp
} from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/context';
import { cn } from '@/lib/cn';
import { t } from '@/theme/colors';
import type { DbMission } from '@/lib/supabase/types';

interface MissionWithStats extends DbMission {
  completions: number;
  participants: number;
  mei: number | null;
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg', className)} style={{ background: t.panel }} />;
}

const DIFF_COLOR = {
  easy:   { color: t.accent,  bg: 'rgba(34,255,170,0.1)' },
  medium: { color: t.warning, bg: 'rgba(255,184,77,0.1)' },
  hard:   { color: t.error,   bg: 'rgba(255,92,122,0.1)' },
};

const STATUS_COLOR = {
  active:    { color: t.accent,   bg: 'rgba(34,255,170,0.1)' },
  draft:     { color: t.warning,  bg: 'rgba(255,184,77,0.1)' },
  paused:    { color: t.txtDim,   bg: 'rgba(139,156,192,0.1)' },
  archived:  { color: t.txtFaint, bg: 'rgba(74,85,120,0.1)' },
  published: { color: t.accent,   bg: 'rgba(34,255,170,0.1)' },
};

type ViewMode = 'grid' | 'list';

export default function MissionsPage() {
  const [missions, setMissions] = useState<MissionWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [view, setView] = useState<ViewMode>('grid');
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const { user, isLoaded } = useAuth();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      if (!isLoaded || !user) return;
      const { data: profile } = await supabase.from('user_profiles').select('tenant_id').eq('id', user.id).single();
      if (!profile?.tenant_id) { setLoading(false); return; }

      const [missionsRes, progressRes, scoresRes] = await Promise.all([
        supabase.from('missions').select('*').eq('tenant_id', profile.tenant_id).order('created_at', { ascending: false }),
        supabase.from('mission_progress').select('mission_id, user_id, completed_at').eq('tenant_id', profile.tenant_id),
        supabase.from('mission_scores').select('mission_id, mei').eq('tenant_id', profile.tenant_id),
      ]);

      const completionMap: Record<string, number> = {};
      const participantMap: Record<string, Set<string>> = {};
      (progressRes.data ?? []).forEach((p) => {
        if (p.completed_at) completionMap[p.mission_id] = (completionMap[p.mission_id] ?? 0) + 1;
        if (!participantMap[p.mission_id]) participantMap[p.mission_id] = new Set();
        participantMap[p.mission_id].add(p.user_id);
      });

      const meiMap: Record<string, number> = {};
      (scoresRes.data ?? []).forEach((s) => { meiMap[s.mission_id] = s.mei; });

      setMissions(
        (missionsRes.data ?? []).map((m) => ({
          ...m,
          completions: completionMap[m.id] ?? 0,
          participants: participantMap[m.id]?.size ?? 0,
          mei: meiMap[m.id] ?? null,
        }))
      );
      setLoading(false);
    }
    load();
  }, [supabase, user, isLoaded]);

  async function updateStatus(id: string, status: string) {
    await supabase.from('missions').update({ status }).eq('id', id);
    setMissions((prev) => prev.map((m) => m.id === id ? { ...m, status: status as DbMission['status'] } : m));
    setOpenMenu(null);
  }

  const filtered = missions.filter((m) => {
    if (statusFilter !== 'all' && m.status !== statusFilter) return false;
    if (search && !m.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: missions.length,
    active: missions.filter((m) => m.status === 'active').length,
    draft: missions.filter((m) => m.status === 'draft').length,
    avgMei: missions.length ? Math.round(missions.filter((m) => m.mei).reduce((s, m) => s + (m.mei ?? 0), 0) / Math.max(missions.filter((m) => m.mei).length, 1)) : 0,
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-32 rounded-xl" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6" onClick={() => setOpenMenu(null)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(109,93,253,0.1)', border: '1px solid rgba(109,93,253,0.2)' }}>
            <Layers size={18} strokeWidth={1.8} style={{ color: t.ai }} />
          </div>
          <div>
            <h1 className="text-[22px] font-bold" style={{ color: t.txt }}>Mission Studio</h1>
            <p className="text-[12px]" style={{ color: t.txtFaint }}>Create, manage, and optimize missions</p>
          </div>
        </div>
        <Link href="/workspace/missions/new">
          <button className="flex items-center gap-2 h-9 px-4 bg-accent rounded-xl font-semibold text-[13px] shadow-[0_4px_16px_rgba(34,255,170,0.25)]" style={{ color: '#060a0e' }}>
            <Plus size={14} strokeWidth={2.5} />
            Create Mission
          </button>
        </Link>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Missions', value: stats.total,  icon: Target,   color: t.txt,     bg: 'rgba(13,21,48,1)' },
          { label: 'Active',         value: stats.active, icon: Play,     color: t.accent,  bg: 'rgba(34,255,170,0.08)' },
          { label: 'Drafts',         value: stats.draft,  icon: Layers,   color: t.warning, bg: 'rgba(255,184,77,0.08)' },
          { label: 'Avg MEI',        value: stats.avgMei, icon: BarChart3, color: t.ai,     bg: 'rgba(109,93,253,0.1)' },
        ].map(({ label, value, icon: Icon, color, bg }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl p-4 flex items-center gap-3"
            style={{ background: t.card, border: `1px solid ${t.panel}` }}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
              <Icon size={16} strokeWidth={1.8} style={{ color }} />
            </div>
            <div>
              <p className="text-[22px] font-bold leading-none tabular-nums" style={{ color }}>{value}</p>
              <p className="text-[11px] mt-0.5 font-medium" style={{ color: t.txtFaint }}>{label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" strokeWidth={2} style={{ color: t.txtFaint }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search missions…"
            className="w-full h-9 pl-8 pr-3 rounded-xl text-[13px] focus:outline-none"
            style={{ background: t.card, border: `1px solid ${t.panel}`, color: t.txt }}
          />
        </div>
        <div className="flex items-center gap-1.5 rounded-xl p-1" style={{ background: t.card, border: `1px solid ${t.panel}` }}>
          {['all', 'active', 'draft', 'paused', 'archived'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className="px-3 h-7 rounded-lg text-[11px] font-semibold transition-all capitalize"
              style={statusFilter === s ? { background: t.panel, color: t.txt } : { color: t.txtFaint }}
            >{s}</button>
          ))}
        </div>
        <div className="flex items-center gap-1 rounded-xl p-1" style={{ background: t.card, border: `1px solid ${t.panel}` }}>
          <button onClick={() => setView('grid')} className="w-7 h-7 flex items-center justify-center rounded-lg transition-all"
            style={view === 'grid' ? { background: t.panel } : {}}>
            <span className="grid grid-cols-2 gap-0.5 w-3 h-3">
              {[0,1,2,3].map(i => <span key={i} className="rounded-[1px]" style={{ background: view === 'grid' ? t.txt : t.txtFaint }} />)}
            </span>
          </button>
          <button onClick={() => setView('list')} className="w-7 h-7 flex items-center justify-center rounded-lg transition-all"
            style={view === 'list' ? { background: t.panel } : {}}>
            <span className="flex flex-col gap-0.5 w-3 h-3 justify-center">
              {[0,1,2].map(i => <span key={i} className="h-px w-full rounded" style={{ background: view === 'list' ? t.txt : t.txtFaint }} />)}
            </span>
          </button>
        </div>
      </div>

      {/* Grid / List */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl py-20 text-center" style={{ background: t.card, border: `1px solid ${t.panel}` }}>
          <Target size={32} className="mx-auto mb-3" strokeWidth={1.5} style={{ color: t.txtFaint }} />
          <p className="font-semibold mb-1" style={{ color: t.txtDim }}>No missions found</p>
          <p className="text-sm mb-5" style={{ color: t.txtFaint }}>
            {search ? `No missions matching "${search}"` : 'Create your first mission to get started.'}
          </p>
          <Link href="/workspace/missions/new">
            <button className="inline-flex items-center gap-2 px-5 h-9 bg-accent rounded-xl font-semibold text-sm" style={{ color: '#060a0e' }}>
              <Plus size={14} strokeWidth={2.5} /> Create Mission
            </button>
          </Link>
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-3 gap-4">
          {filtered.map((m, i) => {
            const dc = DIFF_COLOR[m.difficulty];
            const sc = STATUS_COLOR[m.status as keyof typeof STATUS_COLOR] ?? STATUS_COLOR.draft;
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="rounded-2xl overflow-hidden transition-colors group"
                style={{ background: t.card, border: `1px solid ${t.panel}` }}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ color: sc.color, background: sc.bg }}>
                        {m.status.charAt(0).toUpperCase() + m.status.slice(1)}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ color: dc.color, background: dc.bg }}>
                        {m.difficulty.charAt(0).toUpperCase() + m.difficulty.slice(1)}
                      </span>
                    </div>
                    <div className="relative">
                      <button
                        onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === m.id ? null : m.id); }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg transition-all"
                        style={{ color: t.txtFaint }}
                      >
                        <MoreHorizontal size={14} strokeWidth={2} />
                      </button>
                      {openMenu === m.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 top-8 w-44 rounded-xl shadow-xl z-10 overflow-hidden"
                          style={{ background: t.panel, border: `1px solid #162440` }}
                        >
                          {[
                            { label: 'Set Active',   action: () => updateStatus(m.id, 'active'),   icon: Play },
                            { label: 'Set Paused',   action: () => updateStatus(m.id, 'paused'),   icon: Pause },
                            { label: 'Set Archived', action: () => updateStatus(m.id, 'archived'), icon: Archive },
                          ].map(({ label, action, icon: Icon }) => (
                            <button key={label} onClick={action} className="flex items-center gap-2 w-full px-3 py-2 text-[12px] transition-colors"
                              style={{ color: t.txtDim }}>
                              <Icon size={12} strokeWidth={2} />{label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <h3 className="text-[14px] font-semibold mb-1 line-clamp-2 group-hover:text-accent transition-colors" style={{ color: t.txt }}>{m.title}</h3>
                  {m.story_context && (
                    <p className="text-[12px] line-clamp-2 mb-3" style={{ color: t.txtFaint }}>{m.story_context}</p>
                  )}

                  <div className="flex items-center gap-4 mt-3 pt-3" style={{ borderTop: `1px solid ${t.panel}` }}>
                    <div className="flex items-center gap-1.5 text-[11px]" style={{ color: t.txtDim }}>
                      <Layers size={11} strokeWidth={2} />
                      {(m.steps as unknown[]).length} steps
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px]" style={{ color: t.txtDim }}>
                      <Users size={11} strokeWidth={2} />
                      {m.participants}
                    </div>
                    {m.estimated_time && (
                      <div className="flex items-center gap-1.5 text-[11px]" style={{ color: t.txtDim }}>
                        <Clock size={11} strokeWidth={2} />
                        {m.estimated_time}
                      </div>
                    )}
                    {m.mei !== null && (
                      <div className="ml-auto flex items-center gap-1 text-[11px] font-bold" style={{ color: t.accent }}>
                        <TrendingUp size={11} strokeWidth={2} />
                        {m.mei}
                      </div>
                    )}
                  </div>
                </div>
                <Link href={`/workspace/missions/${m.id}`} className="flex items-center justify-between px-5 py-3 transition-colors"
                  style={{ background: t.surface, borderTop: `1px solid ${t.panel}` }}>
                  <span className="text-[12px] font-semibold" style={{ color: t.txtDim }}>Open in Studio</span>
                  <ChevronRight size={13} strokeWidth={2} style={{ color: t.txtFaint }} />
                </Link>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background: t.card, border: `1px solid ${t.panel}` }}>
          <div className="grid px-5 py-3" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 80px', background: t.surface, borderBottom: `1px solid ${t.panel}` }}>
            {['Mission', 'Status', 'Difficulty', 'Participants', 'MEI', ''].map((h) => (
              <p key={h} className="text-[10px] font-bold uppercase tracking-wider" style={{ color: t.txtFaint }}>{h}</p>
            ))}
          </div>
          <div className="divide-y" style={{ borderColor: t.panel }}>
            {filtered.map((m) => {
              const dc = DIFF_COLOR[m.difficulty];
              const sc = STATUS_COLOR[m.status as keyof typeof STATUS_COLOR] ?? STATUS_COLOR.draft;
              return (
                <Link key={m.id} href={`/workspace/missions/${m.id}`}
                  className="grid px-5 py-4 items-center transition-colors group"
                  style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 80px' }}>
                  <div>
                    <p className="text-[13px] font-semibold group-hover:text-accent transition-colors truncate" style={{ color: t.txt }}>{m.title}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: t.txtFaint }}>{(m.steps as unknown[]).length} steps · {m.estimated_time ?? '—'}</p>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full w-fit"
                    style={{ color: sc.color, background: sc.bg }}>
                    {m.status.charAt(0).toUpperCase() + m.status.slice(1)}
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full w-fit"
                    style={{ color: dc.color, background: dc.bg }}>
                    {m.difficulty.charAt(0).toUpperCase() + m.difficulty.slice(1)}
                  </span>
                  <p className="text-[13px] font-semibold tabular-nums" style={{ color: t.txt }}>{m.participants}</p>
                  <p className="text-[13px] font-bold tabular-nums" style={{ color: m.mei ? t.accent : t.txtFaint }}>{m.mei ?? '—'}</p>
                  <ChevronRight size={14} className="group-hover:text-accent transition-colors" strokeWidth={2} style={{ color: t.txtFaint }} />
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
