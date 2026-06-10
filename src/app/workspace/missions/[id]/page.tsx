'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronLeft, Target, Users, CheckCircle2, BarChart3, Sparkles, Zap,
  Edit2, Play, Pause, Archive, Clock, Tag, Layers, TrendingUp,
  AlertTriangle, Lightbulb, Save, X
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/cn';
import type { DbMission, DbMissionScore, DbStep } from '@/lib/supabase/types';

interface MissionDetail extends DbMission {
  score?: DbMissionScore;
  completions: number;
  participants: number;
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('bg-[#0D1530] animate-pulse rounded-lg', className)} />;
}

const STATUS_CONFIG = {
  active:   { label: 'Active',    color: 'text-[#22FFAA]', bg: 'bg-[#22FFAA]/10', border: 'border-[#22FFAA]/20' },
  draft:    { label: 'Draft',     color: 'text-[#FFB84D]', bg: 'bg-[#FFB84D]/10', border: 'border-[#FFB84D]/20' },
  paused:   { label: 'Paused',    color: 'text-[#8B9CC0]', bg: 'bg-[#8B9CC0]/10', border: 'border-[#8B9CC0]/20' },
  archived: { label: 'Archived',  color: 'text-[#4A5578]', bg: 'bg-[#4A5578]/10', border: 'border-[#4A5578]/20' },
  published:{ label: 'Published', color: 'text-[#22FFAA]', bg: 'bg-[#22FFAA]/10', border: 'border-[#22FFAA]/20' },
};

const STEP_TYPE_COLOR: Record<string, string> = {
  action:     'text-[#22FFAA] bg-[#22FFAA]/10',
  reflection: 'text-[#6D5DFD] bg-[#6D5DFD]/10',
  discovery:  'text-[#FFB84D] bg-[#FFB84D]/10',
};

export default function MissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [mission, setMission] = useState<MissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editStory, setEditStory] = useState('');
  const [aiRec, setAiRec] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [missionRes, scoreRes, progressRes] = await Promise.all([
        supabase.from('missions').select('*').eq('id', id).single(),
        supabase.from('mission_scores').select('*').eq('mission_id', id).maybeSingle(),
        supabase.from('mission_progress').select('user_id, completed_at').eq('mission_id', id),
      ]);

      if (!missionRes.data) { router.push('/workspace/missions'); return; }
      const m = missionRes.data as DbMission;
      const progress = progressRes.data ?? [];

      setMission({
        ...m,
        score: scoreRes.data ?? undefined,
        completions: progress.filter((p) => p.completed_at).length,
        participants: new Set(progress.map((p) => p.user_id)).size,
      });
      setEditTitle(m.title);
      setEditStory(m.story_context ?? '');
      setLoading(false);
    }
    load();
  }, [id, supabase, router]);

  async function updateStatus(status: string) {
    if (!mission) return;
    await supabase.from('missions').update({ status }).eq('id', id);
    setMission((prev) => prev ? { ...prev, status: status as DbMission['status'] } : prev);
  }

  async function saveEdits() {
    setSaving(true);
    await supabase.from('missions').update({ title: editTitle.trim(), story_context: editStory.trim() || null }).eq('id', id);
    setMission((prev) => prev ? { ...prev, title: editTitle.trim(), story_context: editStory.trim() || null } : prev);
    setSaving(false);
    setEditing(false);
  }

  const getAiRecommendation = useCallback(async () => {
    if (!mission || aiLoading) return;
    setAiLoading(true);
    try {
      const res = await fetch('/api/agents/outcome-planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: `Mission: "${mission.title}". Steps: ${mission.steps.length}. Participants: ${mission.participants}. Completions: ${mission.completions}. MEI: ${mission.score?.mei ?? 'N/A'}.`,
        }),
      });
      const json = await res.json();
      setAiRec((json.content ?? json.message ?? '').slice(0, 600));
    } catch {
      setAiRec('Focus on refining the mission objectives and ensuring each step has clear success criteria to improve completion rates.');
    } finally {
      setAiLoading(false);
    }
  }, [mission, aiLoading]);

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-8 w-72" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
        <Skeleton className="h-[400px] rounded-2xl" />
      </div>
    );
  }

  if (!mission) return null;

  const s = STATUS_CONFIG[mission.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.draft;
  const completionRate = mission.participants > 0
    ? Math.round((mission.completions / mission.participants) * 100)
    : 0;

  return (
    <div className="p-8 max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link href="/workspace/missions" className="mt-1 p-2 rounded-xl hover:bg-[#0A1226] text-[#4A5578] hover:text-[#8B9CC0] transition-colors">
            <ChevronLeft size={16} strokeWidth={2} />
          </Link>
          <div>
            {editing ? (
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="text-[22px] font-bold text-[#F0F4FF] bg-transparent border-b-2 border-accent focus:outline-none w-full"
              />
            ) : (
              <h1 className="text-[22px] font-bold text-[#F0F4FF]">{mission.title}</h1>
            )}
            <div className="flex items-center gap-2 mt-1.5">
              <span className={cn('text-[11px] font-bold px-2 py-0.5 rounded-full border', s.color, s.bg, s.border)}>
                {s.label}
              </span>
              <span className={cn(
                'text-[11px] font-bold px-2 py-0.5 rounded-full',
                mission.difficulty === 'easy' ? 'text-[#22FFAA] bg-[#22FFAA]/10'
                : mission.difficulty === 'medium' ? 'text-[#FFB84D] bg-[#FFB84D]/10'
                : 'text-[#FF5C7A] bg-[#FF5C7A]/10'
              )}>
                {mission.difficulty.charAt(0).toUpperCase() + mission.difficulty.slice(1)}
              </span>
              {mission.estimated_time && (
                <span className="flex items-center gap-1 text-[11px] text-[#4A5578]">
                  <Clock size={11} strokeWidth={2} />{mission.estimated_time}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {editing ? (
            <>
              <button onClick={() => setEditing(false)} className="flex items-center gap-1.5 h-8 px-3 bg-[#0A1226] border border-[#162440] text-[#8B9CC0] rounded-xl text-[12px] font-medium">
                <X size={12} strokeWidth={2} />Cancel
              </button>
              <button onClick={saveEdits} disabled={saving} className="flex items-center gap-1.5 h-8 px-3 bg-accent text-[#060a0e] rounded-xl text-[12px] font-semibold">
                <Save size={12} strokeWidth={2.5} />{saving ? 'Saving…' : 'Save'}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 h-8 px-3 bg-[#0A1226] border border-[#162440] text-[#8B9CC0] rounded-xl text-[12px] font-medium hover:text-[#F0F4FF] hover:border-[#162440] transition-colors">
                <Edit2 size={12} strokeWidth={2} />Edit
              </button>
              {mission.status === 'draft' && (
                <button onClick={() => updateStatus('active')} className="flex items-center gap-1.5 h-8 px-3 bg-[#22FFAA]/10 border border-[#22FFAA]/20 text-[#22FFAA] rounded-xl text-[12px] font-semibold">
                  <Play size={12} strokeWidth={2.5} />Publish
                </button>
              )}
              {mission.status === 'active' && (
                <button onClick={() => updateStatus('paused')} className="flex items-center gap-1.5 h-8 px-3 bg-[#FFB84D]/10 border border-[#FFB84D]/20 text-[#FFB84D] rounded-xl text-[12px] font-semibold">
                  <Pause size={12} strokeWidth={2.5} />Pause
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Participants', value: mission.participants, icon: Users, color: 'text-[#F0F4FF]', bg: 'bg-[#0D1530]' },
          { label: 'Completions', value: mission.completions, icon: CheckCircle2, color: 'text-[#22FFAA]', bg: 'bg-[#22FFAA]/8' },
          { label: 'Completion Rate', value: `${completionRate}%`, icon: TrendingUp, color: 'text-[#6D5DFD]', bg: 'bg-[#6D5DFD]/10' },
          { label: 'MEI Score', value: mission.score?.mei ?? '—', icon: BarChart3, color: 'text-[#FFB84D]', bg: 'bg-[#FFB84D]/10' },
        ].map(({ label, value, icon: Icon, color, bg }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-[#0A1226] border border-[#0F1D35] rounded-2xl p-4"
          >
            <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center mb-3', bg)}>
              <Icon size={15} className={color} strokeWidth={1.8} />
            </div>
            <p className={cn('text-2xl font-bold tabular-nums', color)}>{value}</p>
            <p className="text-[#4A5578] text-[11px] mt-0.5 font-medium">{label}</p>
          </motion.div>
        ))}
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-3 gap-4">

        {/* Steps */}
        <div className="col-span-2 bg-[#0A1226] border border-[#0F1D35] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#0F1D35]">
            <div className="flex items-center gap-2">
              <Layers size={14} className="text-[#6D5DFD]" strokeWidth={2} />
              <p className="text-[13px] font-bold text-[#F0F4FF]">Mission Steps</p>
              <span className="text-[11px] text-[#4A5578] bg-[#0D1530] px-2 py-0.5 rounded-full font-bold">{mission.steps.length}</span>
            </div>
          </div>
          <div className="p-4 space-y-3">
            {(mission.steps as DbStep[]).map((step, i) => (
              <div key={step.id} className="flex gap-3 p-4 bg-[#07101F] border border-[#0F1D35] rounded-xl">
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 rounded-full bg-[#0D1530] border border-[#162440] flex items-center justify-center text-[10px] font-bold text-[#8B9CC0]">
                    {i + 1}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-md capitalize', STEP_TYPE_COLOR[step.type] ?? 'text-[#8B9CC0] bg-[#0D1530]')}>
                      {step.type}
                    </span>
                  </div>
                  <p className="text-[13px] text-[#F0F4FF] font-medium mb-1">{step.instruction}</p>
                  {step.success_criteria && (
                    <div className="flex items-start gap-1.5 mt-1.5">
                      <CheckCircle2 size={11} className="text-[#22FFAA] mt-0.5 flex-shrink-0" strokeWidth={2} />
                      <p className="text-[11px] text-[#4A5578]">{step.success_criteria}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Side Panel */}
        <div className="space-y-4">
          {/* Mission Info */}
          <div className="bg-[#0A1226] border border-[#0F1D35] rounded-2xl p-4 space-y-3">
            <p className="text-[11px] font-bold text-[#4A5578] uppercase tracking-wider">Mission Info</p>
            {mission.story_context && (
              <div>
                {editing ? (
                  <textarea
                    value={editStory}
                    onChange={(e) => setEditStory(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 bg-[#07101F] border border-[#0F1D35] rounded-xl text-[12px] text-[#F0F4FF] focus:outline-none resize-none"
                  />
                ) : (
                  <p className="text-[12px] text-[#8B9CC0] leading-relaxed">{mission.story_context}</p>
                )}
              </div>
            )}
            <div className="pt-2 border-t border-[#0F1D35] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#4A5578]">Reward</span>
                <span className="text-[11px] font-semibold text-[#F0F4FF]">{mission.reward}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#4A5578]">Created</span>
                <span className="text-[11px] font-medium text-[#8B9CC0]">
                  {new Date(mission.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              {mission.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {mission.tags.map((t) => (
                    <span key={t} className="px-2 py-0.5 bg-[#0D1530] border border-[#162440] text-[10px] font-semibold text-[#8B9CC0] rounded-full">{t}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* MEI Breakdown */}
          {mission.score && (
            <div className="bg-[#0A1226] border border-[#0F1D35] rounded-2xl p-4">
              <p className="text-[11px] font-bold text-[#4A5578] uppercase tracking-wider mb-3">MEI Breakdown</p>
              {[
                { label: 'Completion', value: mission.score.completion_score, color: '#22FFAA' },
                { label: 'Engagement', value: mission.score.engagement_score, color: '#6D5DFD' },
                { label: 'Retention',  value: mission.score.retention_score,  color: '#FFB84D' },
                { label: 'Outcome',    value: mission.score.outcome_score,    color: '#F0F4FF' },
              ].map(({ label, value, color }) => (
                <div key={label} className="mb-2.5">
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-[#8B9CC0]">{label}</span>
                    <span className="font-bold tabular-nums" style={{ color }}>{value ?? 0}</span>
                  </div>
                  <div className="h-1 bg-[#0D1530] rounded-full">
                    <div className="h-full rounded-full" style={{ width: `${value ?? 0}%`, backgroundColor: color }} />
                  </div>
                </div>
              ))}
              <div className="mt-3 pt-3 border-t border-[#0F1D35] flex items-center justify-between">
                <span className="text-[11px] text-[#4A5578]">MEI</span>
                <span className="text-[20px] font-bold text-[#22FFAA]">{mission.score.mei}</span>
              </div>
            </div>
          )}

          {/* AI Recommendations */}
          <div className="bg-[#0A1226] border border-[#0F1D35] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={13} className="text-[#6D5DFD]" strokeWidth={2} />
                <p className="text-[13px] font-bold text-[#F0F4FF]">AI Recommendations</p>
              </div>
              <button
                onClick={getAiRecommendation}
                disabled={aiLoading}
                className="text-[11px] font-semibold text-[#6D5DFD] hover:text-[#A99FFE] transition-colors disabled:opacity-50"
              >
                {aiRec ? 'Refresh' : 'Generate'}
              </button>
            </div>
            {aiLoading ? (
              <div className="space-y-2">
                <div className="h-2.5 bg-[#0D1530] animate-pulse rounded" />
                <div className="h-2.5 bg-[#0D1530] animate-pulse rounded w-4/5" />
                <div className="h-2.5 bg-[#0D1530] animate-pulse rounded w-3/4" />
              </div>
            ) : aiRec ? (
              <p className="text-[12px] text-[#8B9CC0] leading-relaxed">{aiRec}</p>
            ) : (
              <p className="text-[12px] text-[#4A5578]">Click Generate to get AI-powered optimization recommendations for this mission.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
