'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Clock, Bookmark, BookmarkCheck, Shield, Zap, ChevronDown, ChevronUp, MapPin, Users } from 'lucide-react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
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
    const found = state.hunts.find(h => h.id === huntId) ?? null;
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
    <Box className="consumer-app" sx={{ background: t.bg }}>
      <Stack sx={{ padding: '20px' }} spacing={2}>
        {[1,2,3].map(i => <Box key={i} sx={{ height: 80, borderRadius: 2, background: t.card }} className="breathe" />)}
      </Stack>
      <BottomNav />
    </Box>
  );

  if (!hunt) return (
    <Box className="consumer-app" sx={{ background: t.bg }}>
      <Stack spacing={2} sx={{ padding: '40px 20px', alignItems: 'center' }}>
        <Typography sx={{ color: t.txtFaint }}>Mission not found.</Typography>
        <Button variant="contained" color="primary" onClick={() => router.push('/explore')}>Browse Missions</Button>
      </Stack>
      <BottomNav />
    </Box>
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

  const RewardPills = () => (
    <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
      <Chip
        label={<><span style={{ fontSize: 18, fontWeight: 900, color: t.accent }}>${cash}</span><span style={{ fontSize: 11, color: t.txtDim, marginLeft: 4 }}>reward</span></>}
        sx={{ background: `${t.accent}18`, border: `1px solid ${t.accent}30`, borderRadius: '12px', height: 36, '& .MuiChip-label': { px: 2 } }}
      />
      <Chip
        icon={<Zap size={14} strokeWidth={2} style={{ color: t.ai }} />}
        label={`${xp} XP`}
        sx={{ background: `${t.ai}18`, border: `1px solid ${t.ai}30`, borderRadius: '12px', color: t.ai, fontWeight: 700, fontSize: 14, height: 36 }}
      />
      <Chip
        icon={<Clock size={13} strokeWidth={1.8} style={{ color: t.txtFaint }} />}
        label={hunt.estimated_time}
        sx={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '12px', color: t.txtDim, fontSize: 13, height: 36 }}
      />
      {dl && (
        <Chip
          label={dl.label}
          sx={{ background: `${dl.color}14`, borderRadius: '12px', color: dl.color, fontWeight: 700, fontSize: 13, height: 36 }}
        />
      )}
    </Stack>
  );

  const MetaBadges = () => (
    <Stack direction="row" spacing={0.75} sx={{ mb: 2, flexWrap: 'wrap' }}>
      <Chip size="small" label={diff.label} sx={{ background: diff.bg, color: diff.color, fontWeight: 700, fontSize: 11, borderRadius: '100px' }} />
      {typeMeta && <Chip size="small" label={`${typeMeta.emoji} ${typeMeta.label}`} sx={{ background: `${typeMeta.color}14`, color: typeMeta.color, fontWeight: 600, fontSize: 11, borderRadius: '100px' }} />}
      {hunt.locationType && (
        <Chip
          size="small"
          icon={<MapPin size={9} strokeWidth={2} />}
          label={hunt.locationType}
          sx={{ background: t.card, border: `1px solid ${t.border}`, color: t.txtDim, fontWeight: 600, fontSize: 11, borderRadius: '100px' }}
        />
      )}
      {sl && <Chip size="small" label={sl.label} sx={{ color: sl.color, fontWeight: 600, fontSize: 11, background: 'transparent' }} />}
      {demand && <Chip size="small" label={demand} sx={{ color: t.warning, fontWeight: 600, fontSize: 11, background: 'transparent' }} />}
    </Stack>
  );

  const CtaButtons = ({ compact }: { compact?: boolean }) => (
    <Stack direction="row" spacing={1.25}>
      {isCompleted ? (
        <Button
          variant="outlined"
          fullWidth
          onClick={() => router.push(`/complete/${huntId}`)}
          sx={{ height: compact ? 44 : 50, borderRadius: 2, borderColor: `${t.accent}40`, color: t.accent, fontSize: compact ? 13 : 15, fontWeight: 700, '&:hover': { borderColor: t.accent, background: `${t.accent}18` } }}
        >
          View Verification Status
        </Button>
      ) : (
        <Button
          variant="contained"
          color="primary"
          fullWidth
          onClick={() => router.push(`/active/${huntId}`)}
          sx={{ height: compact ? 44 : 50, borderRadius: 2, fontSize: compact ? 13 : 15, fontWeight: 800, boxShadow: `0 4px 20px ${t.accent}40` }}
        >
          {isStarted ? 'Continue Mission' : 'Start Mission'}
        </Button>
      )}
      <IconButton
        onClick={handleSave}
        sx={{
          width: compact ? 44 : 50, height: compact ? 44 : 50, borderRadius: 2,
          background: saved ? `${t.accent}18` : t.card,
          border: `1px solid ${saved ? t.accent : t.border}`,
          color: saved ? t.accent : t.txtFaint,
          flexShrink: 0,
        }}
      >
        {saved ? <BookmarkCheck size={compact ? 18 : 20} strokeWidth={2} /> : <Bookmark size={compact ? 18 : 20} strokeWidth={1.8} />}
      </IconButton>
    </Stack>
  );

  return (
    <Box className="consumer-app" sx={{ background: t.bg, minHeight: '100vh' }}>
      <Box className="consumer-app-inner">

        {/* Top bar */}
        <Stack
          direction="row"
          sx={{ padding: '16px 20px', position: 'sticky', top: 0, zIndex: 30, background: `${t.bg}F0`, backdropFilter: 'blur(16px)', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Button
            startIcon={<ArrowLeft size={18} strokeWidth={2} />}
            onClick={() => router.back()}
            sx={{ background: 'none', border: 'none', color: t.txtDim, fontSize: 14, fontWeight: 600, p: 0, minWidth: 0 }}
          >
            Back
          </Button>
          <Button
            startIcon={saved ? <BookmarkCheck size={15} strokeWidth={2} /> : <Bookmark size={15} strokeWidth={1.8} />}
            onClick={handleSave}
            sx={{
              background: saved ? `${t.accent}18` : t.card,
              border: `1px solid ${saved ? t.accent : t.border}`,
              borderRadius: '12px',
              color: saved ? t.accent : t.txtDim,
              fontSize: 13,
              fontWeight: 600,
              px: 1.75,
            }}
          >
            {saved ? 'Saved' : 'Save'}
          </Button>
        </Stack>

        <Box sx={{ maxWidth: 1100, margin: '0 auto', width: '100%', boxSizing: 'border-box', padding: '0 20px 100px' }}>

          {/* Category accent bar */}
          <Box sx={{ height: 3, borderRadius: '2px', background: `linear-gradient(90deg, ${category.color}, ${category.color}44)`, mb: 2 }} />

          {/* Title */}
          <Typography variant="h5" sx={{ mb: 1.75, fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: 900, color: t.txt, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            {hunt.title}
          </Typography>

          {/* Org row */}
          <Stack direction="row" spacing={1.25} sx={{ mb: 2.5, alignItems: 'center' }}>
            <Box sx={{ width: 36, height: 36, borderRadius: '10px', background: `${category.color}18`, border: `1px solid ${category.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
              {hunt.tenantLogo ? <img src={hunt.tenantLogo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} /> : category.emoji}
            </Box>
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: t.txtDim }}>
                {hunt.tenantName ?? 'Organization'}
              </Typography>
              {hunt.isVerified && <Shield size={11} strokeWidth={2} style={{ color: t.info }} />}
            </Stack>
          </Stack>

          {/* Mobile: reward pills + meta inline */}
          <Box className="lg:hidden">
            <RewardPills />
            <MetaBadges />
          </Box>

          {/* Progress bar if started */}
          {isStarted && (
            <Surface variant="inset" padding="12px 16px" style={{ marginBottom: 20 }}>
              <Typography sx={{ mb: 1, fontSize: 12, fontWeight: 600, color: t.accent }}>In Progress</Typography>
              <ProgressBar value={stepProgress} label={`Step ${(progress?.completedSteps.length ?? 0) + 1} of ${hunt.steps.length}`} showPercent color={t.accent} />
            </Surface>
          )}

          {/* Desktop two-column body */}
          <Box sx={{ display: { xs: 'block', lg: 'flex' }, gap: 4, alignItems: 'flex-start' }}>

            {/* Left: main content */}
            <Box sx={{ flex: 1, minWidth: 0 }}>

              {/* Overview */}
              <Box component="section" sx={{ mb: 3 }}>
                <SectionHeader title="Mission Overview" />
                <Surface variant="inset" padding="16px">
                  <Typography sx={{ fontSize: 14, color: t.txtDim, lineHeight: 1.7 }}>{hunt.story_context}</Typography>
                </Surface>
              </Box>

              {/* Steps */}
              {hunt.steps?.length > 0 && (
                <Box component="section" sx={{ mb: 3 }}>
                  <SectionHeader title="Participation Steps" count={hunt.steps.length} />
                  <Stack spacing={1}>
                    {hunt.steps.map((step, idx) => {
                      const exp = expandedSteps.has(idx);
                      const STEP_EMOJI: Record<string, string> = { action: '⚡', reflection: '💭', discovery: '🔍', research: '🔬', submission: '📤', collaboration: '🤝' };
                      return (
                        <Surface key={step.id} variant="card" padding="0" style={{ overflow: 'hidden' }}>
                          <Box
                            component="button"
                            onClick={() => toggleStep(idx)}
                            sx={{ width: '100%', display: 'flex', alignItems: 'center', gap: 1.5, padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                          >
                            <Box sx={{ width: 32, height: 32, borderRadius: '10px', background: `${t.accent}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{STEP_EMOJI[step.type] ?? '📌'}</Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography sx={{ fontSize: 10, fontWeight: 600, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Step {idx + 1} · {step.type}</Typography>
                              <Typography sx={{ fontSize: 13, fontWeight: 600, color: t.txt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: exp ? 'normal' : 'nowrap' }}>{step.instruction}</Typography>
                            </Box>
                            {exp ? <ChevronUp size={16} style={{ color: t.txtFaint, flexShrink: 0 }} /> : <ChevronDown size={16} style={{ color: t.txtFaint, flexShrink: 0 }} />}
                          </Box>
                          {exp && (
                            <Box sx={{ padding: '0 16px 14px 60px' }}>
                              <Typography sx={{ mb: 1, fontSize: 13, color: t.txtDim, lineHeight: 1.6 }}>{step.instruction}</Typography>
                              <Typography sx={{ fontSize: 12, color: t.txtFaint }}>
                                <Box component="strong" sx={{ color: t.accent }}>Success: </Box>{step.success_criteria}
                              </Typography>
                            </Box>
                          )}
                        </Surface>
                      );
                    })}
                  </Stack>
                </Box>
              )}

              {/* Verification Requirements */}
              <Box component="section" sx={{ mb: 3 }}>
                <SectionHeader title="Verification Requirements" />
                <Surface variant="inset" padding="16px">
                  <Stack spacing={1.25}>
                    {['Written response or explanation', 'Photo or video proof', 'GPS location check-in (if local)', 'Source citations or references'].map((req, i) => (
                      <Stack key={i} direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
                        <Box sx={{ width: 20, height: 20, borderRadius: '6px', border: `1.5px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Typography sx={{ fontSize: 10, color: t.txtFaint }}>{i + 1}</Typography>
                        </Box>
                        <Typography sx={{ fontSize: 13, color: t.txtDim }}>{req}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Surface>
              </Box>

              {/* Reputation Impact */}
              <Box component="section" sx={{ mb: 3 }}>
                <SectionHeader title="Reputation Impact" />
                <Stack direction="row" spacing={1.25}>
                  <Surface variant="inset" padding="14px 16px" style={{ flex: 1 }}>
                    <Typography sx={{ mb: 0.5, fontSize: 11, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>XP Reward</Typography>
                    <Typography sx={{ fontSize: 20, fontWeight: 800, color: t.ai }}>+{xp}</Typography>
                  </Surface>
                  <Surface variant="inset" padding="14px 16px" style={{ flex: 1 }}>
                    <Typography sx={{ mb: 0.5, fontSize: 11, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Trust Score</Typography>
                    <Typography sx={{ fontSize: 20, fontWeight: 800, color: t.accent }}>+{hunt.difficulty === 'hard' ? '15' : hunt.difficulty === 'medium' ? '8' : '3'}</Typography>
                  </Surface>
                </Stack>
              </Box>

              {/* Org info */}
              {(hunt.tenantName || hunt.organizationAbout) && (
                <Box component="section" sx={{ mb: 3 }}>
                  <SectionHeader title="About the Organization" />
                  <Surface variant="inset" padding="16px">
                    <Stack direction="row" spacing={1.25} sx={{ mb: 1.25, alignItems: 'center' }}>
                      <Box sx={{ width: 36, height: 36, borderRadius: '10px', background: `${category.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{category.emoji}</Box>
                      <Box>
                        <Typography sx={{ fontSize: 14, fontWeight: 700, color: t.txt }}>{hunt.tenantName ?? 'Organization'}</Typography>
                        {hunt.organizationType && <Typography sx={{ fontSize: 11, color: t.txtFaint, textTransform: 'capitalize' }}>{hunt.organizationType.replace('-', ' ')}</Typography>}
                      </Box>
                    </Stack>
                    {hunt.organizationAbout && <Typography sx={{ fontSize: 13, color: t.txtDim, lineHeight: 1.6 }}>{hunt.organizationAbout}</Typography>}
                  </Surface>
                </Box>
              )}

              {/* Similar missions */}
              {similar.length > 0 && (
                <Box component="section" sx={{ mb: 3 }}>
                  <SectionHeader title="Similar Missions" />
                  <Stack spacing={1.5}>
                    {similar.map(h => <MissionCard key={h.id} hunt={h} compact />)}
                  </Stack>
                </Box>
              )}
            </Box>

            {/* Right: sticky sidebar (desktop only) */}
            <Box className="hidden lg:block" sx={{ width: 300, flexShrink: 0 }}>
              <Box sx={{ position: 'sticky', top: 80 }}>
                <Surface variant="card" style={{ marginBottom: 12 }}>
                  <Box sx={{ padding: '16px 16px 12px' }}>
                    <RewardPills />
                    <MetaBadges />
                    <CtaButtons compact />
                  </Box>
                </Surface>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Mobile sticky bottom CTA */}
      <Box className="lg:hidden" sx={{
        position: 'fixed', bottom: 'calc(72px + max(env(safe-area-inset-bottom, 0px), 8px))', left: 0, right: 0,
        padding: '12px 20px', background: `${t.bg}F5`, backdropFilter: 'blur(16px)',
        borderTop: `1px solid ${t.border}`, zIndex: 40,
      }}>
        <CtaButtons />
      </Box>

      <CopilotFab context={{ huntTitle: hunt.title, huntStory: hunt.story_context }} />
      <BottomNav />
    </Box>
  );
}
