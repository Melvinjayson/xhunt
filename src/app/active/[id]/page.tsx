'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Check, SkipForward, ChevronDown, ChevronUp, Upload, MapPin, QrCode, Camera, FileText, MessageSquare, Lightbulb, Square, CheckSquare } from 'lucide-react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
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

const STEP_TIPS: Record<string, string[]> = {
  action:        ['Take a concrete action towards the mission goal', 'Document what you do with a photo or brief note', 'Reach out to someone who can help or verify'],
  reflection:    ['Write down your thoughts as you go', 'Consider multiple perspectives on the topic', 'Connect this experience to your personal values'],
  discovery:     ['Look for opportunities in your immediate environment', 'Ask questions and stay curious', 'Take photos or notes of what you find'],
  research:      ['Use multiple sources to verify your findings', 'Note your sources for the submission', 'Look for recent, authoritative references'],
  submission:    ['Review your work carefully before submitting', 'Include all required evidence', 'Be specific and clear in your written explanation'],
  collaboration: ['Communicate clearly with your team', 'Document your specific contribution', 'Coordinate timing and next steps with collaborators'],
};

const DEFAULT_TIPS = ['Read and understand the objective fully', 'Take the required action', 'Document your progress or result'];

const PROOF_TYPES = [
  { id: 'photo', label: 'Photo', icon: Camera },
  { id: 'video', label: 'Video', icon: Camera },
  { id: 'document', label: 'Document', icon: FileText },
  { id: 'survey', label: 'Survey', icon: MessageSquare },
  { id: 'gps', label: 'GPS Check-in', icon: MapPin },
  { id: 'qr', label: 'QR Scan', icon: QrCode },
];

const DEFAULT_CHECKLIST = [
  'Read and understand the step objective',
  'Take the required action',
  'Document your progress or result',
];

export default function ActiveMissionPage() {
  const params = useParams();
  const router = useRouter();
  const huntId = params?.id as string;

  const [hunt, setHunt]                 = useState<Hunt | null>(null);
  const [progress, setProgress]         = useState<HuntProgress>({ huntId, currentStepIndex: 0, completedSteps: [], startedAt: new Date().toISOString() });
  const [stage, setStage]               = useState<Stage>('overview');
  const [showSkip, setShowSkip]         = useState(false);
  const [expandCriteria, setExpandCriteria] = useState(false);
  const [proofType, setProofType]       = useState<string>('photo');
  const [proofText, setProofText]       = useState('');
  const [submitting, setSubmitting]     = useState(false);
  const [submitted, setSubmitted]       = useState(false);
  const [proofError, setProofError]     = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());

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
    setCheckedItems(new Set());
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
    setCheckedItems(new Set());
  }

  async function submitProof() {
    if (!hunt) return;
    setSubmitting(true);
    setProofError('');
    try {
      const res = await fetch('/api/outcomes/validations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mission_id: hunt.id,
          validation_type: 'self_reported',
          evidence: [
            { type: 'attestation', value: proofText || 'Mission completed.' },
            { type: 'attestation', value: `Proof type: ${proofType}` },
            ...(selectedFile ? [{ type: 'file', value: selectedFile.name }] : []),
          ],
        }),
      });
      if (!res.ok) throw new Error(`Submission failed (${res.status})`);
    } catch (err: unknown) {
      setProofError(err instanceof Error ? err.message : 'Submission failed. Please try again.');
      setSubmitting(false);
      return;
    }
    setVerificationStatus(huntId, 'submitted');
    const state = loadState();
    const completedHunt = { huntId, huntTitle: hunt.title, reward: `$${estimateCashReward(hunt.cashReward, hunt.difficulty, hunt.missionType)}`, completedAt: new Date().toISOString() };
    saveState({ ...state, completedHunts: [...(state.completedHunts ?? []).filter(c => c.huntId !== huntId), completedHunt] });
    setSubmitted(true);
    setStage('review');
    setSubmitting(false);
  }

  if (!hunt) return (
    <Box className="consumer-app" sx={{ minHeight: '100vh', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Box className="breathe" sx={{ width: 40, height: 40, borderRadius: '50%', background: `${t.accent}26` }} />
    </Box>
  );

  const currentStep: Step | undefined = hunt.steps[progress.currentStepIndex];
  const stageIdx  = STAGE_NUMS[stage];
  const cash      = estimateCashReward(hunt.cashReward, hunt.difficulty, hunt.missionType);
  const xp        = estimateXP(hunt.xpReward, hunt.difficulty, hunt.steps.length);
  const stepPct   = hunt.steps.length > 0 ? Math.round((progress.completedSteps.length / hunt.steps.length) * 100) : 0;

  const stepTips = currentStep ? (STEP_TIPS[currentStep.type] ?? DEFAULT_TIPS) : DEFAULT_TIPS;
  const checklistItems = DEFAULT_CHECKLIST;

  function toggleCheck(i: number) {
    setCheckedItems(prev => {
      const s = new Set(prev);
      s.has(i) ? s.delete(i) : s.add(i);
      return s;
    });
  }

  return (
    <Box className="consumer-app" sx={{ background: t.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <Box sx={{ position: 'sticky', top: 0, zIndex: 30, background: `${t.bg}F5`, backdropFilter: 'blur(16px)', padding: '12px 20px', borderBottom: `1px solid ${t.border}` }}>
        <Stack direction="row" sx={{ mb: 1.5, alignItems: 'center', justifyContent: 'space-between' }}>
          <Button
            startIcon={<ArrowLeft size={16} strokeWidth={2} />}
            onClick={() => router.push(`/hunt/${huntId}`)}
            sx={{ background: 'none', border: 'none', color: t.txtDim, fontSize: 13, p: 0, minWidth: 0 }}
          >
            Exit
          </Button>
          <Typography sx={{ fontSize: 12, fontWeight: 600, color: t.txtFaint }}>Step {stageIdx + 1} of 5</Typography>
          <Button
            onClick={() => { router.push('/missions'); }}
            sx={{ fontSize: 12, color: t.txtFaint, background: 'none', border: 'none', p: 0, minWidth: 0 }}
          >
            Save &amp; exit
          </Button>
        </Stack>

        {/* Stage progress pills */}
        <Stack direction="row" spacing={0.5}>
          {STAGES.map((s, i) => (
            <Box key={s} sx={{ flex: 1, minWidth: 0, height: 3, borderRadius: '2px', background: i <= stageIdx ? t.accent : 'rgba(255,255,255,0.1)', transition: 'background 0.3s' }} />
          ))}
        </Stack>
        <Typography sx={{ mt: 0.75, fontSize: 11, fontWeight: 600, color: t.accent, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Stage {stageIdx + 1}: {STAGE_LABELS[stage]}
        </Typography>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, padding: '24px 20px', overflowY: 'auto', maxWidth: 640, margin: '0 auto', width: '100%', boxSizing: 'border-box', paddingBottom: '100px' }}>

        {/* STAGE: Overview */}
        {stage === 'overview' && (
          <Box className="slide-up">
            <Typography variant="h5" sx={{ mb: 1, fontSize: 22, fontWeight: 900, color: t.txt }}>{hunt.title}</Typography>
            <Typography sx={{ mb: 2.5, fontSize: 14, color: t.txtDim, lineHeight: 1.7 }}>{hunt.story_context}</Typography>
            <Stack direction="row" spacing={1.25} sx={{ mb: 3 }}>
              <Surface variant="inset" padding="14px 16px" style={{ flex: 1 }}>
                <Typography sx={{ mb: 0.25, fontSize: 10, color: t.txtFaint, textTransform: 'uppercase', fontWeight: 600 }}>Reward</Typography>
                <Typography sx={{ fontSize: 18, fontWeight: 800, color: t.accent }}>${cash}</Typography>
              </Surface>
              <Surface variant="inset" padding="14px 16px" style={{ flex: 1 }}>
                <Typography sx={{ mb: 0.25, fontSize: 10, color: t.txtFaint, textTransform: 'uppercase', fontWeight: 600 }}>XP</Typography>
                <Typography sx={{ fontSize: 18, fontWeight: 800, color: t.ai }}>+{xp}</Typography>
              </Surface>
              <Surface variant="inset" padding="14px 16px" style={{ flex: 1 }}>
                <Typography sx={{ mb: 0.25, fontSize: 10, color: t.txtFaint, textTransform: 'uppercase', fontWeight: 600 }}>Steps</Typography>
                <Typography sx={{ fontSize: 18, fontWeight: 800, color: t.txt }}>{hunt.steps.length}</Typography>
              </Surface>
            </Stack>
            <Typography sx={{ mb: 1.5, fontSize: 12, fontWeight: 600, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>What you&apos;ll do</Typography>
            <Stack spacing={1.25}>
              {hunt.steps.slice(0, 3).map((step, i) => (
                <Stack key={step.id} direction="row" spacing={1.5}>
                  <Box sx={{ width: 28, height: 28, borderRadius: '8px', background: `${t.accent}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14 }}>{STEP_EMOJI[step.type] ?? '📌'}</Box>
                  <Typography sx={{ fontSize: 13, color: t.txtDim, lineHeight: 1.5, flex: 1, pt: 0.5 }}>{step.instruction}</Typography>
                </Stack>
              ))}
            </Stack>
            {hunt.steps.length > 3 && <Typography sx={{ mt: 1, fontSize: 12, color: t.txtFaint }}>+{hunt.steps.length - 3} more steps</Typography>}
          </Box>
        )}

        {/* STAGE: Requirements */}
        {stage === 'requirements' && (
          <Box className="slide-up">
            <Typography variant="h6" sx={{ mb: 1, fontSize: 20, fontWeight: 800, color: t.txt }}>What you need</Typography>
            <Typography sx={{ mb: 2.5, fontSize: 14, color: t.txtFaint }}>Before you start, make sure you have what&apos;s needed.</Typography>
            {(hunt.requiredSkills ?? []).length > 0 && (
              <Box sx={{ mb: 2.5 }}>
                <Typography sx={{ mb: 1.25, fontSize: 12, fontWeight: 700, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Required Skills</Typography>
                <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap' }}>
                  {hunt.requiredSkills!.map(s => (
                    <Chip key={s} label={s} size="small" sx={{ background: `${t.ai}14`, color: t.ai, border: `1px solid ${t.ai}26`, fontWeight: 600, borderRadius: '100px' }} />
                  ))}
                </Stack>
              </Box>
            )}
            <Box sx={{ mb: 2.5 }}>
              <Typography sx={{ mb: 1.25, fontSize: 12, fontWeight: 700, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Deliverables</Typography>
              <Stack spacing={1}>
                {['Written response or explanation', 'Supporting evidence (photo, video, or document)', 'Any relevant data or sources'].map((d, i) => (
                  <Stack key={i} direction="row" spacing={1.25}>
                    <Box sx={{ width: 20, height: 20, borderRadius: '6px', border: `1.5px solid ${t.accent}60`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Check size={11} strokeWidth={2.5} style={{ color: t.accent }} />
                    </Box>
                    <Typography sx={{ fontSize: 13, color: t.txtDim }}>{d}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>
            {hunt.teamSize && (
              <Surface variant="inset" padding="14px 16px">
                <Typography sx={{ mb: 0.25, fontSize: 11, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Team Size</Typography>
                <Typography sx={{ fontSize: 14, color: t.txt, fontWeight: 600 }}>{hunt.teamSize}</Typography>
              </Surface>
            )}
          </Box>
        )}

        {/* STAGE: Execution */}
        {stage === 'execution' && currentStep && (
          <Box className="slide-up">
            {/* Step progress */}
            <Box sx={{ mb: 2.5 }}>
              <ProgressBar value={stepPct} color={t.accent} height={4} label={`Step ${progress.currentStepIndex + 1} of ${hunt.steps.length}`} showPercent />
            </Box>

            {/* Step type badge */}
            <Chip
              icon={<span style={{ fontSize: 16 }}>{STEP_EMOJI[currentStep.type] ?? '📌'}</span>}
              label={currentStep.type.toUpperCase()}
              size="small"
              sx={{
                background: `${STEP_COLOR[currentStep.type] || t.accent}18`,
                color: STEP_COLOR[currentStep.type] || t.accent,
                fontWeight: 700,
                fontSize: 11,
                letterSpacing: '0.06em',
                borderRadius: '100px',
                mb: 2,
              }}
            />

            {/* Instruction */}
            <Typography variant="h6" sx={{ mb: 2, fontSize: 18, fontWeight: 800, color: t.txt, lineHeight: 1.35 }}>{currentStep.instruction}</Typography>

            {/* Success criteria toggle */}
            <Button
              onClick={() => setExpandCriteria(c => !c)}
              startIcon={expandCriteria ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              sx={{
                background: `${t.accent}14`,
                border: `1px solid ${t.accent}26`,
                borderRadius: '10px',
                color: t.accent,
                fontSize: 12,
                fontWeight: 600,
                mb: 2.5,
                textTransform: 'none',
              }}
            >
              {expandCriteria ? 'Hide' : 'Show'} success criteria
            </Button>
            {expandCriteria && (
              <Surface variant="inset" padding="14px 16px" style={{ marginBottom: 20 }}>
                <Typography sx={{ mb: 0.5, fontSize: 11, color: t.accent, fontWeight: 600, textTransform: 'uppercase' }}>Success Criteria</Typography>
                <Typography sx={{ fontSize: 13, color: t.txtDim, lineHeight: 1.6 }}>{currentStep.success_criteria}</Typography>
              </Surface>
            )}

            {/* Checklist */}
            <Box sx={{ mb: 2.5 }}>
              <Typography sx={{ mb: 1.25, fontSize: 12, fontWeight: 700, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Your checklist</Typography>
              <Stack spacing={1}>
                {checklistItems.map((item, i) => (
                  <Box
                    key={i}
                    component="button"
                    onClick={() => toggleCheck(i)}
                    sx={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      background: checkedItems.has(i) ? `${t.accent}10` : t.card,
                      border: `1px solid ${checkedItems.has(i) ? t.accent + '30' : t.border}`,
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontFamily: 'inherit',
                    }}
                  >
                    {checkedItems.has(i)
                      ? <CheckSquare size={16} strokeWidth={2} style={{ color: t.accent, flexShrink: 0 }} />
                      : <Square size={16} strokeWidth={1.5} style={{ color: t.txtFaint, flexShrink: 0 }} />}
                    <Typography component="span" sx={{ fontSize: 13, color: checkedItems.has(i) ? t.txt : t.txtDim, fontWeight: checkedItems.has(i) ? 600 : 400, textDecoration: checkedItems.has(i) ? 'line-through' : 'none' }}>{item}</Typography>
                  </Box>
                ))}
              </Stack>
              <Typography sx={{ mt: 1, fontSize: 11, color: t.txtFaint }}>Mark items complete as you go — your progress saves automatically.</Typography>
            </Box>

            {/* Tips card */}
            <Surface variant="inset" padding="14px 16px" style={{ marginBottom: 20 }}>
              <Stack direction="row" spacing={1} sx={{ mb: 1.25, alignItems: 'center' }}>
                <Lightbulb size={14} style={{ color: t.warning, flexShrink: 0 }} />
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: t.warning, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tips for this step</Typography>
              </Stack>
              <Stack spacing={0.75}>
                {stepTips.slice(0, 3).map((tip, i) => (
                  <Typography key={i} sx={{ fontSize: 13, color: t.txtDim, lineHeight: 1.5, pl: 0.5 }}>· {tip}</Typography>
                ))}
              </Stack>
            </Surface>

            {/* AI assist */}
            <Box sx={{ mb: 2.5 }}>
              <AIAssistant context={{ huntTitle: hunt.title, huntStory: hunt.story_context, stepInstruction: currentStep.instruction, stepType: currentStep.type }} />
            </Box>

            {/* Actions */}
            <Stack direction="row" spacing={1.25} sx={{ mt: 1 }}>
              <Button
                onClick={() => setShowSkip(true)}
                startIcon={<SkipForward size={15} strokeWidth={2} />}
                sx={{ height: 48, px: 2, borderRadius: '14px', background: 'none', border: `1px solid ${t.border}`, color: t.txtFaint, fontSize: 13, fontWeight: 600 }}
              >
                Skip
              </Button>
              <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={completeStep}
                startIcon={<Check size={16} strokeWidth={2.5} />}
                sx={{ height: 48, borderRadius: '14px', fontSize: 14, fontWeight: 800, boxShadow: `0 4px 16px ${t.accent}40` }}
              >
                Mark Complete
              </Button>
            </Stack>

            {/* Skip confirmation */}
            {showSkip && (
              <Box sx={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }}>
                <Box className="slide-up" sx={{ background: t.surface, borderRadius: '24px 24px 0 0', padding: '24px 20px 32px', width: '100%', boxSizing: 'border-box' }}>
                  <Typography sx={{ mb: 1, fontSize: 16, fontWeight: 800, color: t.txt }}>Skip this step?</Typography>
                  <Typography sx={{ mb: 2.5, fontSize: 13, color: t.txtFaint }}>Skipping may reduce your verification score.</Typography>
                  <Stack direction="row" spacing={1.25}>
                    <Button
                      fullWidth
                      onClick={() => setShowSkip(false)}
                      sx={{ height: 46, borderRadius: '14px', background: t.card, border: `1px solid ${t.border}`, color: t.txtDim, fontSize: 14, fontWeight: 600 }}
                    >
                      Cancel
                    </Button>
                    <Button
                      fullWidth
                      onClick={skipStep}
                      sx={{ height: 46, borderRadius: '14px', background: t.warning, color: t.bg, fontSize: 14, fontWeight: 700, border: 'none' }}
                    >
                      Skip Step
                    </Button>
                  </Stack>
                </Box>
              </Box>
            )}
          </Box>
        )}

        {/* STAGE: Proof */}
        {stage === 'proof' && (
          <Box className="slide-up">
            <Typography variant="h6" sx={{ mb: 1, fontSize: 20, fontWeight: 800, color: t.txt }}>Submit your proof</Typography>
            <Typography sx={{ mb: 2.5, fontSize: 14, color: t.txtFaint }}>Provide evidence of your work to unlock verification and rewards.</Typography>

            {/* Proof type selector */}
            <Box sx={{ mb: 2.5 }}>
              <Typography sx={{ mb: 1.25, fontSize: 12, fontWeight: 700, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Proof Type</Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                {PROOF_TYPES.map(({ id, label, icon: Icon }) => (
                  <Chip
                    key={id}
                    icon={<Icon size={12} strokeWidth={2} />}
                    label={label}
                    onClick={() => setProofType(id)}
                    sx={{
                      border: `1.5px solid ${proofType === id ? t.accent : t.border}`,
                      background: proofType === id ? `${t.accent}18` : t.card,
                      color: proofType === id ? t.accent : t.txtDim,
                      fontWeight: proofType === id ? 700 : 500,
                      fontSize: 12,
                      borderRadius: '100px',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </Stack>
            </Box>

            {/* File upload */}
            <input
              type="file"
              id="proof-upload"
              multiple
              accept="image/*,video/*,.pdf"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setSelectedFile(file);
              }}
            />
            <Box component="label" htmlFor="proof-upload" sx={{ display: 'block', mb: 2, cursor: 'pointer' }}>
              <Surface variant="inset" padding="32px 20px" style={{ textAlign: 'center', border: `2px dashed ${selectedFile ? t.accent : t.border}`, background: selectedFile ? `${t.accent}06` : undefined }}>
                <Upload size={28} strokeWidth={1.5} style={{ color: selectedFile ? t.accent : t.txtFaint, marginBottom: 10 }} />
                {selectedFile ? (
                  <Stack spacing={0.5} sx={{ alignItems: 'center' }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 600, color: t.accent }}>{selectedFile.name}</Typography>
                    <Typography sx={{ fontSize: 12, color: t.txtFaint }}>Tap to change file</Typography>
                  </Stack>
                ) : (
                  <Stack spacing={0.5} sx={{ alignItems: 'center' }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 600, color: t.txt }}>Upload {proofType}</Typography>
                    <Typography sx={{ fontSize: 12, color: t.txtFaint }}>Tap to choose a file</Typography>
                  </Stack>
                )}
              </Surface>
            </Box>

            {/* Text proof */}
            <Box sx={{ mb: 2.5 }}>
              <Typography sx={{ mb: 1, fontSize: 12, fontWeight: 700, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Written Explanation</Typography>
              <TextField
                multiline
                rows={5}
                fullWidth
                value={proofText}
                onChange={e => setProofText(e.target.value)}
                placeholder="Describe what you did, what you found, and how it meets the mission objectives..."
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '14px',
                    background: t.card,
                    color: t.txt,
                    fontSize: 13,
                    '& fieldset': { borderColor: t.border },
                    '&:hover fieldset': { borderColor: t.txtDim },
                    '&.Mui-focused fieldset': { borderColor: t.accent },
                  },
                  '& .MuiInputBase-input': { color: t.txt, lineHeight: 1.6 },
                  '& .MuiInputBase-input::placeholder': { color: t.txtFaint, opacity: 1 },
                }}
              />
            </Box>

            {/* Error message */}
            {proofError && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: 2, fontSize: 13 }}>{proofError}</Alert>
            )}

            <Button
              variant="contained"
              color="primary"
              fullWidth
              size="large"
              onClick={submitProof}
              disabled={submitting}
              sx={{ height: 52, borderRadius: 2, fontSize: 15, fontWeight: 800, boxShadow: `0 4px 20px ${t.accent}40` }}
            >
              {submitting ? 'Submitting…' : 'Submit Proof'}
            </Button>
          </Box>
        )}

        {/* STAGE: Review */}
        {stage === 'review' && (
          <Box className="slide-up" sx={{ textAlign: 'center' }}>
            <Typography sx={{ fontSize: 56, mb: 2 }}>✅</Typography>
            <Typography variant="h5" sx={{ mb: 1, fontSize: 22, fontWeight: 900, color: t.txt }}>Submission Received!</Typography>
            <Typography sx={{ mb: 3, fontSize: 14, color: t.txtFaint, lineHeight: 1.6 }}>Your proof is being reviewed. You&apos;ll be notified when verification is complete.</Typography>

            <Surface variant="inset" padding="20px" style={{ marginBottom: 24, textAlign: 'left' }}>
              <Typography sx={{ mb: 1.75, fontSize: 12, fontWeight: 700, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Verification Pipeline</Typography>
              <Stack spacing={1.25}>
                {['Submitted', 'AI Reviewing', 'Manual Review', 'Approved'].map((s, i) => (
                  <Stack key={s} direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
                    <Box sx={{ width: 28, height: 28, borderRadius: '50%', background: i === 0 ? `${t.accent}26` : 'rgba(255,255,255,0.05)', border: `1.5px solid ${i === 0 ? t.accent : t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {i === 0 ? <Check size={12} strokeWidth={2.5} style={{ color: t.accent }} /> : <Typography sx={{ fontSize: 11, color: t.txtFaint }}>{i + 1}</Typography>}
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: 13, fontWeight: i === 0 ? 700 : 500, color: i === 0 ? t.txt : t.txtFaint }}>{s}</Typography>
                      {i === 0 && <Typography sx={{ fontSize: 11, color: t.accent }}>Completed</Typography>}
                      {i === 1 && <Typography sx={{ fontSize: 11, color: t.txtFaint }}>1–2 hours</Typography>}
                      {i === 2 && <Typography sx={{ fontSize: 11, color: t.txtFaint }}>1–3 days</Typography>}
                    </Box>
                  </Stack>
                ))}
              </Stack>
            </Surface>

            <Stack direction="row" spacing={1.25}>
              <Button
                fullWidth
                onClick={() => router.push(`/complete/${huntId}`)}
                sx={{ height: 48, borderRadius: '14px', background: `${t.accent}18`, border: `1px solid ${t.accent}40`, color: t.accent, fontSize: 14, fontWeight: 700 }}
              >
                Track Status
              </Button>
              <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={() => router.push('/explore')}
                sx={{ height: 48, borderRadius: '14px', fontSize: 14, fontWeight: 800 }}
              >
                Find More
              </Button>
            </Stack>
          </Box>
        )}

      </Box>

      {/* Bottom CTA (overview + requirements stages only) */}
      {(stage === 'overview' || stage === 'requirements') && (
        <Box sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '12px 20px', background: `${t.bg}F5`, backdropFilter: 'blur(16px)', borderTop: `1px solid ${t.border}`, zIndex: 40 }}>
          <Button
            variant="contained"
            color="primary"
            fullWidth
            size="large"
            onClick={() => {
              const idx = STAGE_NUMS[stage];
              if (idx < STAGES.length - 1) setStage(STAGES[idx + 1]);
            }}
            sx={{ height: 52, borderRadius: 2, fontSize: 15, fontWeight: 800, boxShadow: `0 4px 20px ${t.accent}40` }}
          >
            {stage === 'overview' ? 'Continue to Requirements →' : 'Start Mission →'}
          </Button>
        </Box>
      )}

      <BottomNav />
    </Box>
  );
}
