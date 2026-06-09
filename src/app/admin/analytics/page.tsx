'use client';

import { useState, useEffect } from 'react';
import {
  BarChart3, TrendingUp, Users, CheckCircle2, Target,
  Clock, Zap, Award, Sparkles, Loader2, FileText, AlertCircle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { DbMission, DbMissionProgress } from '@/lib/supabase/types';
import type { InsightAnalystOutput } from '@/lib/agents/types';
import { cn } from '@/lib/cn';

interface MissionStat {
  mission: DbMission;
  completions: number;
  attempts: number;
  completionRate: number;
}

const DIFFICULTY_BAR: Record<string, string> = {
  easy: 'bg-[#00e676]',
  medium: 'bg-[#fbbf24]',
  hard: 'bg-[#ff5252]',
};

export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState<MissionStat[]>([]);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [totalCompletions, setTotalCompletions] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [tenantName, setTenantName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [insightResult, setInsightResult] = useState<InsightAnalystOutput | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightError, setInsightError] = useState('');

  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase.from('user_profiles').select('tenant_id').eq('id', user.id).single();
      if (!profile?.tenant_id) return;
      const tid = profile.tenant_id;

      const [tenantRes, missionsRes, progressRes, usersRes] = await Promise.all([
        supabase.from('tenants').select('name').eq('id', tid).single(),
        supabase.from('missions').select('*').eq('tenant_id', tid),
        supabase.from('mission_progress').select('*').eq('tenant_id', tid),
        supabase.from('user_profiles').select('id', { count: 'exact' }).eq('tenant_id', tid),
      ]);

      const missions: DbMission[] = missionsRes.data ?? [];
      const progress: DbMissionProgress[] = progressRes.data ?? [];

      const missionStats: MissionStat[] = missions.map((m) => {
        const mProgress = progress.filter((p) => p.mission_id === m.id);
        const attempts = mProgress.length;
        const completions = mProgress.filter((p) => p.completed_at !== null).length;
        return { mission: m, attempts, completions, completionRate: attempts > 0 ? Math.round((completions / attempts) * 100) : 0 };
      });

      missionStats.sort((a, b) => b.completions - a.completions);

      setStats(missionStats);
      setTotalAttempts(progress.length);
      setTotalCompletions(progress.filter((p) => p.completed_at !== null).length);
      setTotalUsers(usersRes.count ?? 0);
      setTenantName(tenantRes.data?.name ?? '');
      setLoading(false);
    }
    load();
  }, [supabase]);

  const overallRate = totalAttempts > 0 ? Math.round((totalCompletions / totalAttempts) * 100) : 0;

  async function generateReport() {
    setInsightError('');
    setInsightLoading(true);
    try {
      const res = await fetch('/api/agents/insight-analyst', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_name: tenantName || 'Your Workspace',
          period_days: 30,
          total_missions: stats.length,
          active_missions: stats.filter((s) => s.mission.status === 'active' || s.mission.status === 'published').length,
          total_users: totalUsers,
          total_attempts: totalAttempts,
          total_completions: totalCompletions,
          completion_rate_pct: overallRate,
          top_missions: stats.slice(0, 5).map((s) => ({ title: s.mission.title, completions: s.completions, rate_pct: s.completionRate })),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setInsightResult(await res.json() as InsightAnalystOutput);
    } catch (e) {
      setInsightError(e instanceof Error ? e.message : 'Failed to generate report');
    }
    setInsightLoading(false);
  }

  const topMetrics = [
    { label: 'Total Users', value: totalUsers, icon: Users, color: 'text-[#22d3ee]', bg: 'bg-[#001a22]' },
    { label: 'Total Attempts', value: totalAttempts, icon: Target, color: 'text-[#fbbf24]', bg: 'bg-[#2a1a00]' },
    { label: 'Completions', value: totalCompletions, icon: CheckCircle2, color: 'text-accent', bg: 'bg-accent/10' },
    { label: 'Completion Rate', value: `${overallRate}%`, icon: TrendingUp, color: 'text-[#818cf8]', bg: 'bg-[#0f0f2a]' },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-[28px] font-bold text-[#e8f0fe]">Analytics</h1>
        <p className="text-[#7a8fa8] text-sm mt-0.5">Mission engagement across your workspace</p>
      </div>

      {/* Top metrics */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {topMetrics.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-[#111927] border border-[#1c2a3a] rounded-2xl p-5">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-4', bg)}>
              <Icon size={20} className={color} strokeWidth={2} />
            </div>
            <p className={cn('text-[28px] font-bold', color)}>{value}</p>
            <p className="text-[#7a8fa8] text-[13px] font-medium mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Mission performance table */}
      <div className="bg-[#111927] border border-[#1c2a3a] rounded-2xl overflow-hidden mb-6">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-[#1c2a3a]">
          <BarChart3 size={16} className="text-accent" strokeWidth={2} />
          <h2 className="text-[15px] font-bold text-[#e8f0fe]">Mission Performance</h2>
        </div>

        {loading ? (
          <div className="py-16 flex justify-center">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : stats.length === 0 ? (
          <div className="py-16 text-center">
            <BarChart3 size={32} className="text-[#3d5068] mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-[#7a8fa8]">No data yet — create missions and get participants started</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[1fr_80px_80px_80px_160px] gap-4 px-6 py-3 border-b border-[#1c2a3a]">
              {['Mission', 'Attempts', 'Completions', 'Difficulty', 'Completion Rate'].map((h) => (
                <span key={h} className="text-[11px] font-bold text-[#3d5068] uppercase tracking-wider">{h}</span>
              ))}
            </div>
            <div className="divide-y divide-[#1c2a3a]">
              {stats.map(({ mission: m, attempts, completions, completionRate }) => (
                <div key={m.id} className="grid grid-cols-[1fr_80px_80px_80px_160px] gap-4 items-center px-6 py-4 hover:bg-[#162030] transition-colors">
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-[#e8f0fe] truncate">{m.title}</p>
                    <p className="text-[12px] text-[#7a8fa8] mt-0.5">{m.estimated_time ?? '—'}</p>
                  </div>
                  <span className="text-[14px] font-semibold text-[#e8f0fe]">{attempts}</span>
                  <span className="text-[14px] font-semibold text-accent">{completions}</span>
                  <span className={cn(
                    'text-[11px] font-bold px-2.5 py-1 rounded-full self-start',
                    m.difficulty === 'easy' ? 'text-[#00e676] bg-[#002918]'
                    : m.difficulty === 'medium' ? 'text-[#fbbf24] bg-[#2a1a00]'
                    : 'text-[#ff5252] bg-[#2a0a0a]'
                  )}>
                    {m.difficulty.charAt(0).toUpperCase() + m.difficulty.slice(1)}
                  </span>
                  <div className="flex items-center gap-2.5">
                    <div className="flex-1 h-2 bg-[#162030] rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full transition-all duration-500', DIFFICULTY_BAR[m.difficulty])} style={{ width: `${completionRate}%` }} />
                    </div>
                    <span className="text-[13px] font-semibold text-[#e8f0fe] w-9 text-right">{completionRate}%</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Insight cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { icon: Zap, color: 'text-[#fbbf24]', bg: 'bg-[#2a1a00]', title: 'Highest Completion', body: stats.length > 0 ? `${stats[0].mission.title} — ${stats[0].completionRate}% rate` : 'No data yet' },
          { icon: Clock, color: 'text-[#22d3ee]', bg: 'bg-[#001a22]', title: 'Most Attempted', body: stats.length > 0 ? `${[...stats].sort((a,b)=>b.attempts-a.attempts)[0].mission.title} — ${[...stats].sort((a,b)=>b.attempts-a.attempts)[0].attempts} starts` : 'No data yet' },
          { icon: Award, color: 'text-accent', bg: 'bg-accent/10', title: 'Overall Engagement', body: totalAttempts > 0 ? `${overallRate}% of starts reach completion across all missions` : 'Launch missions to track engagement' },
        ].map(({ icon: Icon, color, bg, title, body }) => (
          <div key={title} className="bg-[#111927] border border-[#1c2a3a] rounded-2xl p-5">
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3', bg)}>
              <Icon size={18} className={color} strokeWidth={2} />
            </div>
            <p className="text-[14px] font-bold text-[#e8f0fe] mb-1">{title}</p>
            <p className="text-[13px] text-[#7a8fa8] leading-snug">{body}</p>
          </div>
        ))}
      </div>

      {/* AI Executive Report */}
      <div className="bg-[#111927] border border-[#1c2a3a] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1c2a3a]">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-ai" strokeWidth={2} />
            <h2 className="text-[15px] font-bold text-[#e8f0fe]">AI Executive Report</h2>
            <span className="text-[11px] font-semibold text-ai bg-ai/10 border border-ai/20 px-2 py-0.5 rounded-full">Insight Analyst</span>
          </div>
          <button
            onClick={generateReport}
            disabled={insightLoading || loading}
            className="flex items-center gap-2 h-9 px-4 bg-ai/10 border border-ai/20 rounded-xl text-ai text-sm font-semibold hover:bg-ai/20 transition-colors disabled:opacity-60"
          >
            {insightLoading ? <Loader2 size={14} className="animate-spin" strokeWidth={2} /> : <FileText size={14} strokeWidth={2} />}
            {insightResult ? 'Regenerate' : 'Generate Report'}
          </button>
        </div>

        {insightError && (
          <div className="flex items-center gap-2 bg-[#2a0a0a] border-b border-[#ff5252]/20 px-6 py-3">
            <AlertCircle size={14} className="text-[#ff5252]" strokeWidth={2} />
            <p className="text-[13px] text-[#ff5252]">{insightError}</p>
          </div>
        )}

        {insightLoading && (
          <div className="flex flex-col items-center py-12 gap-3">
            <Loader2 size={28} className="text-ai animate-spin" strokeWidth={1.5} />
            <p className="text-[13px] text-[#7a8fa8]">Analysing workspace data…</p>
          </div>
        )}

        {insightResult !== null && !insightLoading && (
          <div className="p-6 space-y-6">
            {/* Headline + summary */}
            <div>
              <p className="text-[11px] font-bold text-ai uppercase tracking-widest mb-2">Headline</p>
              <h3 className="text-[17px] font-bold text-[#e8f0fe] mb-2">{insightResult.headline}</h3>
              <p className="text-[14px] text-[#7a8fa8] leading-relaxed">{insightResult.summary}</p>
            </div>

            <div className="grid grid-cols-3 gap-5">
              {/* Key findings */}
              {insightResult.key_findings.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold text-[#7a8fa8] uppercase tracking-widest mb-3">Key Findings</p>
                  <ul className="space-y-2">
                    {insightResult.key_findings.map((f, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-accent font-bold text-[12px] mt-0.5 flex-shrink-0">→</span>
                        <p className="text-[13px] text-[#e8f0fe] leading-snug">{f}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Opportunities */}
              {insightResult.opportunities.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold text-[#7a8fa8] uppercase tracking-widest mb-3">Opportunities</p>
                  <ul className="space-y-2">
                    {insightResult.opportunities.map((o, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-[#fbbf24] font-bold text-[12px] mt-0.5 flex-shrink-0">◆</span>
                        <p className="text-[13px] text-[#e8f0fe] leading-snug">{o}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Risks */}
              {insightResult.risks.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold text-[#7a8fa8] uppercase tracking-widest mb-3">Risks</p>
                  <ul className="space-y-2">
                    {insightResult.risks.map((r, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-[#ff5252] font-bold text-[12px] mt-0.5 flex-shrink-0">!</span>
                        <p className="text-[13px] text-[#e8f0fe] leading-snug">{r}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Recommended actions */}
            {insightResult.recommended_actions.length > 0 && (
              <div className="bg-[#0f1824] rounded-2xl p-5 border border-[#1c2a3a]">
                <p className="text-[11px] font-bold text-[#7a8fa8] uppercase tracking-widest mb-3">Recommended Actions</p>
                <ol className="space-y-2">
                  {insightResult.recommended_actions.map((a, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="w-5 h-5 bg-ai/10 border border-ai/20 rounded-full text-ai text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                      <p className="text-[13px] text-[#e8f0fe] leading-snug">{a}</p>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* ROI narrative */}
            {insightResult.roi_narrative && (
              <div className="bg-ai/5 border border-ai/15 rounded-2xl px-5 py-4">
                <p className="text-[11px] font-bold text-ai uppercase tracking-widest mb-2">ROI Narrative</p>
                <p className="text-[14px] text-[#e8f0fe] leading-relaxed">{insightResult.roi_narrative}</p>
              </div>
            )}
          </div>
        )}

        {insightResult === null && !insightLoading && !insightError && (
          <div className="flex flex-col items-center py-12 text-center">
            <Sparkles size={28} className="text-[#1c2a3a] mb-3" strokeWidth={1.5} />
            <p className="text-[#7a8fa8] text-sm font-medium mb-1">AI-powered mission intelligence</p>
            <p className="text-[#3d5068] text-[13px]">Generate an executive report to surface insights, opportunities, and risks across your mission portfolio.</p>
          </div>
        )}
      </div>
    </div>
  );
}
