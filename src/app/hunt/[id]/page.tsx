'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Clock, Bookmark, BookmarkCheck, Shield, Zap, ChevronDown, ChevronUp, MapPin, Users } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import MissionCard from '@/components/consumer/MissionCard';
import SectionHeader from '@/components/consumer/SectionHeader';
import StatusPill from '@/components/consumer/StatusPill';
import Surface from '@/components/consumer/Surface';
import ProgressBar from '@/components/consumer/ProgressBar';
import CopilotFab from '@/components/consumer/CopilotFab';
import { t } from '@/theme/colors';
import { loadState, toggleSavedHunt, getVerificationStatus } from '@/lib/store';
import { estimateCashReward, estimateXP, deadlineLabel, spotsLabel, demandLabel, resolveCategory, DIFF_META, MISSION_TYPE_META } from '@/lib/missionCategories';
import type { Hunt, HuntProgress, VerificationStatus } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';

export default function HuntDetailPage() {
  const params = useParams();
  const router = useRouter();
  const huntId = params?.id as string;

  const [hunt, setHunt]         = useState<Hunt | null>(null);
  const [progress, setProgress] = useState<HuntProgress | null>(null);
  const [saved, setSaved]       = useState(false);
  const [vStatus, setVStatus]   = useState<VerificationStatus | null>(null);
  const [similar, setSimilar]   = useState<Hunt[]>([]);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const state = loadState();
    let found = state.hunts.find(h => h.id === huntId) ?? null;
    setSaved((state.savedHunts ?? []).includes(huntId));
    setProgress(state.progress[huntId] ?? null);
    const vr = getVerificationStatus(huntId);
    if (vr) setVStatus(vr.status);

    if (found) {
      setHunt(found);
      const cat = resolveCategory(found.tags ?? [], found.category);
      setSimilar(state.hunts.filter(h => h.id !== huntId && resolveCategory(h.tags ?? [], h.category).id === cat.id).slice(0, 3));
      setLoading(false);
    } else {
      void Promise.resolve(
        createClient()
          .from('missions')
          .select('*')
          .eq('id', huntId)
          .single()
          .then(({ data }) => {
            if (data) {
              const mapped = { id: data.id, title: data.title, story_context: data.story_context ?? '', difficulty: data.difficulty ?? 'easy', estimated_time: data.estimated_time ?? '1 hour', steps: data.steps ?? [], reward: data.reward ?? 'XP', tags: data.tags ?? [] } as Hunt;
              setHunt(mapped);
            }
          }),
      ).finally(() => setLoading(false));
    }
  }, [huntId]);

  function handleSave() {
    const next = toggleSavedHunt(huntId);
    setSaved(next);
  }

  function toggleStep(idx: number) {
    setExpandedSteps(prev => {
      const s = new Set(prev);
      s.has(idx) ? s.delete(idx) : s.add(idx);
      return s;
    });
  }

  const isStarted   = !!progress && !progress.completedAt;
  const isCompleted = !!progress?.completedAt || !!vStatus;

  if (loading) return (
    <div className="consumer-app" style={{ background: t.bg }}>
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[1,2,3].map(i => <div key={i} style={{ height: 80, borderRadius: 16, background: t.card }} className="breathe" />)}
      </div>
      <BottomNav />
    </div>
  );

  if (!hunt) return (
    <div className="consumer-app" style={{ background: t.bg }}>
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ color: t.txtFaint }}>Mission not found.</p>
        <button onClick={() => router.push('/explore')} style={{ marginTop: 16, padding: '10px 24px', borderRadius: 12, background: t.accent, color: t.bg, border: 'none', cursor: 'pointer', fontWeight: 700 }}>Browse Missions</button>
      </div>
      <BottomNav />
    </div>
  );

  const cash     = estimateCashReward(hunt.cashReward, hunt.difficulty, hunt.missionType);
  const xp       = estimateXP(hunt.xpReward, hunt.difficulty, hunt.steps?.length ?? 0);
  const diff     = DIFF_META[hunt.difficulty] ?? DIFF_META.easy;
  const typeMeta = hunt.missionType ? MISSION_TYPE_META[hunt.missionType] : null;
  const category = resolveCategory(hunt.tags ?? [], hunt.category);
  const dl       = deadlineLabel(hunt.deadline);
  const sl       = spotsLabel(hunt.spotsRemaining, hunt.spotsTotal);
  const demand   = demandLabel(hunt.applicationCount);
  const stepProgress = progress ? Math.round((progress.completedSteps.length / Math.max(hunt.steps.length, 1)) * 100) : 0;

  /* Shared reward pills and meta badges (rendered in both mobile inline + desktop sidebar) */
  const RewardPills = () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: `${t.accent}18`, border: `1px solid ${t.accent}30`, borderRadius: 12, padding: '8px 16px' }}>
        <span style={{ fontSize: 18, fontWeight: 900, color: t.accent }}>${cash}</span>
        <span style={{ fontSize: 11, color: t.txtDim }}>reward</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: `${t.ai}18`, border: `1px solid ${t.ai}30`, borderRadius: 12, padding: '8px 14px' }}>
        <Zap size={14} strokeWidth={2} style={{ color: t.ai }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: t.ai }}>{xp} XP</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, padding: '8px 14px' }}>
        <Clock size={13} strokeWidth={1.8} style={{ color: t.txtFaint }} />
        <span style={{ fontSize: 13, color: t.txtDim }}>{hunt.estimated_time}</span>
      </div>
      {dl && <div style={{ display: 'flex', alignItems: 'center', background: `${dl.color}14`, borderRadius: 12, padding: '8px 14px' }}><span style={{ fontSize: 13, fontWeight: 700, color: dl.color }}>{dl.label}</span></div>}
    </div>
  );

  const MetaBadges = () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: diff.color, background: diff.bg, padding: '4px 10px', borderRadius: 100 }}>{diff.label}</span>
      {typeMeta && <span style={{ fontSize: 11, fontWeight: 600, color: typeMeta.color, background: `${typeMeta.color}14`, padding: '4px 10px', borderRadius: 100 }}>{typeMeta.emoji} {typeMeta.label}</span>}
      {hunt.locationType && <span style={{ fontSize: 11, fontWeight: 600, color: t.txtDim, background: t.card, padding: '4px 10px', borderRadius: 100, border: `1px solid ${t.border}` }}><MapPin size={9} strokeWidth={2} style={{ display: 'inline', marginRight: 3 }} />{hunt.locationType}</span>}
      {sl && <span style={{ fontSize: 11, fontWeight: 600, color: sl.color }}>{sl.label}</span>}
      {demand && <span style={{ fontSize: 11, fontWeight: 600, color: t.warning }}>{demand}</span>}
    </div>
  );

  const CtaButtons = ({ compact }: { compact?: boolean }) => (
    <div style={{ display: 'flex', gap: 10 }}>
      {isCompleted ? (
        <button onClick={() => router.push(`/complete/${huntId}`)} style={{ flex: 1, height: compact ? 44 : 50, borderRadius: 16, background: `${t.accent}18`, border: `1px solid ${t.accent}40`, color: t.accent, fontSize: compact ? 13 : 15, fontWeight: 700, cursor: 'pointer' }}>
          View Verification Status
        </button>
      ) : (
        <button onClick={() => router.push(`/active/${huntId}`)} style={{ flex: 1, height: compact ? 44 : 50, borderRadius: 16, background: t.accent, color: t.bg, fontSize: compact ? 13 : 15, fontWeight: 800, cursor: 'pointer', border: 'none', boxShadow: `0 4px 20px ${t.accent}40` }}>
          {isStarted ? 'Continue Mission' : 'Start Mission'}
        </button>
      )}
      <button onClick={handleSave} style={{ width: compact ? 44 : 50, height: compact ? 44 : 50, borderRadius: 16, background: saved ? `${t.accent}18` : t.card, border: `1px solid ${saved ? t.accent : t.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: saved ? t.accent : t.txtFaint }}>
        {saved ? <BookmarkCheck size={compact ? 18 : 20} strokeWidth={2} /> : <Bookmark size={compact ? 18 : 20} strokeWidth={1.8} />}
      </button>
    </div>
  );

  return (
    <div className="consumer-app" style={{ background: t.bg, minHeight: '100vh' }}>
      <div className="consumer-app-inner">

        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', position: 'sticky', top: 0, zIndex: 30, background: `${t.bg}F0`, backdropFilter: 'blur(16px)' }}>
          <button onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', color: t.txtDim, fontSize: 14, fontWeight: 600, padding: 0 }}>
            <ArrowLeft size={18} strokeWidth={2} /> Back
          </button>
          <button onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: 6, background: saved ? `${t.accent}18` : t.card, border: `1px solid ${saved ? t.accent : t.border}`, borderRadius: 12, padding: '8px 14px', cursor: 'pointer', color: saved ? t.accent : t.txtDim, fontSize: 13, fontWeight: 600 }}>
            {saved ? <BookmarkCheck size={15} strokeWidth={2} /> : <Bookmark size={15} strokeWidth={1.8} />}
            {saved ? 'Saved' : 'Save'}
          </button>
        </div>

        <div style={{ maxWidth: 1100, margin: '0 auto', width: '100%', boxSizing: 'border-box', padding: '0 20px 100px' }}>

          {/* Category accent bar */}
          <div style={{ height: 3, borderRadius: 2, background: `linear-gradient(90deg, ${category.color}, ${category.color}44)`, marginBottom: 16 }} />

          {/* Title — prominent, first */}
          <h1 style={{ margin: '0 0 14px', fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: 900, color: t.txt, letterSpacing: '-0.02em', lineHeight: 1.2 }}>{hunt.title}</h1>

          {/* Org row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${category.color}18`, border: `1px solid ${category.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
              {hunt.tenantLogo ? <img src={hunt.tenantLogo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} /> : category.emoji}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: t.txtDim, display: 'flex', alignItems: 'center', gap: 4 }}>
                {hunt.tenantName ?? 'Organization'}
                {hunt.isVerified && <Shield size={11} strokeWidth={2} style={{ color: t.info }} />}
              </p>
            </div>
          </div>

          {/* Mobile: reward pills + meta inline */}
          <div className="lg:hidden">
            <RewardPills />
            <MetaBadges />
          </div>

          {/* Progress bar if started */}
          {isStarted && (
            <Surface variant="inset" padding="12px 16px" style={{ marginBottom: 20 }}>
              <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 600, color: t.accent }}>In Progress</p>
              <ProgressBar value={stepProgress} label={`Step ${(progress?.completedSteps.length ?? 0) + 1} of ${hunt.steps.length}`} showPercent color={t.accent} />
            </Surface>
          )}

          {/* Desktop two-column body */}
          <div className="lg:flex lg:gap-8 lg:items-start">

            {/* Left: main content */}
            <div className="lg:flex-1 lg:min-w-0">

              {/* Overview */}
              <section style={{ marginBottom: 24 }}>
                <SectionHeader title="Mission Overview" />
                <Surface variant="inset" padding="16px">
                  <p style={{ margin: 0, fontSize: 14, color: t.txtDim, lineHeight: 1.7 }}>{hunt.story_context}</p>
                </Surface>
              </section>

              {/* Steps */}
              {hunt.steps?.length > 0 && (
                <section style={{ marginBottom: 24 }}>
                  <SectionHeader title="Participation Steps" count={hunt.steps.length} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {hunt.steps.map((step, idx) => {
                      const exp = expandedSteps.has(idx);
                      const STEP_EMOJI: Record<string, string> = { action: '⚡', reflection: '💭', discovery: '🔍', research: '🔬', submission: '📤', collaboration: '🤝' };
                      return (
                        <Surface key={step.id} variant="card" padding="0" style={{ overflow: 'hidden' }}>
                          <button onClick={() => toggleStep(idx)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                            <div style={{ width: 32, height: 32, borderRadius: 10, background: `${t.accent}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{STEP_EMOJI[step.type] ?? '📌'}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Step {idx + 1} · {step.type}</p>
                              <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 600, color: t.txt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: exp ? 'normal' : 'nowrap' }}>{step.instruction}</p>
                            </div>
                            {exp ? <ChevronUp size={16} style={{ color: t.txtFaint, flexShrink: 0 }} /> : <ChevronDown size={16} style={{ color: t.txtFaint, flexShrink: 0 }} />}
                          </button>
                          {exp && (
                            <div style={{ padding: '0 16px 14px 60px' }}>
                              <p style={{ margin: '0 0 8px', fontSize: 13, color: t.txtDim, lineHeight: 1.6 }}>{step.instruction}</p>
                              <p style={{ margin: 0, fontSize: 12, color: t.txtFaint }}><strong style={{ color: t.accent }}>Success: </strong>{step.success_criteria}</p>
                            </div>
                          )}
                        </Surface>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Verification Requirements */}
              <section style={{ marginBottom: 24 }}>
                <SectionHeader title="Verification Requirements" />
                <Surface variant="inset" padding="16px">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {['Written response or explanation', 'Photo or video proof', 'GPS location check-in (if local)', 'Source citations or references'].map((req, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 20, height: 20, borderRadius: 6, border: `1.5px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: 10, color: t.txtFaint }}>{i + 1}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: 13, color: t.txtDim }}>{req}</p>
                      </div>
                    ))}
                  </div>
                </Surface>
              </section>

              {/* Reputation Impact */}
              <section style={{ marginBottom: 24 }}>
                <SectionHeader title="Reputation Impact" />
                <div style={{ display: 'flex', gap: 10 }}>
                  <Surface variant="inset" padding="14px 16px" style={{ flex: 1 }}>
                    <p style={{ margin: '0 0 4px', fontSize: 11, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>XP Reward</p>
                    <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: t.ai }}>+{xp}</p>
                  </Surface>
                  <Surface variant="inset" padding="14px 16px" style={{ flex: 1 }}>
                    <p style={{ margin: '0 0 4px', fontSize: 11, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Trust Score</p>
                    <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: t.accent }}>+{hunt.difficulty === 'hard' ? '15' : hunt.difficulty === 'medium' ? '8' : '3'}</p>
                  </Surface>
                </div>
              </section>

              {/* Org info */}
              {(hunt.tenantName || hunt.organizationAbout) && (
                <section style={{ marginBottom: 24 }}>
                  <SectionHeader title="About the Organization" />
                  <Surface variant="inset" padding="16px">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${category.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{category.emoji}</div>
                      <div>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: t.txt }}>{hunt.tenantName ?? 'Organization'}</p>
                        {hunt.organizationType && <p style={{ margin: '2px 0 0', fontSize: 11, color: t.txtFaint, textTransform: 'capitalize' }}>{hunt.organizationType.replace('-', ' ')}</p>}
                      </div>
                    </div>
                    {hunt.organizationAbout && <p style={{ margin: 0, fontSize: 13, color: t.txtDim, lineHeight: 1.6 }}>{hunt.organizationAbout}</p>}
                  </Surface>
                </section>
              )}

              {/* Similar missions */}
              {similar.length > 0 && (
                <section style={{ marginBottom: 24 }}>
                  <SectionHeader title="Similar Missions" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {similar.map(h => <MissionCard key={h.id} hunt={h} compact />)}
                  </div>
                </section>
              )}
            </div>

            {/* Right: sticky sidebar (desktop only) */}
            <div className="hidden lg:block" style={{ width: 300, flexShrink: 0 }}>
              <div style={{ position: 'sticky', top: 80 }}>
                <Surface variant="card" style={{ marginBottom: 12 }}>
                  <div style={{ padding: '16px 16px 12px' }}>
                    <RewardPills />
                    <MetaBadges />
                    <CtaButtons compact />
                  </div>
                </Surface>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky bottom CTA */}
      <div className="lg:hidden" style={{
        position: 'fixed', bottom: 'calc(72px + max(env(safe-area-inset-bottom, 0px), 8px))', left: 0, right: 0,
        padding: '12px 20px', background: `${t.bg}F5`, backdropFilter: 'blur(16px)',
        borderTop: `1px solid ${t.border}`, zIndex: 40,
      }}>
        <CtaButtons />
      </div>

      <CopilotFab context={{ huntTitle: hunt.title, huntStory: hunt.story_context }} />
      <BottomNav />
    </div>
  );
}
