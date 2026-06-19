'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Megaphone, Users, MessageSquare, Camera, MapPin, Star,
  Lightbulb, TrendingUp, Heart, FlaskConical, Zap, Gift,
  Target, Play, CheckCircle2, ArrowLeft, ArrowRight, Sparkles,
  RefreshCw, Rocket,
} from 'lucide-react';
import { t } from '@/theme/colors';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import Chip from '@mui/material/Chip';

// ── Step 1: Outcomes ──────────────────────────────────────────────────────────

const OUTCOMES = [
  { id: 'feedback', icon: MessageSquare, label: 'Gather Feedback', desc: 'Collect opinions, reviews, and insights', color: t.ai },
  { id: 'awareness', icon: Megaphone, label: 'Increase Awareness', desc: 'Spread the word about your cause or product', color: t.accent },
  { id: 'recruit', icon: Users, label: 'Recruit Participants', desc: 'Find volunteers, testers, or contributors', color: t.info },
  { id: 'content', icon: Camera, label: 'Collect Content', desc: 'Generate photos, videos, or user stories', color: t.warning },
  { id: 'research', icon: FlaskConical, label: 'Conduct Research', desc: 'Validate ideas and gather market intelligence', color: t.ai },
  { id: 'community', icon: Heart, label: 'Support Community', desc: 'Mobilize people for local or social impact', color: t.error },
  { id: 'validate', icon: TrendingUp, label: 'Validate an Idea', desc: 'Test assumptions with real participants', color: t.accent },
  { id: 'location', icon: MapPin, label: 'Test a Location', desc: 'Understand foot traffic and local sentiment', color: t.info },
] as const;

// ── Step 2: Actions ───────────────────────────────────────────────────────────

const ACTIONS = [
  { id: 'visit', icon: MapPin, label: 'Visit a Location', desc: 'Go somewhere and report back' },
  { id: 'attend', icon: Star, label: 'Attend an Event', desc: 'Show up and participate' },
  { id: 'photo', icon: Camera, label: 'Upload Photos', desc: 'Document with visual proof' },
  { id: 'survey', icon: MessageSquare, label: 'Answer Questions', desc: 'Complete a structured survey' },
  { id: 'try', icon: Gift, label: 'Try a Product', desc: 'Test and share your experience' },
  { id: 'share', icon: Megaphone, label: 'Share Content', desc: 'Post on social or spread the word' },
  { id: 'challenge', icon: Zap, label: 'Complete a Challenge', desc: 'Finish a structured task' },
  { id: 'report', icon: Target, label: 'Report Observations', desc: 'Document what you see or experience' },
] as const;

type OutcomeId = typeof OUTCOMES[number]['id'];
type ActionId = typeof ACTIONS[number]['id'];

interface GeneratedMission {
  title: string;
  summary: string;
  tasks: string[];
  reward: string;
  estimatedTime: string;
  verificationMethod: string;
  expectedParticipants: number;
  completionRate: number;
}

function generateMission(outcome: OutcomeId, action: ActionId, orgName: string): GeneratedMission {
  const titles: Record<string, string> = {
    'feedback-survey': 'Community Feedback Collection',
    'feedback-photo': 'Visual Feedback Campaign',
    'awareness-share': 'Social Awareness Drive',
    'awareness-attend': 'Brand Ambassador Program',
    'recruit-challenge': 'Contributor Challenge',
    'recruit-visit': 'Location Scouting Program',
    'content-photo': 'User Content Generation',
    'content-share': 'Social Content Campaign',
    'research-survey': 'Market Research Study',
    'research-try': 'Product Testing Mission',
    'community-visit': 'Community Outreach Mission',
    'community-challenge': 'Impact Challenge',
    'validate-survey': 'Idea Validation Study',
    'validate-try': 'Prototype Testing Mission',
    'location-visit': 'Location Intelligence Mission',
    'location-report': 'Location Audit',
  };

  const key = `${outcome}-${action}`;
  const title = titles[key] ?? `${orgName} Participation Mission`;

  const tasksByAction: Record<string, string[]> = {
    visit: ['Go to the designated location', 'Check in via the app', 'Spend at least 5 minutes', 'Submit your visit report'],
    attend: ['Register for the event', 'Attend and participate', 'Complete the check-in', 'Submit your experience summary'],
    photo: ['Go to the mission location', 'Take 3+ clear photos', 'Add a caption describing what you see', 'Submit your photos for review'],
    survey: ['Open the mission brief', 'Complete all survey questions', 'Add any additional comments', 'Submit your responses'],
    try: ['Receive or access the product/service', 'Use it for the specified period', 'Document your experience', 'Submit your detailed review'],
    share: ['Create content about the mission topic', 'Share on your chosen platform', 'Screenshot your post', 'Submit proof of sharing'],
    challenge: ['Read the challenge brief carefully', 'Complete each required task', 'Document your progress', 'Submit your completion proof'],
    report: ['Observe the specified area or topic', 'Document your findings', 'Rate your experience (1–5)', 'Submit your detailed report'],
  };

  return {
    title,
    summary: `Help ${orgName || 'us'} ${outcome === 'feedback' ? 'gather valuable insights' : outcome === 'awareness' ? 'increase visibility' : outcome === 'recruit' ? 'find passionate contributors' : 'create meaningful impact'} through a structured participation mission.`,
    tasks: tasksByAction[action] ?? ['Complete the mission brief', 'Take required evidence', 'Submit for verification'],
    reward: outcome === 'research' || outcome === 'validate' ? '€25–€50' : outcome === 'content' ? '€15–€30' : '€10–€20',
    estimatedTime: action === 'survey' ? '10–15 mins' : action === 'visit' || action === 'attend' ? '30–60 mins' : '15–30 mins',
    verificationMethod: action === 'photo' || action === 'share' ? 'Photo/Screenshot upload' : action === 'survey' ? 'Automatic on completion' : 'AI + manual review',
    expectedParticipants: Math.floor(Math.random() * 40) + 20,
    completionRate: Math.floor(Math.random() * 20) + 72,
  };
}

export default function CreateMissionPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedOutcome, setSelectedOutcome] = useState<OutcomeId | null>(null);
  const [selectedAction, setSelectedAction] = useState<ActionId | null>(null);
  const [generated, setGenerated] = useState<GeneratedMission | null>(null);
  const [generating, setGenerating] = useState(false);
  const [launching, setLaunching] = useState(false);

  async function handleGenerate() {
    if (!selectedOutcome || !selectedAction) return;
    setGenerating(true);
    await new Promise((r) => setTimeout(r, 1400));
    setGenerated(generateMission(selectedOutcome, selectedAction, ''));
    setGenerating(false);
    setStep(3);
  }

  async function handleLaunch() {
    if (!generated) return;
    setLaunching(true);
    try {
      const res = await fetch('/api/missions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: generated.title,
          description: generated.summary,
          tasks: generated.tasks,
          reward: generated.reward,
          estimated_time: generated.estimatedTime,
          verification_method: generated.verificationMethod,
          status: 'active',
        }),
      });
      const data = await res.json();
      if (res.ok && data.id) {
        router.push(`/workspace/missions/${data.id}`);
      } else {
        router.push('/workspace/missions');
      }
    } catch {
      router.push('/workspace/missions');
    }
  }

  const progress = step === 1 ? 33 : step === 2 ? 66 : 100;

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ background: t.bg }}>
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => step > 1 ? setStep((s) => (s - 1) as 1 | 2 | 3) : router.back()}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:opacity-80"
            style={{ background: t.card, border: `1px solid ${t.panel}` }}
          >
            <ArrowLeft size={16} strokeWidth={2} style={{ color: t.txtDim }} />
          </button>
          <div className="flex-1">
            <Typography sx={{ fontSize: 18, fontWeight: 800, color: 'text.primary', letterSpacing: '-0.02em' }}>
              Create Mission
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Step {step} of 3 · {step === 1 ? 'Choose outcome' : step === 2 ? 'Define action' : 'Review & launch'}
            </Typography>
          </div>
        </div>

        {/* Progress bar */}
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: 4, borderRadius: 2, mb: 6,
            bgcolor: t.panel,
            '& .MuiLinearProgress-bar': { borderRadius: 2, bgcolor: t.accent },
          }}
        />

        {/* ── Step 1: What outcome? ── */}
        {step === 1 && (
          <div>
            <Typography sx={{ fontSize: 22, fontWeight: 800, color: 'text.primary', mb: 1, letterSpacing: '-0.02em' }}>
              What would you like to achieve?
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Choose the primary goal for your mission. The system will help build it for you.
            </Typography>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {OUTCOMES.map(({ id, icon: Icon, label, desc, color }) => {
                const active = selectedOutcome === id;
                return (
                  <button
                    key={id}
                    onClick={() => setSelectedOutcome(id)}
                    className="text-left rounded-2xl p-4 transition-all"
                    style={{
                      background: active ? `${color}12` : t.card,
                      border: `1.5px solid ${active ? color : t.panel}`,
                    }}
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${color}18` }}>
                      <Icon size={17} strokeWidth={1.8} style={{ color }} />
                    </div>
                    <Typography sx={{ fontSize: 14, fontWeight: 700, color: active ? 'text.primary' : t.txtDim, mb: 0.5 }}>
                      {label}
                    </Typography>
                    <Typography variant="caption" sx={{ color: t.txtFaint, lineHeight: 1.4 }}>
                      {desc}
                    </Typography>
                  </button>
                );
              })}
            </div>
            <button
              disabled={!selectedOutcome}
              onClick={() => setStep(2)}
              className="w-full mt-6 h-12 rounded-xl font-bold text-[15px] flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity hover:opacity-90"
              style={{ background: t.accent, color: t.bg }}
            >
              Continue <ArrowRight size={16} strokeWidth={2.5} />
            </button>
          </div>
        )}

        {/* ── Step 2: What action? ── */}
        {step === 2 && (
          <div>
            <Typography sx={{ fontSize: 22, fontWeight: 800, color: 'text.primary', mb: 1, letterSpacing: '-0.02em' }}>
              What should people do?
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Choose the primary action participants will take to complete this mission.
            </Typography>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ACTIONS.map(({ id, icon: Icon, label, desc }) => {
                const active = selectedAction === id;
                return (
                  <button
                    key={id}
                    onClick={() => setSelectedAction(id)}
                    className="text-left rounded-2xl p-4 transition-all"
                    style={{
                      background: active ? `${t.accent}10` : t.card,
                      border: `1.5px solid ${active ? t.accent : t.panel}`,
                    }}
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: active ? `${t.accent}18` : t.panel }}>
                      <Icon size={17} strokeWidth={1.8} style={{ color: active ? t.accent : t.txtDim }} />
                    </div>
                    <Typography sx={{ fontSize: 14, fontWeight: 700, color: active ? 'text.primary' : t.txtDim, mb: 0.5 }}>
                      {label}
                    </Typography>
                    <Typography variant="caption" sx={{ color: t.txtFaint, lineHeight: 1.4 }}>
                      {desc}
                    </Typography>
                  </button>
                );
              })}
            </div>
            <button
              disabled={!selectedAction || generating}
              onClick={handleGenerate}
              className="w-full mt-6 h-12 rounded-xl font-bold text-[15px] flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity hover:opacity-90"
              style={{ background: t.accent, color: t.bg }}
            >
              {generating ? (
                <>
                  <RefreshCw size={16} strokeWidth={2.5} className="animate-spin" />
                  Building your mission…
                </>
              ) : (
                <>
                  <Sparkles size={16} strokeWidth={2.5} />
                  Generate Mission
                </>
              )}
            </button>
          </div>
        )}

        {/* ── Step 3: Review & Launch ── */}
        {step === 3 && generated && (
          <div>
            <Stack direction="row" spacing={1.5} sx={{ mb: 1, alignItems: 'center' }}>
              <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: `${t.accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={16} color={t.accent} strokeWidth={2} />
              </Box>
              <Typography variant="caption" sx={{ color: t.accent, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 11 }}>
                Mission Created
              </Typography>
            </Stack>
            <Typography sx={{ fontSize: 22, fontWeight: 800, color: 'text.primary', mb: 0.5, letterSpacing: '-0.02em' }}>
              {generated.title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4, lineHeight: 1.6 }}>
              {generated.summary}
            </Typography>

            {/* Mission details card */}
            <Box sx={{ bgcolor: t.card, borderRadius: '20px', border: `1px solid ${t.panel}`, overflow: 'hidden', mb: 3 }}>
              {/* Tasks */}
              <Box sx={{ p: 3, borderBottom: `1px solid ${t.panel}` }}>
                <Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: 'center' }}>
                  <Play size={14} color={t.accent} strokeWidth={2} />
                  <Typography variant="caption" sx={{ fontWeight: 700, color: t.accent, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 11 }}>
                    Tasks
                  </Typography>
                </Stack>
                <Stack spacing={1.25}>
                  {generated.tasks.map((task, i) => (
                    <Stack key={i} direction="row" spacing={1.25} sx={{ alignItems: 'flex-start' }}>
                      <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: `${t.accent}14`, border: `1px solid ${t.accent}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, mt: 0.25 }}>
                        <Typography sx={{ fontSize: 10, fontWeight: 800, color: 'primary.main' }}>{i + 1}</Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">{task}</Typography>
                    </Stack>
                  ))}
                </Stack>
              </Box>

              {/* Meta grid */}
              <Box sx={{ p: 3 }}>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Reward', value: generated.reward, color: t.accent },
                    { label: 'Duration', value: generated.estimatedTime, color: t.info },
                    { label: 'Verification', value: generated.verificationMethod, color: t.ai },
                    { label: 'Expected', value: `${generated.expectedParticipants} participants`, color: t.warning },
                  ].map(({ label, value, color }) => (
                    <Box key={label} sx={{ bgcolor: t.panel, borderRadius: '12px', p: '10px 12px' }}>
                      <Typography variant="caption" sx={{ color: t.txtFaint, display: 'block', mb: 0.5 }}>{label}</Typography>
                      <Typography sx={{ fontSize: 13, fontWeight: 700, color }}>{value}</Typography>
                    </Box>
                  ))}
                </div>
              </Box>

              {/* Estimated performance */}
              <Box sx={{ p: 3, borderTop: `1px solid ${t.panel}`, bgcolor: `${t.accent}06` }}>
                <Stack direction="row" sx={{ mb: 1.5, alignItems: 'center', justifyContent: 'space-between' }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <TrendingUp size={13} color={t.accent} strokeWidth={2} />
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main', fontSize: 11 }}>
                      ESTIMATED COMPLETION RATE
                    </Typography>
                  </Stack>
                  <Typography sx={{ fontSize: 16, fontWeight: 800, color: 'primary.main' }}>
                    {generated.completionRate}%
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={generated.completionRate}
                  sx={{
                    height: 6, borderRadius: 3,
                    bgcolor: `${t.accent}14`,
                    '& .MuiLinearProgress-bar': { borderRadius: 3, bgcolor: t.accent },
                  }}
                />
              </Box>
            </Box>

            {/* Tags */}
            <Stack direction="row" spacing={1} useFlexGap sx={{ mb: 4, flexWrap: 'wrap' }}>
              {selectedOutcome && (
                <Chip
                  label={OUTCOMES.find((o) => o.id === selectedOutcome)?.label}
                  size="small"
                  sx={{ fontSize: 11, fontWeight: 700, height: 24, bgcolor: `${t.ai}14`, color: t.aiLight, border: 'none' }}
                />
              )}
              {selectedAction && (
                <Chip
                  label={ACTIONS.find((a) => a.id === selectedAction)?.label}
                  size="small"
                  sx={{ fontSize: 11, fontWeight: 700, height: 24, bgcolor: `${t.accent}14`, color: 'primary.main', border: 'none' }}
                />
              )}
            </Stack>

            {/* CTAs */}
            <Stack spacing={1.5}>
              <button
                disabled={launching}
                onClick={handleLaunch}
                className="w-full h-13 rounded-xl font-bold text-[15px] flex items-center justify-center gap-2 disabled:opacity-60 transition-opacity hover:opacity-90"
                style={{ background: t.accent, color: t.bg, height: 52 }}
              >
                {launching ? (
                  <><RefreshCw size={16} className="animate-spin" /> Launching…</>
                ) : (
                  <><Rocket size={16} strokeWidth={2.5} /> Launch Mission</>
                )}
              </button>
              <button
                onClick={() => setStep(2)}
                className="w-full h-11 rounded-xl font-medium text-[14px] transition-opacity hover:opacity-80"
                style={{ background: t.card, border: `1px solid ${t.panel}`, color: t.txtDim }}
              >
                Edit Mission
              </button>
            </Stack>
          </div>
        )}
      </div>
    </div>
  );
}
