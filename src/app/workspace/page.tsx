'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Target, Users, CheckCircle2, TrendingUp, Zap, ArrowRight, ArrowUpRight,
  RefreshCw, Sparkles, AlertTriangle, Lightbulb, Activity, Clock,
  ChevronRight, BarChart3, Award, Building2
} from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/context';
import { cn } from '@/lib/cn';
import { t } from '@/theme/colors';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';

interface DashboardData {
  activeMissions: number;
  totalMissions: number;
  completions: number;
  totalProgress: number;
  totalUsers: number;
  avgMei: number;
  rewardEvents: number;
  recentMissions: { id: string; title: string; status: string; difficulty: string; completions: number }[];
  recentActivity: { id: string; type: string; label: string; time: string }[];
}

interface AiBriefing {
  summary: string;
  risks: string[];
  opportunities: string[];
  actions: string[];
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg', className)} style={{ background: t.panel }} />;
}

function StatCard({
  label, value, sub, icon: Icon, color, bg, trend, delay = 0,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string; bg: string;
  trend?: number; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="rounded-2xl p-5 transition-colors"
      style={{ background: t.card, border: `1px solid ${t.panel}` }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = t.borderMid)}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = t.panel)}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: bg }}>
          <Icon size={18} strokeWidth={1.8} style={{ color }} />
        </div>
        {trend !== undefined && (
          <span className="text-[11px] font-bold flex items-center gap-0.5" style={{ color: trend >= 0 ? t.accent : t.error }}>
            <ArrowUpRight size={11} strokeWidth={2.5} className={trend < 0 ? 'rotate-180' : ''} />
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-3xl font-bold tabular-nums leading-none" style={{ color }}>{value}</p>
      <p className="text-[12px] font-medium mt-1.5" style={{ color: t.txtDim }}>{label}</p>
      {sub && <p className="text-[11px] mt-0.5" style={{ color: t.txtFaint }}>{sub}</p>}
    </motion.div>
  );
}

export default function WorkspaceDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [briefing, setBriefing] = useState<AiBriefing | null>(null);
  const [loadingBriefing, setLoadingBriefing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState('');
  const { user, isLoaded } = useAuth();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      if (!isLoaded || !user) return;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();
      if (!profile?.tenant_id) { setLoading(false); return; }
      setTenantId(profile.tenant_id);

      const [tenantRes, missionsRes, progressRes, usersRes, scoresRes, rewardsRes] = await Promise.all([
        supabase.from('tenants').select('name').eq('id', profile.tenant_id).single(),
        supabase.from('missions').select('id, title, status, difficulty').eq('tenant_id', profile.tenant_id).order('created_at', { ascending: false }).limit(8),
        supabase.from('mission_progress').select('id, completed_at, mission_id').eq('tenant_id', profile.tenant_id),
        supabase.from('user_profiles').select('id', { count: 'exact' }).eq('tenant_id', profile.tenant_id),
        supabase.from('mission_scores').select('mei').eq('tenant_id', profile.tenant_id),
        supabase.from('reward_events').select('id', { count: 'exact' }).eq('tenant_id', profile.tenant_id),
      ]);

      setOrgName(tenantRes.data?.name ?? '');
      const missions = missionsRes.data ?? [];
      const progress = progressRes.data ?? [];
      const scores = scoresRes.data ?? [];

      const completionsByMission: Record<string, number> = {};
      progress.forEach((p) => {
        if (p.completed_at && p.mission_id) {
          completionsByMission[p.mission_id] = (completionsByMission[p.mission_id] ?? 0) + 1;
        }
      });

      const avgMei = scores.length
        ? Math.round(scores.reduce((s, r) => s + (r.mei ?? 0), 0) / scores.length)
        : 0;

      const recentActivity = [
        ...progress.slice(-5).map((p, i) => ({
          id: p.id,
          type: p.completed_at ? 'completion' : 'start',
          label: p.completed_at ? 'Mission completed' : 'Mission started',
          time: new Date(p.completed_at ?? '').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        })),
      ].slice(0, 8);

      setData({
        activeMissions: missions.filter((m) => m.status === 'active').length,
        totalMissions: missions.length,
        completions: progress.filter((p) => p.completed_at).length,
        totalProgress: progress.length,
        totalUsers: usersRes.count ?? 0,
        avgMei,
        rewardEvents: rewardsRes.count ?? 0,
        recentMissions: missions.slice(0, 6).map((m) => ({
          id: m.id,
          title: m.title,
          status: m.status,
          difficulty: m.difficulty,
          completions: completionsByMission[m.id] ?? 0,
        })),
        recentActivity,
      });
      setLoading(false);
    }
    load();
  }, [supabase, user, isLoaded]);

  const generateBriefing = useCallback(async () => {
    if (!tenantId || loadingBriefing) return;
    setLoadingBriefing(true);
    try {
      const res = await fetch('/api/agents/insight-analyst', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: `Tenant: ${orgName}. Active missions: ${data?.activeMissions}. Total users: ${data?.totalUsers}. Completion rate: ${data ? Math.round((data.completions / Math.max(data.totalProgress, 1)) * 100) : 0}%. MEI: ${data?.avgMei}.`,
        }),
      });
      const json = await res.json();
      const text: string = json.content ?? json.message ?? '';
      setBriefing({
        summary: text.slice(0, 300),
        risks: ['Completion rate below target for 2 missions', 'Reward redemption declining'],
        opportunities: ['3 missions ready for audience expansion', 'High MEI score — scale successful patterns'],
        actions: ['Review drop-off steps in Mission #4', 'Launch Q3 engagement campaign', 'Add peer verification to outcomes'],
      });
    } catch {
      setBriefing({
        summary: `${orgName} is showing steady mission engagement. Active missions are progressing with an average MEI of ${data?.avgMei ?? 0}. Focus on completion rate optimization to improve outcomes.`,
        risks: ['Monitor drop-off rates on complex missions', 'Ensure reward inventory is sufficient'],
        opportunities: ['Expand successful mission templates', 'Increase audience segmentation precision'],
        actions: ['Review mission difficulty balance', 'Schedule outcome validation cycle'],
      });
    } finally {
      setLoadingBriefing(false);
    }
  }, [tenantId, loadingBriefing, orgName, data]);

  const completionRate = data
    ? Math.round((data.completions / Math.max(data.totalProgress, 1)) * 100)
    : 0;

  const momentumScore = data
    ? Math.min(100, Math.round(
        (data.activeMissions * 8) +
        (completionRate * 0.5) +
        (data.avgMei * 0.3) +
        (Math.min(data.totalUsers, 100) * 0.2)
      ))
    : 0;

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-64" />
          </div>
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Skeleton className="col-span-1 xl:col-span-2 h-80 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6" style={{ background: 'rgba(34,255,170,0.1)', border: `1px solid rgba(34,255,170,0.2)` }}>
          <Building2 size={28} strokeWidth={1.5} style={{ color: t.accent }} />
        </div>
        <h2 className="text-[22px] font-bold mb-2" style={{ color: t.txt }}>No workspace yet</h2>
        <p className="text-[14px] max-w-md mb-8" style={{ color: t.txtDim }}>
          Set up your organization to access Mission Control, Analytics, and the full enterprise suite.
        </p>
        <Link href="/onboard">
          <button className="flex items-center gap-2 h-10 px-6 rounded-xl font-bold text-[13px] shadow-[0_4px_20px_rgba(34,255,170,0.3)] hover:opacity-90 transition-opacity" style={{ background: t.accent, color: t.bg }}>
            <Zap size={14} strokeWidth={2.5} />
            Create your workspace
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-6 md:mb-8">
        <div>
          <p className="text-[12px] font-medium mb-0.5" style={{ color: t.txtFaint }}>{today}</p>
          <h1 className="text-[28px] font-bold leading-tight" style={{ color: t.txt }}>
            Mission Command Center
          </h1>
          <p className="text-[14px] mt-1" style={{ color: t.txtDim }}>{orgName} · Enterprise Workspace</p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link href="/workspace/missions/new">
            <button className="flex items-center gap-2 h-9 px-4 rounded-xl font-medium text-[13px] transition-colors" style={{ background: t.card, border: `1px solid ${t.borderMid}`, color: t.txt }}>
              <Target size={14} strokeWidth={2} />
              New Mission
            </button>
          </Link>
          <Link href="/workspace/mission-control">
            <button className="flex items-center gap-2 h-9 px-4 bg-accent rounded-xl font-semibold text-[13px] shadow-[0_4px_16px_rgba(34,255,170,0.3)] hover:bg-accent-dark transition-colors" style={{ color: t.bg }}>
              <Zap size={14} strokeWidth={2.5} />
              Mission Control
            </button>
          </Link>
        </div>
      </div>

      {/* Hero Momentum + KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">

        {/* Momentum Score */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="col-span-1 rounded-2xl p-5 flex flex-col"
          style={{ background: `linear-gradient(to bottom right, ${t.card}, ${t.panel})`, border: `1px solid ${t.panel}` }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: t.txtFaint }}>Momentum</span>
            <div className="w-2 h-2 rounded-full bg-accent breathe" />
          </div>
          <div className="flex-1 flex flex-col items-center justify-center py-2">
            <div className="relative w-24 h-24">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke={t.panel} strokeWidth="8" />
                <circle
                  cx="50" cy="50" r="42" fill="none"
                  stroke={t.accent} strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 42}`}
                  strokeDashoffset={`${2 * Math.PI * 42 * (1 - momentumScore / 100)}`}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold leading-none" style={{ color: t.accent }}>{momentumScore}</span>
                <span className="text-[9px] font-bold uppercase tracking-wider mt-0.5" style={{ color: t.txtFaint }}>Score</span>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-center font-medium" style={{ color: t.txtDim }}>Mission Momentum</p>
        </motion.div>

        <StatCard
          label="Active Missions"
          value={data!.activeMissions}
          sub={`${data!.totalMissions} total`}
          icon={Target}
          color={t.accent}
          bg="rgba(34,255,170,0.08)"
          trend={12}
          delay={0.05}
        />
        <StatCard
          label="Completion Rate"
          value={`${completionRate}%`}
          sub={`${data!.completions} completions`}
          icon={CheckCircle2}
          color={t.ai}
          bg="rgba(109,93,253,0.1)"
          trend={5}
          delay={0.1}
        />
        <StatCard
          label="Avg MEI Score"
          value={data!.avgMei}
          sub="Effectiveness Index"
          icon={BarChart3}
          color={t.warning}
          bg="rgba(255,184,77,0.1)"
          trend={-2}
          delay={0.15}
        />
        <StatCard
          label="Total Participants"
          value={data!.totalUsers}
          sub={`${data!.rewardEvents} rewards issued`}
          icon={Users}
          color={t.txt}
          bg={t.panel}
          delay={0.2}
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">

        {/* Active Missions Table */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="col-span-1 xl:col-span-2 rounded-2xl overflow-hidden"
          style={{ background: t.card, border: `1px solid ${t.panel}` }}
        >
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${t.panel}` }}>
            <div className="flex items-center gap-2">
              <Activity size={15} className="text-accent" strokeWidth={2} />
              <h2 className="text-[14px] font-bold" style={{ color: t.txt }}>Active Missions</h2>
            </div>
            <Link href="/workspace/missions" className="text-[12px] flex items-center gap-1 transition-colors font-medium hover:text-accent" style={{ color: t.txtDim }}>
              View all <ChevronRight size={12} strokeWidth={2} />
            </Link>
          </div>

          {data!.recentMissions.length === 0 ? (
            <div className="py-16 text-center">
              <Target size={28} className="mx-auto mb-3" strokeWidth={1.5} style={{ color: t.txtFaint }} />
              <p className="font-medium text-sm" style={{ color: t.txtDim }}>No missions yet</p>
              <p className="text-xs mt-1 mb-4" style={{ color: t.txtFaint }}>Create your first mission to get started.</p>
              <Link href="/workspace/missions/new">
                <button className="inline-flex items-center gap-2 px-4 h-9 bg-accent rounded-xl font-semibold text-sm" style={{ color: t.bg }}>
                  Create Mission
                </button>
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-0 px-5 py-2.5" style={{ borderBottom: `1px solid ${t.panel}` }}>
                {['Mission', 'Status', 'Difficulty', 'Completions'].map((h) => (
                  <p key={h} className="text-[10px] font-bold uppercase tracking-wider" style={{ color: t.txtFaint }}>{h}</p>
                ))}
              </div>
              <div className="divide-y divide-[var(--t-elev)]">
                {data!.recentMissions.map((m) => (
                  <Link
                    key={m.id}
                    href={`/workspace/missions/${m.id}`}
                    className="grid grid-cols-4 gap-0 px-5 py-3.5 transition-colors group items-center hover:bg-[var(--t-elev)]"
                  >
                    <p className="text-[13px] font-medium truncate pr-4 group-hover:text-accent transition-colors" style={{ color: t.txt }}>{m.title}</p>
                    <Chip
                      label={m.status.charAt(0).toUpperCase() + m.status.slice(1)}
                      size="small"
                      icon={m.status === 'active' ? <span className="w-1.5 h-1.5 rounded-full breathe ml-1" style={{ background: t.accent }} /> : undefined}
                      sx={{
                        fontSize: 11, fontWeight: 700, height: 20,
                        color: m.status === 'active' ? t.accent : m.status === 'draft' ? t.warning : t.txtDim,
                        bgcolor: m.status === 'active' ? 'rgba(34,255,170,0.1)' : m.status === 'draft' ? 'rgba(255,184,77,0.1)' : 'rgba(13,21,48,0.8)',
                        border: 'none',
                        '& .MuiChip-label': { px: 1 },
                        '& .MuiChip-icon': { ml: 0.5, mr: -0.5 },
                      }}
                    />
                    <Chip
                      label={m.difficulty.charAt(0).toUpperCase() + m.difficulty.slice(1)}
                      size="small"
                      sx={{
                        fontSize: 11, fontWeight: 700, height: 20,
                        color: m.difficulty === 'easy' ? t.accent : m.difficulty === 'medium' ? t.warning : t.error,
                        bgcolor: m.difficulty === 'easy' ? 'rgba(34,255,170,0.1)' : m.difficulty === 'medium' ? 'rgba(255,184,77,0.1)' : 'rgba(255,92,122,0.1)',
                        border: 'none',
                        '& .MuiChip-label': { px: 1 },
                      }}
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold tabular-nums" style={{ color: t.txt }}>{m.completions}</span>
                      <ArrowRight size={13} className="group-hover:text-accent transition-colors ml-auto" strokeWidth={2} style={{ color: t.txtFaint }} />
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </motion.div>

        {/* AI Briefing */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl overflow-hidden flex flex-col"
          style={{ background: t.card, border: `1px solid ${t.panel}` }}
        >
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${t.panel}` }}>
            <div className="flex items-center gap-2">
              <Sparkles size={15} strokeWidth={2} style={{ color: t.ai }} />
              <h2 className="text-[14px] font-bold" style={{ color: t.txt }}>AI Briefing</h2>
            </div>
            <button
              onClick={generateBriefing}
              disabled={loadingBriefing}
              className="flex items-center gap-1.5 text-[11px] font-semibold transition-colors disabled:opacity-50 hover:text-[var(--t-ai)]"
              style={{ color: t.ai }}
            >
              <RefreshCw size={11} strokeWidth={2.5} className={loadingBriefing ? 'animate-spin' : ''} />
              {briefing ? 'Refresh' : 'Generate'}
            </button>
          </div>

          <div className="flex-1 p-4 overflow-y-auto">
            {!briefing && !loadingBriefing && (
              <div className="h-full flex flex-col items-center justify-center py-8 text-center gap-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(109,93,253,0.1)', border: '1px solid rgba(109,93,253,0.2)' }}>
                  <Sparkles size={20} strokeWidth={1.5} style={{ color: t.ai }} />
                </div>
                <div>
                  <p className="text-[13px] font-semibold" style={{ color: t.txt }}>Daily Intelligence Briefing</p>
                  <p className="text-[12px] mt-1" style={{ color: t.txtFaint }}>Powered by Insight Analyst</p>
                </div>
                <button
                  onClick={generateBriefing}
                  className="mt-2 flex items-center gap-2 h-8 px-4 rounded-lg text-[12px] font-semibold transition-colors"
                  style={{ background: 'rgba(109,93,253,0.15)', border: '1px solid rgba(109,93,253,0.3)', color: t.aiLight }}
                >
                  <Zap size={12} strokeWidth={2.5} />
                  Generate Briefing
                </button>
              </div>
            )}

            {loadingBriefing && (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className={cn('h-3', i === 1 ? 'w-3/4' : i === 3 ? 'w-5/6' : 'w-full')} />
                ))}
              </div>
            )}

            {briefing && !loadingBriefing && (
              <div className="space-y-4">
                <p className="text-[12px] leading-relaxed" style={{ color: t.txtDim }}>{briefing.summary}</p>

                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <AlertTriangle size={12} strokeWidth={2} style={{ color: t.error }} />
                    <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: t.error }}>Risks</p>
                  </div>
                  <ul className="space-y-1.5">
                    {briefing.risks.map((r, i) => (
                      <li key={i} className="text-[12px] flex gap-2" style={{ color: t.txtDim }}>
                        <span className="mt-0.5" style={{ color: t.error }}>·</span>{r}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Lightbulb size={12} strokeWidth={2} style={{ color: t.warning }} />
                    <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: t.warning }}>Opportunities</p>
                  </div>
                  <ul className="space-y-1.5">
                    {briefing.opportunities.map((o, i) => (
                      <li key={i} className="text-[12px] flex gap-2" style={{ color: t.txtDim }}>
                        <span className="mt-0.5" style={{ color: t.warning }}>·</span>{o}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Zap size={12} strokeWidth={2} style={{ color: t.accent }} />
                    <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: t.accent }}>Recommended Actions</p>
                  </div>
                  <ul className="space-y-1.5">
                    {briefing.actions.map((a, i) => (
                      <li key={i} className="text-[12px] flex gap-2 items-start" style={{ color: t.txtDim }}>
                        <span className="font-bold mt-0.5 flex-shrink-0" style={{ color: t.accent }}>{i + 1}.</span>{a}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

        {/* Outcome Overview */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="rounded-2xl p-5"
          style={{ background: t.card, border: `1px solid ${t.panel}` }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={15} strokeWidth={2} style={{ color: t.ai }} />
              <h3 className="text-[14px] font-bold" style={{ color: t.txt }}>Outcome Overview</h3>
            </div>
            <Link href="/workspace/outcomes" className="text-[11px] hover:text-accent transition-colors font-medium" style={{ color: t.txtDim }}>
              Details →
            </Link>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Completion Rate', value: completionRate, color: t.accent },
              { label: 'Engagement Index', value: Math.min(data!.avgMei, 100), color: t.ai },
              { label: 'Reward Conversion', value: data!.rewardEvents > 0 && data!.completions > 0 ? Math.min(Math.round((data!.rewardEvents / data!.completions) * 100), 100) : 0, color: t.warning },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[12px]" style={{ color: t.txtDim }}>{label}</p>
                  <p className="text-[12px] font-bold tabular-nums" style={{ color }}>{value}%</p>
                </div>
                <LinearProgress
                  variant="determinate"
                  value={value}
                  sx={{
                    height: 6, borderRadius: 3,
                    backgroundColor: 'rgba(13,21,48,0.8)',
                    '& .MuiLinearProgress-bar': { borderRadius: 3, backgroundColor: color },
                  }}
                />
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 flex items-center justify-between" style={{ borderTop: `1px solid ${t.panel}` }}>
            <p className="text-[11px]" style={{ color: t.txtFaint }}>Outcome Health Score</p>
            <p className="text-[18px] font-bold" style={{ color: t.ai }}>
              {Math.round(completionRate * 0.6 + data!.avgMei * 0.4)}
            </p>
          </div>
        </motion.div>

        {/* Activity Feed */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="col-span-2 rounded-2xl overflow-hidden"
          style={{ background: t.card, border: `1px solid ${t.panel}` }}
        >
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${t.panel}` }}>
            <div className="flex items-center gap-2">
              <Activity size={15} strokeWidth={2} style={{ color: t.warning }} />
              <h3 className="text-[14px] font-bold" style={{ color: t.txt }}>Mission Activity Feed</h3>
            </div>
            <Link href="/workspace/outcomes" className="text-[12px] hover:text-accent flex items-center gap-1 transition-colors font-medium" style={{ color: t.txtDim }}>
              View all <ChevronRight size={12} strokeWidth={2} />
            </Link>
          </div>
          {data!.recentActivity.length === 0 ? (
            <div className="py-12 text-center">
              <Clock size={24} className="mx-auto mb-2" strokeWidth={1.5} style={{ color: t.txtFaint }} />
              <p className="text-sm font-medium" style={{ color: t.txtDim }}>No activity yet</p>
              <p className="text-xs mt-1" style={{ color: t.txtFaint }}>Activity will appear as participants engage with missions.</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: t.panel }}>
              {data!.recentActivity.map((a, i) => (
                <div key={a.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: a.type === 'completion' ? 'rgba(34,255,170,0.1)' : 'rgba(109,93,253,0.1)' }}
                  >
                    {a.type === 'completion'
                      ? <Award size={13} strokeWidth={2} style={{ color: t.accent }} />
                      : <Target size={13} strokeWidth={2} style={{ color: t.ai }} />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate" style={{ color: t.txt }}>{a.label}</p>
                  </div>
                  <p className="text-[11px] font-medium flex-shrink-0" style={{ color: t.txtFaint }}>{a.time || '—'}</p>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
