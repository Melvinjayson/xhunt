'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Check, SkipForward, ChevronDown, ChevronUp, Upload, MapPin, QrCode, Camera, FileText, MessageSquare } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import AIAssistant from '@/components/AIAssistant';
import ProgressBar from '@/components/consumer/ProgressBar';
import Surface from '@/components/consumer/Surface';
import { t } from '@/theme/colors';
import { loadState, saveState, setVerificationStatus } from '@/lib/store';
import { estimateCashReward, estimateXP } from '@/lib/missionCategories';
import type { Hunt, HuntProgress, Step } from '@/lib/types';

type Stage = 'overview' | 'requirements' | 'execution' | 'proof' | 'review';
const STAGES: Stage[] = ['overview', 'requirements', 'execution', 'proof', 'review'];
const STAGE_LABELS: Record<Stage, string> = {
  overview: 'Overview', requirements: 'Requirements', execution: 'Execution', proof: 'Proof', review: 'Review'
};
const STAGE_NUMS: Record<Stage, number> = { overview: 0, requirements: 1, execution: 2, proof: 3, review: 4 };

const STEP_EMOJI: Record<string, string> = { action: '⚡', reflection: '💭', discovery: '🔍', research: '🔬', submission: '📤', collaboration: '🤝' };
const STEP_COLOR: Record<string, string> = { action: t.warning, reflection: t.ai, discovery: t.accent, research: t.info, submission: t.accent, collaboration: t.aiLight };

const PROOF_TYPES = [
  { id: 'photo', label: 'Photo', icon: Camera },
  { id: 'video', label: 'Video', icon: Camera },
  { id: 'document', label: 'Document', icon: FileText },
  { id: 'survey', label: 'Survey', icon: MessageSquare },
  { id: 'gps', label: 'GPS Check-in', icon: MapPin },
  { id: 'qr', label: 'QR Scan', icon: QrCode },
];

export default function ActiveMissionPage() {
  const params = useParams();
  const router = useRouter();
  const huntId = params?.id as string;

  const [hunt, setHunt]         = useState<Hunt | null>(null);
  const [progress, setProgress] = useState<HuntProgress>({ huntId, currentStepIndex: 0, completedSteps: [], startedAt: new Date().toISOString() });
  const [stage, setStage]       = useState<Stage>('overview');
  const [showSkip, setShowSkip] = useState(false);
  const [expandCriteria, setExpandCriteria] = useState(false);
  const [proofType, setProofType] = useState<string>('photo');
  const [proofText, setProofText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);

  useEffect(() => {
    const state = loadState();
    const found = state.hunts.find(h => h.id === huntId);
    if (found) {
      setHunt(found);
      const existing = state.progress[huntId];
      if (existing) setProgress(existing);
    } else {
      router.push('/missions');
    }
  }, [huntId, router]);

  function saveProgress(updates: Partial<HuntProgress>) {
    const newProgress = { ...progress, ...updates };
    setProgress(newProgress);
    const state = loadState();
    saveState({ ...state, progress: { ...state.progress, [huntId]: newProgress } });
  }

  function completeStep() {
    if (!hunt) return;
    const newCompleted = [...new Set([...progress.completedSteps, progress.currentStepIndex])];
    const nextIdx = progress.currentStepIndex + 1;
    if (nextIdx >= hunt.steps.length) {
      saveProgress({ completedSteps: newCompleted, completedAt: new Date().toISOString() });
      setStage('proof');
    } else {
      saveProgress({ completedSteps: newCompleted, currentStepIndex: nextIdx });
    }
    setExpandCriteria(false);
  }

  function skipStep() {
    if (!hunt) return;
    const nextIdx = progress.currentStepIndex + 1;
    if (nextIdx >= hunt.steps.length) {
      setStage('proof');
    } else {
      saveProgress({ currentStepIndex: nextIdx });
    }
    setShowSkip(false);
    setExpandCriteria(false);
  }

  async function submitProof() {
    if (!hunt) return;
    setSubmitting(true);
    try {
      await fetch('/api/outcomes/validations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mission_id: hunt.id,
          validation_type: 'self_reported',
          evidence: [{ type: 'attestation', value: proofText || 'Mission completed.' }, { type: 'attestation', value: `Proof type: ${proofType}` }],
        }),
      });
    } catch {}
    setVerificationStatus(huntId, 'submitted');
    const state = loadState();
    const completedHunt = { huntId, huntTitle: hunt.title, reward: `$${estimateCashReward(hunt.cashReward, hunt.difficulty, hunt.missionType)}`, completedAt: new Date().toISOString() };
    saveState({ ...state, completedHunts: [...(state.completedHunts ?? []).filter(c => c.huntId !== huntId), completedHunt] });
    setSubmitted(true);
    setStage('review');
    setSubmitting(false);
  }

  if (!hunt) return (
    <div style={{ minHeight: '100vh', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="breathe" style={{ width: 40, height: 40, borderRadius: '50%', background: `${t.accent}26` }} />
    </div>
  );

  const currentStep: Step | undefined = hunt.steps[progress.currentStepIndex];
  const stageIdx  = STAGE_NUMS[stage];
  const cash      = estimateCashReward(hunt.cashReward, hunt.difficulty, hunt.missionType);
  const xp        = estimateXP(hunt.xpReward, hunt.difficulty, hunt.steps.length);
  const stepPct   = hunt.steps.length > 0 ? Math.round((progress.completedSteps.length / hunt.steps.length) * 100) : 0;

  return (
    <div style={{ background: t.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 30, background: `${t.bg}F5`, backdropFilter: 'blur(16px)', padding: '12px 20px', borderBottom: `1px solid ${t.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <button onClick={() => router.push(`/hunt/${huntId}`)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: t.txtDim, fontSize: 13 }}>
            <ArrowLeft size={16} strokeWidth={2} /> Exit
          </button>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: t.txtFaint }}>Step {STAGE_NUMS[stage] + 1} of 5</p>
          <button onClick={() => { router.push('/missions'); }} style={{ fontSize: 12, color: t.txtFaint, background: 'none', border: 'none', cursor: 'pointer' }}>Save & exit</button>
        </div>

        {/* Stage progress bar */}
        <div style={{ display: 'flex', gap: 4 }}>
          {STAGES.map((s, i) => (
            <div key={s} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= stageIdx ? t.accent : 'rgba(255,255,255,0.1)', transition: 'background 0.3s' }} />
          ))}
        </div>
        <p style={{ margin: '6px 0 0', fontSize: 11, fontWeight: 600, color: t.accent, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Stage {stageIdx + 1}: {STAGE_LABELS[stage]}
        </p>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '24px 20px', overflowY: 'auto', maxWidth: 640, margin: '0 auto', width: '100%', boxSizing: 'border-box', paddingBottom: 100 }}>

        {/* STAGE: Overview */}
        {stage === 'overview' && (
          <div className="slide-up">
            <h1 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 900, color: t.txt }}>{hunt.title}</h1>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: t.txtDim, lineHeight: 1.7 }}>{hunt.story_context}</p>
            <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
              <Surface variant="inset" padding="14px 16px" style={{ flex: 1 }}>
                <p style={{ margin: '0 0 2px', fontSize: 10, color: t.txtFaint, textTransform: 'uppercase', fontWeight: 600 }}>Reward</p>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: t.accent }}>${cash}</p>
              </Surface>
              <Surface variant="inset" padding="14px 16px" style={{ flex: 1 }}>
                <p style={{ margin: '0 0 2px', fontSize: 10, color: t.txtFaint, textTransform: 'uppercase', fontWeight: 600 }}>XP</p>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: t.ai }}>+{xp}</p>
              </Surface>
              <Surface variant="inset" padding="14px 16px" style={{ flex: 1 }}>
                <p style={{ margin: '0 0 2px', fontSize: 10, color: t.txtFaint, textTransform: 'uppercase', fontWeight: 600 }}>Steps</p>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: t.txt }}>{hunt.steps.length}</p>
              </Surface>
            </div>
            <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 600, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>What you&apos;ll do</p>
            {hunt.steps.slice(0, 3).map((step, i) => (
              <div key={step.id} style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: `${t.accent}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14 }}>{STEP_EMOJI[step.type] ?? '📌'}</div>
                <p style={{ margin: 0, fontSize: 13, color: t.txtDim, lineHeight: 1.5, flex: 1, paddingTop: 4 }}>{step.instruction}</p>
              </div>
            ))}
            {hunt.steps.length > 3 && <p style={{ margin: '8px 0 0', fontSize: 12, color: t.txtFaint }}>+{hunt.steps.length - 3} more steps</p>}
          </div>
        )}

        {/* STAGE: Requirements */}
        {stage === 'requirements' && (
          <div className="slide-up">
            <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800, color: t.txt }}>What you need</h2>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: t.txtFaint }}>Before you start, make sure you have what&apos;s needed.</p>
            {(hunt.requiredSkills ?? []).length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Required Skills</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {hunt.requiredSkills!.map(s => (
                    <span key={s} style={{ padding: '5px 12px', borderRadius: 100, background: `${t.ai}14`, color: t.ai, border: `1px solid ${t.ai}26`, fontSize: 12, fontWeight: 600 }}>{s}</span>
                  ))}
                </div>
              </div>
            )}
            <div style={{ marginBottom: 20 }}>
              <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Deliverables</p>
              {['Written response or explanation', 'Supporting evidence (photo, video, or document)', 'Any relevant data or sources'].map((d, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 20, height: 20, borderRadius: 6, border: `1.5px solid ${t.accent}60`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Check size={11} strokeWidth={2.5} style={{ color: t.accent }} />
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: t.txtDim }}>{d}</p>
                </div>
              ))}
            </div>
            {hunt.teamSize && (
              <Surface variant="inset" padding="14px 16px">
                <p style={{ margin: '0 0 2px', fontSize: 11, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Team Size</p>
                <p style={{ margin: 0, fontSize: 14, color: t.txt, fontWeight: 600 }}>{hunt.teamSize}</p>
              </Surface>
            )}
          </div>
        )}

        {/* STAGE: Execution */}
        {stage === 'execution' && currentStep && (
          <div className="slide-up">
            {/* Step progress */}
            <div style={{ marginBottom: 20 }}>
              <ProgressBar value={stepPct} color={t.accent} height={4} label={`Step ${progress.currentStepIndex + 1} of ${hunt.steps.length}`} showPercent />
            </div>

            {/* Step type */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 100, background: `${STEP_COLOR[currentStep.type] || t.accent}18`, marginBottom: 16 }}>
              <span style={{ fontSize: 16 }}>{STEP_EMOJI[currentStep.type] ?? '📌'}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: STEP_COLOR[currentStep.type] || t.accent, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{currentStep.type}</span>
            </div>

            {/* Instruction */}
            <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 800, color: t.txt, lineHeight: 1.35 }}>{currentStep.instruction}</h2>

            {/* Success criteria toggle */}
            <button onClick={() => setExpandCriteria(c => !c)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: `${t.accent}14`, border: `1px solid ${t.accent}26`, borderRadius: 10, padding: '8px 14px', cursor: 'pointer', marginBottom: 20, color: t.accent, fontSize: 12, fontWeight: 600 }}>
              {expandCriteria ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              {expandCriteria ? 'Hide' : 'Show'} success criteria
            </button>
            {expandCriteria && (
              <Surface variant="inset" padding="14px 16px" style={{ marginBottom: 20 }}>
                <p style={{ margin: '0 0 4px', fontSize: 11, color: t.accent, fontWeight: 600, textTransform: 'uppercase' }}>Success Criteria</p>
                <p style={{ margin: 0, fontSize: 13, color: t.txtDim, lineHeight: 1.6 }}>{currentStep.success_criteria}</p>
              </Surface>
            )}

            {/* AI assist */}
            <div style={{ marginBottom: 20 }}>
              <AIAssistant context={{ huntTitle: hunt.title, huntStory: hunt.story_context, stepInstruction: currentStep.instruction, stepType: currentStep.type }} />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button onClick={() => setShowSkip(true)} style={{ height: 48, paddingInline: 16, borderRadius: 14, background: 'none', border: `1px solid ${t.border}`, color: t.txtFaint, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                <SkipForward size={15} strokeWidth={2} style={{ display: 'inline', marginRight: 6 }} />Skip
              </button>
              <button onClick={completeStep} style={{ flex: 1, height: 48, borderRadius: 14, background: t.accent, color: t.bg, fontSize: 14, fontWeight: 800, cursor: 'pointer', border: 'none', boxShadow: `0 4px 16px ${t.accent}40` }}>
                <Check size={16} strokeWidth={2.5} style={{ display: 'inline', marginRight: 6 }} />Mark Complete
              </button>
            </div>

            {/* Skip confirmation */}
            {showSkip && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }}>
                <div className="slide-up" style={{ background: t.surface, borderRadius: '24px 24px 0 0', padding: '24px 20px 32px', width: '100%', boxSizing: 'border-box' }}>
                  <p style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 800, color: t.txt }}>Skip this step?</p>
                  <p style={{ margin: '0 0 20px', fontSize: 13, color: t.txtFaint }}>Skipping may reduce your verification score.</p>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => setShowSkip(false)} style={{ flex: 1, height: 46, borderRadius: 14, background: t.card, border: `1px solid ${t.border}`, color: t.txtDim, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                    <button onClick={skipStep} style={{ flex: 1, height: 46, borderRadius: 14, background: t.warning, color: t.bg, fontSize: 14, fontWeight: 700, cursor: 'pointer', border: 'none' }}>Skip Step</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STAGE: Proof */}
        {stage === 'proof' && (
          <div className="slide-up">
            <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800, color: t.txt }}>Submit your proof</h2>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: t.txtFaint }}>Provide evidence of your work to unlock verification and rewards.</p>

            {/* Proof type selector */}
            <div style={{ marginBottom: 20 }}>
              <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Proof Type</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {PROOF_TYPES.map(({ id, label, icon: Icon }) => (
                  <button key={id} onClick={() => setProofType(id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 100, border: `1.5px solid ${proofType === id ? t.accent : t.border}`, background: proofType === id ? `${t.accent}18` : t.card, color: proofType === id ? t.accent : t.txtDim, fontSize: 12, fontWeight: proofType === id ? 700 : 500, cursor: 'pointer' }}>
                    <Icon size={12} strokeWidth={2} />{label}
                  </button>
                ))}
              </div>
            </div>

            {/* Upload area */}
            <Surface variant="inset" padding="32px 20px" style={{ textAlign: 'center', border: `2px dashed ${t.border}`, marginBottom: 16, cursor: 'pointer' }}>
              <Upload size={28} strokeWidth={1.5} style={{ color: t.txtFaint, marginBottom: 10 }} />
              <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: t.txt }}>Upload {proofType}</p>
              <p style={{ margin: 0, fontSize: 12, color: t.txtFaint }}>or tap to capture</p>
            </Surface>

            {/* Text proof */}
            <div style={{ marginBottom: 20 }}>
              <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Written Explanation</p>
              <textarea
                value={proofText}
                onChange={e => setProofText(e.target.value)}
                placeholder="Describe what you did, what you found, and how it meets the mission objectives..."
                rows={5}
                style={{ width: '100%', borderRadius: 14, border: `1px solid ${t.border}`, background: t.card, color: t.txt, padding: '12px 14px', fontSize: 13, lineHeight: 1.6, resize: 'vertical', fontFamily: 'var(--font-onest, system-ui)', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <button onClick={submitProof} disabled={submitting} style={{ width: '100%', height: 52, borderRadius: 16, background: submitting ? `${t.accent}60` : t.accent, color: t.bg, fontSize: 15, fontWeight: 800, cursor: submitting ? 'default' : 'pointer', border: 'none', boxShadow: `0 4px 20px ${t.accent}40` }}>
              {submitting ? 'Submitting…' : 'Submit Proof'}
            </button>
          </div>
        )}

        {/* STAGE: Review */}
        {stage === 'review' && (
          <div className="slide-up" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
            <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 900, color: t.txt }}>Submission Received!</h2>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: t.txtFaint, lineHeight: 1.6 }}>Your proof is being reviewed. You&apos;ll be notified when verification is complete.</p>

            <Surface variant="inset" padding="20px" style={{ marginBottom: 24, textAlign: 'left' }}>
              <p style={{ margin: '0 0 14px', fontSize: 12, fontWeight: 700, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Verification Pipeline</p>
              {['Submitted', 'AI Reviewing', 'Manual Review', 'Approved'].map((s, i) => (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: i < 3 ? 10 : 0 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: i === 0 ? `${t.accent}26` : 'rgba(255,255,255,0.05)', border: `1.5px solid ${i === 0 ? t.accent : t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {i === 0 ? <Check size={12} strokeWidth={2.5} style={{ color: t.accent }} /> : <span style={{ fontSize: 11, color: t.txtFaint }}>{i + 1}</span>}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: i === 0 ? 700 : 500, color: i === 0 ? t.txt : t.txtFaint }}>{s}</p>
                    {i === 0 && <p style={{ margin: '1px 0 0', fontSize: 11, color: t.accent }}>Completed</p>}
                    {i === 1 && <p style={{ margin: '1px 0 0', fontSize: 11, color: t.txtFaint }}>1–2 hours</p>}
                    {i === 2 && <p style={{ margin: '1px 0 0', fontSize: 11, color: t.txtFaint }}>1–3 days</p>}
                  </div>
                </div>
              ))}
            </Surface>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => router.push(`/complete/${huntId}`)} style={{ flex: 1, height: 48, borderRadius: 14, background: `${t.accent}18`, border: `1px solid ${t.accent}40`, color: t.accent, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                Track Status
              </button>
              <button onClick={() => router.push('/explore')} style={{ flex: 1, height: 48, borderRadius: 14, background: t.accent, color: t.bg, fontSize: 14, fontWeight: 800, cursor: 'pointer', border: 'none' }}>
                Find More
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Bottom CTA (for non-review stages) */}
      {stage !== 'review' && stage !== 'execution' && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '12px 20px', background: `${t.bg}F5`, backdropFilter: 'blur(16px)', borderTop: `1px solid ${t.border}`, zIndex: 40 }}>
          <button
            onClick={() => {
              const idx = STAGE_NUMS[stage];
              if (idx < STAGES.length - 1) setStage(STAGES[idx + 1]);
            }}
            style={{ width: '100%', height: 52, borderRadius: 16, background: t.accent, color: t.bg, fontSize: 15, fontWeight: 800, cursor: 'pointer', border: 'none', boxShadow: `0 4px 20px ${t.accent}40` }}
          >
            {stage === 'overview' ? 'Continue to Requirements →' : stage === 'requirements' ? 'Start Mission →' : stage === 'proof' ? 'Review →' : 'Continue →'}
          </button>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
