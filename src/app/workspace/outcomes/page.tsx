'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, CheckCircle2, Award, BarChart3, Users, ArrowUpRight,
  Filter, Search, Clock, Shield, AlertCircle, FileCheck, Sparkles,
  ChevronRight, Target, RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/cn';
import type { DbOutcomeValidation, DbMissionScore } from '@/lib/supabase/types';

interface OutcomeMetrics {
  completionRate: number;
  engagementScore: number;
  retentionScore: number;
  outcomeScore: number;
  totalValidations: number;
  pendingValidations: number;
  approvedValidations: number;
  rewardConversion: number;
  meiAvg: number;
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('bg-[#0D1530] animate-pulse rounded-lg', className)} />;
}

const VALIDATION_STATUS = {
  pending:          { label: 'Pending',          color: 'text-[#FFB84D]', bg: 'bg-[#FFB84D]/10' },
  under_review:     { label: 'Under Review',     color: 'text-[#6D5DFD]', bg: 'bg-[#6D5DFD]/10' },
  approved:         { label: 'Approved',         color: 'text-[#22FFAA]', bg: 'bg-[#22FFAA]/10' },
  rejected:         { label: 'Rejected',         color: 'text-[#FF5C7A]', bg: 'bg-[#FF5C7A]/10' },
  requires_evidence:{ label: 'Needs Evidence',  color: 'text-[#FFB84D]', bg: 'bg-[#FFB84D]/10' },
};

export default function OutcomesPage() {
  const [metrics, setMetrics] = useState<OutcomeMetrics | null>(null);
  const [validations, setValidations] = useState<DbOutcomeValidation[]>([]);
  const [scores, setScores] = useState<DbMissionScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('user_profiles').select('tenant_id').eq('id', user.id).single();
      if (!profile?.tenant_id) return;

      const [progressRes, validationRes, scoresRes, rewardRes] = await Promise.all([
        supabase.from('mission_progress').select('completed_at, user_id').eq('tenant_id', profile.tenant_id),
        supabase.from('outcome_validations').select('*').eq('tenant_id', profile.tenant_id).order('created_at', { ascending: false }).limit(50),
        supabase.from('mission_scores').select('*').eq('tenant_id', profile.tenant_id),
        supabase.from('reward_events').select('id, redeemed').eq('tenant_id', profile.tenant_id),
      ]);

      const progress = progressRes.data ?? [];
      const vals = validationRes.data ?? [];
      const sc = scoresRes.data ?? [];
      const rewards = rewardRes.data ?? [];

      const total = progress.length;
      const completed = progress.filter((p) => p.completed_at).length;
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

      const avgScores = sc.length ? {
        engagement: Math.round(sc.reduce((a, s) => a + (s.engagement_score ?? 0), 0) / sc.length),
        retention:  Math.round(sc.reduce((a, s) => a + (s.retention_score  ?? 0), 0) / sc.length),
        outcome:    Math.round(sc.reduce((a, s) => a + (s.outcome_score    ?? 0), 0) / sc.length),
        mei:        Math.round(sc.reduce((a, s) => a + (s.mei              ?? 0), 0) / sc.length),
      } : { engagement: 0, retention: 0, outcome: 0, mei: 0 };

      const redeemed = rewards.filter((r) => r.redeemed).length;
      const rewardConversion = rewards.length > 0 ? Math.round((redeemed / rewards.length) * 100) : 0;

      setMetrics({
        completionRate,
        engagementScore: avgScores.engagement,
        retentionScore:  avgScores.retention,
        outcomeScore:    avgScores.outcome,
        totalValidations:   vals.length,
        pendingValidations: vals.filter((v) => v.status === 'pending' || v.status === 'under_review').length,
        approvedValidations: vals.filter((v) => v.status === 'approved').length,
        rewardConversion,
        meiAvg: avgScores.mei,
      });
      setValidations(vals);
      setScores(sc);
      setLoading(false);
    }
    load();
  }, [supabase]);

  const filtered = statusFilter === 'all' ? validations : validations.filter((v) => v.status === statusFilter);

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <Skeleton className="h-60 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  const outcomeHealth = metrics
    ? Math.round(metrics.completionRate * 0.4 + metrics.engagementScore * 0.3 + metrics.retentionScore * 0.3)
    : 0;

  return (
    <div className="p-8 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#6D5DFD]/10 border border-[#6D5DFD]/20 flex items-center justify-center">
            <TrendingUp size={18} className="text-[#6D5DFD]" strokeWidth={1.8} />
          </div>
          <div>
            <h1 className="text-[22px] font-bold text-[#F0F4FF]">Outcomes Center</h1>
            <p className="text-[#4A5578] text-[12px]">Measure and validate real-world impact</p>
          </div>
        </div>
        <Link href="/admin/outcomes/validation">
          <button className="flex items-center gap-2 h-9 px-4 bg-[#0A1226] border border-[#162440] text-[#F0F4FF] rounded-xl font-medium text-[13px] hover:border-[#6D5DFD]/40 transition-colors">
            <FileCheck size={14} strokeWidth={2} />
            Validation Queue
            {(metrics?.pendingValidations ?? 0) > 0 && (
              <span className="w-5 h-5 rounded-full bg-[#FFB84D] text-[#060a0e] text-[10px] font-bold flex items-center justify-center">
                {metrics!.pendingValidations}
              </span>
            )}
          </button>
        </Link>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Completion Rate',  value: `${metrics!.completionRate}%`,  icon: CheckCircle2, color: 'text-[#22FFAA]', bg: 'bg-[#22FFAA]/8',  trend: 5  },
          { label: 'Engagement Score', value: metrics!.engagementScore,       icon: Users,        color: 'text-[#6D5DFD]', bg: 'bg-[#6D5DFD]/10', trend: 3  },
          { label: 'Retention Score',  value: metrics!.retentionScore,        icon: RefreshCw,    color: 'text-[#FFB84D]', bg: 'bg-[#FFB84D]/10', trend: -1 },
          { label: 'Reward Conversion',value: `${metrics!.rewardConversion}%`,icon: Award,        color: 'text-[#F0F4FF]', bg: 'bg-[#0D1530]',    trend: 8  },
        ].map(({ label, value, icon: Icon, color, bg, trend }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="bg-[#0A1226] border border-[#0F1D35] rounded-2xl p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', bg)}>
                <Icon size={16} className={color} strokeWidth={1.8} />
              </div>
              <span className={cn('text-[11px] font-bold flex items-center gap-0.5', trend >= 0 ? 'text-[#22FFAA]' : 'text-[#FF5C7A]')}>
                <ArrowUpRight size={11} strokeWidth={2.5} className={trend < 0 ? 'rotate-180' : ''} />
                {Math.abs(trend)}%
              </span>
            </div>
            <p className={cn('text-2xl font-bold tabular-nums', color)}>{value}</p>
            <p className="text-[#4A5578] text-[11px] mt-0.5 font-medium">{label}</p>
          </motion.div>
        ))}
      </div>

      {/* Outcome Overview + Forecast */}
      <div className="grid grid-cols-3 gap-4">

        {/* Score Overview */}
        <div className="bg-[#0A1226] border border-[#0F1D35] rounded-2xl p-5">
          <p className="text-[11px] font-bold text-[#4A5578] uppercase tracking-wider mb-4">Outcome Health</p>

          <div className="flex items-center justify-center mb-5">
            <div className="relative w-28 h-28">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#0F1D35" strokeWidth="8" />
                <circle
                  cx="50" cy="50" r="40" fill="none"
                  stroke={outcomeHealth >= 70 ? '#22FFAA' : outcomeHealth >= 40 ? '#FFB84D' : '#FF5C7A'}
                  strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - outcomeHealth / 100)}`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={cn('text-2xl font-bold', outcomeHealth >= 70 ? 'text-[#22FFAA]' : outcomeHealth >= 40 ? 'text-[#FFB84D]' : 'text-[#FF5C7A]')}>{outcomeHealth}</span>
                <span className="text-[9px] font-bold text-[#4A5578] uppercase">Health</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {[
              { label: 'Completion', value: metrics!.completionRate, color: '#22FFAA' },
              { label: 'Engagement', value: metrics!.engagementScore, color: '#6D5DFD' },
              { label: 'Retention',  value: metrics!.retentionScore,  color: '#FFB84D' },
              { label: 'Outcome',    value: metrics!.outcomeScore,    color: '#F0F4FF' },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-[#8B9CC0]">{label}</span>
                  <span className="font-bold tabular-nums" style={{ color }}>{value}%</span>
                </div>
                <div className="h-1.5 bg-[#0D1530] rounded-full">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${value}%` }}
                    transition={{ delay: 0.5, duration: 0.8 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* MEI Scores by Mission */}
        <div className="col-span-2 bg-[#0A1226] border border-[#0F1D35] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#0F1D35]">
            <div className="flex items-center gap-2">
              <BarChart3 size={14} className="text-[#22FFAA]" strokeWidth={2} />
              <p className="text-[13px] font-bold text-[#F0F4FF]">Mission Effectiveness Index</p>
            </div>
            <span className="text-[11px] font-bold text-[#22FFAA] bg-[#22FFAA]/10 px-2.5 py-1 rounded-full">
              Avg {metrics!.meiAvg}
            </span>
          </div>
          {scores.length === 0 ? (
            <div className="py-16 text-center">
              <BarChart3 size={28} className="text-[#4A5578] mx-auto mb-2" strokeWidth={1.5} />
              <p className="text-[#8B9CC0] font-medium">No MEI data yet</p>
              <p className="text-[#4A5578] text-sm mt-1">MEI scores appear as participants complete missions.</p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {scores.slice(0, 8).map((s, i) => (
                <div key={s.id} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[12px] text-[#8B9CC0] font-medium">Mission Score {i + 1}</p>
                      <p className={cn('text-[12px] font-bold tabular-nums',
                        s.mei >= 70 ? 'text-[#22FFAA]' : s.mei >= 40 ? 'text-[#FFB84D]' : 'text-[#FF5C7A]'
                      )}>MEI {s.mei}</p>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {[
                        { v: s.completion_score, c: '#22FFAA' },
                        { v: s.engagement_score, c: '#6D5DFD' },
                        { v: s.retention_score,  c: '#FFB84D' },
                        { v: s.outcome_score,    c: '#F0F4FF' },
                      ].map(({ v, c }, j) => (
                        <div key={j} className="h-1.5 bg-[#0D1530] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${v ?? 0}%`, backgroundColor: c }} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Validation Queue */}
      <div className="bg-[#0A1226] border border-[#0F1D35] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#0F1D35]">
          <div className="flex items-center gap-2">
            <FileCheck size={14} className="text-[#6D5DFD]" strokeWidth={2} />
            <p className="text-[13px] font-bold text-[#F0F4FF]">Outcome Validations</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-[#07101F] border border-[#0F1D35] rounded-xl p-1">
              {['all', 'pending', 'under_review', 'approved', 'rejected'].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    'px-2.5 h-6 rounded-lg text-[10px] font-semibold transition-all capitalize',
                    statusFilter === s ? 'bg-[#0D1530] text-[#F0F4FF]' : 'text-[#4A5578] hover:text-[#8B9CC0]'
                  )}
                >{s.replace('_', ' ')}</button>
              ))}
            </div>
            <Link href="/admin/outcomes/validation">
              <button className="text-[11px] font-semibold text-accent hover:text-accent-dark transition-colors flex items-center gap-1">
                Manage <ChevronRight size={11} strokeWidth={2} />
              </button>
            </Link>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-12 text-center">
            <Shield size={24} className="text-[#4A5578] mx-auto mb-2" strokeWidth={1.5} />
            <p className="text-[#8B9CC0] font-medium">No validations</p>
            <p className="text-[#4A5578] text-sm mt-1">Outcome validations will appear here as participants submit evidence.</p>
          </div>
        ) : (
          <>
            <div className="grid px-5 py-3 border-b border-[#0F1D35] bg-[#07101F]"
              style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr 100px' }}>
              {['Outcome', 'Type', 'Confidence', 'Submitted', 'Status'].map((h) => (
                <p key={h} className="text-[10px] font-bold text-[#4A5578] uppercase tracking-wider">{h}</p>
              ))}
            </div>
            <div className="divide-y divide-[#0F1D35]">
              {filtered.slice(0, 10).map((v) => {
                const sc = VALIDATION_STATUS[v.status] ?? VALIDATION_STATUS.pending;
                return (
                  <div key={v.id} className="grid px-5 py-3.5 items-center hover:bg-[#0D1530] transition-colors"
                    style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr 100px' }}>
                    <p className="text-[12px] text-[#F0F4FF] font-medium truncate pr-4">
                      Outcome #{v.id.slice(0, 8)}
                    </p>
                    <span className="text-[11px] text-[#8B9CC0] capitalize">{v.validation_type.replace('_', ' ')}</span>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-[#0D1530] rounded-full overflow-hidden max-w-[60px]">
                        <div className="h-full bg-[#22FFAA] rounded-full" style={{ width: `${(v.confidence_score ?? 0) * 100}%` }} />
                      </div>
                      <span className="text-[11px] text-[#8B9CC0] tabular-nums">{Math.round((v.confidence_score ?? 0) * 100)}%</span>
                    </div>
                    <p className="text-[11px] text-[#4A5578]">
                      {new Date(v.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                    <span className={cn('text-[11px] font-bold px-2 py-0.5 rounded-full w-fit', sc.color, sc.bg)}>
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
