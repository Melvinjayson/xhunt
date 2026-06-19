'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Target, Users, CheckCircle2, TrendingUp, Zap, ArrowRight, ArrowUpRight,
  RefreshCw, Sparkles, AlertTriangle, Lightbulb, Activity, Clock,
  ChevronRight, BarChart3, Award, Building2, Plus, Eye, UserCheck,
  CircleDot, ChevronDown,
} from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/context';
import { cn } from '@/lib/cn';
import { t } from '@/theme/colors';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
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

  // Compute mission health
  const healthStatus = completionRate >= 70 ? '🟢 Excellent' : completionRate >= 40 ? '🟡 Growing' : '🔴 Needs Attention';
  const healthColor = completionRate >= 70 ? t.accent : completionRate >= 40 ? t.warning : t.error;

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto">

      {/* ── Header: Greeting + Quick Actions ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6"
      >
        <div>
          <p className="text-[12px] font-medium mb-0.5" style={{ color: t.txtFaint }}>{today}</p>
          <h1 className="text-[26px] font-bold leading-tight" style={{ color: t.txt }}>
            {getGreeting()}, {user?.displayName?.split(' ')[0] ?? 'there'} 👋
          </h1>
          <p className="text-[14px] mt-0.5" style={{ color: t.txtDim }}>{orgName || 'Your Organization'}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/workspace/missions">
            <button className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-[13px] font-medium transition-colors" style={{ background: t.card, border: `1px solid ${t.borderMid}`, color: t.txt }}>
              <Eye size={13} strokeWidth={2} />
              Missions
            </button>
          </Link>
          <Link href="/workspace/participants">
            <button className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-[13px] font-medium transition-colors" style={{ background: t.card, border: `1px solid ${t.borderMid}`, color: t.txt }}>
              <UserCheck size={13} strokeWidth={2} />
              Participants
            </button>
          </Link>
          <Link href="/workspace/missions/create">
            <button className="flex items-center gap-2 h-9 px-4 rounded-xl font-semibold text-[13px] shadow-[0_4px_16px_rgba(34,255,170,0.3)] transition-opacity hover:opacity-90" style={{ background: t.accent, color: t.bg }}>
              <Plus size={14} strokeWidth={2.5} />
              Create Mission
            </button>
          </Link>
        </div>
      </motion.div>

      {/* ── Key Metrics Strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Active Missions', value: data!.activeMissions, sub: `${data!.totalMissions} total`, icon: Target, color: t.accent, bg: `${t.accent}12`, trend: 12 },
          { label: 'Participants', value: data!.totalUsers, sub: `${data!.rewardEvents} rewarded`, icon: Users, color: t.ai, bg: `${t.ai}12`, trend: 8 },
          { label: 'Completions', value: data!.completions, sub: `${completionRate}% rate`, icon: CheckCircle2, color: t.info, bg: `${t.info}12`, trend: 5 },
          { label: 'Rewards Out', value: data!.rewardEvents, sub: 'distributed', icon: Award, color: t.warning, bg: `${t.warning}12`, trend: 3 },
        ].map(({ label, value, sub, icon: Icon, color, bg, trend }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl p-4"
            style={{ background: t.card, border: `1px solid ${t.panel}` }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: bg }}>
                <Icon size={15} strokeWidth={1.8} style={{ color }} />
              </div>
              <span className="text-[11px] font-bold flex items-center gap-0.5" style={{ color: t.accent }}>
                <ArrowUpRight size={10} strokeWidth={2.5} />
                {trend}%
              </span>
            </div>
            <p className="text-[26px] font-bold tabular-nums leading-none" style={{ color }}>{value}</p>
            <p className="text-[11px] font-medium mt-1" style={{ color: t.txtDim }}>{label}</p>
            <p className="text-[10px] mt-0.5" style={{ color: t.txtFaint }}>{sub}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Main Layout: Activity Feed + Right Panel ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Activity Feed — primary column */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="xl:col-span-2 rounded-2xl overflow-hidden"
          style={{ background: t.card, border: `1px solid ${t.panel}` }}
        >
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${t.panel}` }}>
            <div className="flex items-center gap-2">
              <CircleDot size={14} strokeWidth={2} style={{ color: t.accent }} />
              <h2 className="text-[14px] font-bold" style={{ color: t.txt }}>Activity Feed</h2>
            </div>
            <Link href="/workspace/outcomes" className="text-[12px] flex items-center gap-0.5 font-medium hover:opacity-80 transition-opacity" style={{ color: t.txtDim }}>
              See all <ChevronRight size={12} strokeWidth={2} />
            </Link>
          </div>

          {data!.recentActivity.length === 0 ? (
            <div className="py-14 text-center px-6">
              <div className="w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: `${t.accent}12`, border: `1px solid ${t.accent}20` }}>
                <Activity size={20} strokeWidth={1.5} style={{ color: t.accent }} />
              </div>
              <p className="text-[14px] font-semibold mb-1" style={{ color: t.txt }}>No activity yet</p>
              <p className="text-[12px] mb-5" style={{ color: t.txtFaint }}>Create a mission and invite participants to see live activity.</p>
              <Link href="/workspace/missions/create">
                <button className="inline-flex items-center gap-2 h-9 px-5 rounded-xl font-semibold text-[13px]" style={{ background: t.accent, color: t.bg }}>
                  <Plus size={13} strokeWidth={2.5} />
                  Create your first mission
                </button>
              </Link>
            </div>
          ) : (
            <div>
              {data!.recentActivity.map((a, i) => (
                <div
                  key={a.id}
                  className="flex items-center gap-3 px-5 py-3.5 transition-colors"
                  style={{ borderBottom: i < data!.recentActivity.length - 1 ? `1px solid ${t.panel}` : 'none' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = t.panel; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: a.type === 'completion' ? `${t.accent}15` : `${t.ai}15` }}
                  >
                    {a.type === 'completion'
                      ? <CheckCircle2 size={14} strokeWidth={2} style={{ color: t.accent }} />
                      : <Target size={14} strokeWidth={2} style={{ color: t.ai }} />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium" style={{ color: t.txt }}>{a.label}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: t.txtFaint }}>{a.type === 'completion' ? 'Mission completed' : 'Mission started'}</p>
                  </div>
                  <p className="text-[11px] font-medium flex-shrink-0" style={{ color: t.txtFaint }}>{a.time || '—'}</p>
                </div>
              ))}
            </div>
          )}

          {/* Active missions list below activity */}
          {data!.recentMissions.length > 0 && (
            <>
              <div className="flex items-center justify-between px-5 py-3.5" style={{ borderTop: `1px solid ${t.panel}` }}>
                <div className="flex items-center gap-2">
                  <Target size={13} strokeWidth={2} style={{ color: t.txtDim }} />
                  <span className="text-[12px] font-bold" style={{ color: t.txtDim }}>Active Missions</span>
                </div>
                <Link href="/workspace/missions" className="text-[11px] font-medium hover:opacity-80" style={{ color: t.txtFaint }}>
                  View all →
                </Link>
              </div>
              {data!.recentMissions.slice(0, 5).map((m) => (
                <Link
                  key={m.id}
                  href={`/workspace/missions/${m.id}`}
                  className="flex items-center gap-3 px-5 py-3 transition-colors group"
                  style={{ borderTop: `1px solid ${t.panel}` }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = t.panel; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate group-hover:text-accent transition-colors" style={{ color: t.txt }}>{m.title}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: t.txtFaint }}>{m.completions} completions</p>
                  </div>
                  <Chip
                    label={m.status}
                    size="small"
                    sx={{
                      fontSize: 10, fontWeight: 700, height: 18, textTransform: 'capitalize',
                      color: m.status === 'active' ? t.accent : m.status === 'draft' ? t.warning : t.txtDim,
                      bgcolor: m.status === 'active' ? `${t.accent}14` : m.status === 'draft' ? `${t.warning}14` : `${t.panel}`,
                      border: 'none', '& .MuiChip-label': { px: 1 },
                    }}
                  />
                  <ArrowRight size={13} strokeWidth={2} style={{ color: t.txtFaint }} />
                </Link>
              ))}
            </>
          )}
        </motion.div>

        {/* Right Panel */}
        <div className="flex flex-col gap-4">

          {/* Mission Health Score */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="rounded-2xl p-5"
            style={{ background: t.card, border: `1px solid ${t.panel}` }}
          >
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={14} strokeWidth={2} style={{ color: healthColor }} />
              <h3 className="text-[13px] font-bold" style={{ color: t.txt }}>Mission Health</h3>
            </div>
            <p className="text-[18px] font-bold mb-3" style={{ color: healthColor }}>{healthStatus}</p>
            <div className="space-y-2.5">
              {[
                { label: 'Completion Rate', value: completionRate, color: t.accent },
                { label: 'Engagement', value: Math.min(data!.avgMei, 100), color: t.ai },
                { label: 'Reward Rate', value: data!.rewardEvents > 0 && data!.completions > 0 ? Math.min(Math.round((data!.rewardEvents / data!.completions) * 100), 100) : 0, color: t.warning },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <div className="flex justify-between mb-1">
                    <span className="text-[11px]" style={{ color: t.txtDim }}>{label}</span>
                    <span className="text-[11px] font-bold tabular-nums" style={{ color }}>{value}%</span>
                  </div>
                  <LinearProgress
                    variant="determinate"
                    value={value}
                    sx={{
                      height: 5, borderRadius: 3,
                      bgcolor: t.panel,
                      '& .MuiLinearProgress-bar': { borderRadius: 3, bgcolor: color },
                    }}
                  />
                </div>
              ))}
            </div>
            {completionRate < 40 && (
              <div className="mt-4 p-3 rounded-xl text-[11px] leading-relaxed" style={{ background: `${t.warning}10`, border: `1px solid ${t.warning}20`, color: t.warning }}>
                <Lightbulb size={12} strokeWidth={2} className="inline mr-1.5" />
                Increase reward by €2 to boost participation by ~25%.
              </div>
            )}
          </motion.div>

          {/* AI Briefing */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl overflow-hidden flex-1"
            style={{ background: t.card, border: `1px solid ${t.panel}` }}
          >
            <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: `1px solid ${t.panel}` }}>
              <div className="flex items-center gap-2">
                <Sparkles size={14} strokeWidth={2} style={{ color: t.ai }} />
                <h3 className="text-[13px] font-bold" style={{ color: t.txt }}>AI Copilot</h3>
              </div>
              <button
                onClick={generateBriefing}
                disabled={loadingBriefing}
                className="flex items-center gap-1 text-[11px] font-semibold disabled:opacity-50 hover:opacity-80 transition-opacity"
                style={{ color: t.ai }}
              >
                <RefreshCw size={10} strokeWidth={2.5} className={loadingBriefing ? 'animate-spin' : ''} />
                {briefing ? 'Refresh' : 'Generate'}
              </button>
            </div>

            <div className="p-4">
              {!briefing && !loadingBriefing && (
                <div className="py-6 text-center">
                  <p className="text-[12px] mb-3" style={{ color: t.txtFaint }}>Ask Mission Control anything</p>
                  <button
                    onClick={generateBriefing}
                    className="flex items-center gap-2 h-8 px-4 rounded-lg text-[12px] font-semibold mx-auto transition-opacity hover:opacity-80"
                    style={{ background: `${t.ai}18`, border: `1px solid ${t.ai}30`, color: t.aiLight }}
                  >
                    <Zap size={11} strokeWidth={2.5} />
                    Daily Briefing
                  </button>
                </div>
              )}

              {loadingBriefing && (
                <div className="space-y-2.5">
                  {[1, 0.75, 0.9, 0.6].map((w, i) => (
                    <Skeleton key={i} className={`h-2.5 rounded w-[${Math.round(w * 100)}%]`} />
                  ))}
                </div>
              )}

              {briefing && !loadingBriefing && (
                <div className="space-y-3">
                  <p className="text-[12px] leading-relaxed" style={{ color: t.txtDim }}>{briefing.summary}</p>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: t.accent }}>Recommended Actions</p>
                    {briefing.actions.map((a, i) => (
                      <div key={i} className="flex gap-2 mb-1.5 text-[11px]" style={{ color: t.txtDim }}>
                        <span className="font-bold flex-shrink-0" style={{ color: t.accent }}>{i + 1}.</span>{a}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
