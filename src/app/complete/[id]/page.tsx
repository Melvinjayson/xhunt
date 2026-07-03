'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  CheckCircle2, Clock, Zap, DollarSign, Share2, Home,
  ChevronRight, AlertCircle, XCircle, RotateCcw, ArrowRight,
  Sparkles, Shield, Eye, User2,
} from 'lucide-react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import StepContent from '@mui/material/StepContent';
import { t } from '@/theme/colors';
import { loadState, getVerificationStatus } from '@/lib/store';
import { estimateCashReward, estimateXP } from '@/lib/missionCategories';
import StatusPill from '@/components/consumer/StatusPill';
import MissionCard from '@/components/consumer/MissionCard';
import Surface from '@/components/consumer/Surface';
import type { Hunt, VerificationRecord, VerificationStatus } from '@/lib/types';
import BottomNav from '@/components/BottomNav';

// ── Verification pipeline ─────────────────────────────────────────────────

interface PipelineStage {
  id: string;
  key: VerificationStatus | 'terminal';
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  color: string;
  eta: string;
}

const PIPELINE: PipelineStage[] = [
  {
    id: 'submitted',
    key: 'submitted',
    label: 'Submitted',
    description: 'Your proof of work has been received and queued.',
    icon: CheckCircle2,
    color: t.accent,
    eta: 'Instant',
  },
  {
    id: 'ai_reviewing',
    key: 'ai_reviewing',
    label: 'AI Review',
    description: 'Our AI agent is checking your submission against requirements.',
    icon: Sparkles,
    color: t.ai,
    eta: '5–15 min',
  },
  {
    id: 'manual_review',
    key: 'manual_review',
    label: 'Human Review',
    description: 'A mission reviewer is evaluating your work.',
    icon: Eye,
    color: t.info,
    eta: '24–48 hrs',
  },
  {
    id: 'terminal',
    key: 'terminal',
    label: 'Decision',
    description: 'Your verification result is available.',
    icon: Shield,
    color: t.accent,
    eta: '',
  },
];

const TERMINAL_STATUSES: VerificationStatus[] = ['approved', 'rejected', 'needs_info'];

function getPipelineIndex(status: VerificationStatus): number {
  if (status === 'submitted') return 0;
  if (status === 'ai_reviewing') return 1;
  if (status === 'manual_review') return 2;
  if (TERMINAL_STATUSES.includes(status)) return 3;
  return 0;
}

// ── Hero ──────────────────────────────────────────────────────────────────

function HeroSection({
  status,
  hunt,
}: {
  status: VerificationStatus;
  hunt: Hunt;
}) {
  const cash = estimateCashReward(hunt.cashReward, hunt.difficulty, hunt.missionType);
  const xp = estimateXP(hunt.xpReward, hunt.difficulty, hunt.steps?.length ?? 3);
  const isApproved = status === 'approved';
  const isRejected = status === 'rejected';
  const isNeedsInfo = status === 'needs_info';

  const heroColor = isApproved ? t.accent : isRejected ? t.error : isNeedsInfo ? t.warning : t.ai;
  const heroGlow = isApproved
    ? `radial-gradient(ellipse 60% 40% at 50% 0%, ${t.accent}22 0%, transparent 70%)`
    : isRejected
    ? `radial-gradient(ellipse 60% 40% at 50% 0%, ${t.error}22 0%, transparent 70%)`
    : `radial-gradient(ellipse 60% 40% at 50% 0%, ${t.ai}22 0%, transparent 70%)`;

  const heroIcon = isApproved ? (
    <CheckCircle2 size={48} color={t.accent} />
  ) : isRejected ? (
    <XCircle size={48} color={t.error} />
  ) : isNeedsInfo ? (
    <AlertCircle size={48} color={t.warning} />
  ) : (
    <Box className="breathe" sx={{ color: t.ai }}>
      <Sparkles size={48} />
    </Box>
  );

  const heroTitle = isApproved
    ? 'Mission Approved!'
    : isRejected
    ? 'Submission Rejected'
    : isNeedsInfo
    ? 'More Info Needed'
    : 'Verification In Progress';

  const heroSubtitle = isApproved
    ? 'Your proof was accepted. Reward is being processed.'
    : isRejected
    ? "Your submission didn't meet requirements. See feedback below."
    : isNeedsInfo
    ? 'The reviewer needs additional information from you.'
    : "Your submission is being reviewed. We'll notify you when done.";

  return (
    <Box
      sx={{
        background: heroGlow,
        padding: '40px 24px 32px',
        textAlign: 'center',
        borderBottom: `1px solid ${t.border}`,
      }}
    >
      {/* Status icon */}
      <Stack sx={{ mb: 2, alignItems: 'center' }}>
        {heroIcon}
      </Stack>

      {/* Status pill */}
      <Stack sx={{ mb: 1.5, alignItems: 'center' }}>
        <StatusPill status={status} size="md" />
      </Stack>

      {/* Title */}
      <Typography variant="h5" sx={{ fontSize: 22, fontWeight: 700, color: t.txt, mb: 1, lineHeight: 1.2 }}>
        {heroTitle}
      </Typography>
      <Typography sx={{ fontSize: 13, color: t.txtDim, mb: 3, lineHeight: 1.5 }}>
        {heroSubtitle}
      </Typography>

      {/* Mission name */}
      <Typography
        sx={{
          fontSize: 12,
          color: heroColor,
          fontWeight: 600,
          mb: 2.5,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}
      >
        {hunt.tenantName ?? 'Mission'} · {hunt.title}
      </Typography>

      {/* Reward pills — only show if not rejected */}
      {!isRejected && (
        <Stack direction="row" spacing={1.25} sx={{ justifyContent: 'center', flexWrap: 'wrap' }}>
          {cash > 0 && (
            <Chip
              icon={<DollarSign size={14} />}
              label={isApproved ? `$${cash} USD` : `$${cash} Pending`}
              sx={{
                background: isApproved ? `${t.accent}18` : `${t.txtFaint}18`,
                border: `1px solid ${isApproved ? `${t.accent}30` : t.border}`,
                color: isApproved ? t.accent : t.txtDim,
                fontWeight: 700,
                fontSize: 13,
                borderRadius: '100px',
              }}
            />
          )}
          {xp > 0 && (
            <Chip
              icon={<Zap size={14} />}
              label={isApproved ? `+${xp} XP` : `${xp} XP Pending`}
              sx={{
                background: isApproved ? `${t.ai}18` : `${t.txtFaint}18`,
                border: `1px solid ${isApproved ? `${t.ai}30` : t.border}`,
                color: isApproved ? t.aiLight : t.txtDim,
                fontWeight: 700,
                fontSize: 13,
                borderRadius: '100px',
              }}
            />
          )}
        </Stack>
      )}
    </Box>
  );
}

// ── Verification timeline ─────────────────────────────────────────────────

function VerificationTimeline({
  status,
  record,
}: {
  status: VerificationStatus;
  record: VerificationRecord;
}) {
  const activeIndex = getPipelineIndex(status);
  const isTerminal = TERMINAL_STATUSES.includes(status);

  const terminalColor =
    status === 'approved' ? t.accent : status === 'rejected' ? t.error : t.warning;

  return (
    <Surface variant="card" style={{ margin: '0 16px 16px' }}>
      <Box sx={{ padding: '20px 20px 8px' }}>
        <Typography variant="h6" sx={{ fontSize: 15, fontWeight: 700, color: t.txt, mb: 2.5 }}>
          Verification Timeline
        </Typography>

        <Stepper
          orientation="vertical"
          activeStep={activeIndex}
          sx={{
            '& .MuiStepLabel-label': { color: 'text.primary' },
            '& .MuiStepConnector-line': { borderColor: 'divider' },
            '& .MuiStepContent-root': { borderColor: 'divider' },
          }}
        >
          {PIPELINE.map((stage, i) => {
            const isCompleted = i < activeIndex;
            const isCurrent = i === activeIndex;
            const isPending = i > activeIndex;
            const isTerminalStage = i === 3;

            const stageColor = isCompleted
              ? t.accent
              : isCurrent
              ? isTerminalStage
                ? terminalColor
                : t.ai
              : t.txtFaint;

            return (
              <Step key={stage.id} completed={isCompleted}>
                <StepLabel
                  slots={{ stepIcon: () => (
                    <Box
                      className={isCurrent && !isTerminalStage ? 'breathe' : undefined}
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        bgcolor: isCompleted
                          ? `${t.accent}20`
                          : isCurrent
                          ? isTerminalStage
                            ? `${terminalColor}20`
                            : `${t.ai}20`
                          : `${t.txtFaint}10`,
                        border: `2px solid ${stageColor}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: stageColor,
                        flexShrink: 0,
                      }}
                    >
                      {isCompleted
                        ? React.createElement(CheckCircle2, { size: 16 })
                        : React.createElement(stage.icon, { size: 16, color: stageColor })}
                    </Box>
                  ) }}
                >
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        color: isPending ? t.txtFaint : t.txt,
                      }}
                    >
                      {isTerminalStage && isTerminal
                        ? status === 'approved'
                          ? 'Approved'
                          : status === 'rejected'
                          ? 'Rejected'
                          : 'Needs More Info'
                        : stage.label}
                    </Typography>
                    {isCurrent && (
                      <StatusPill
                        status={isTerminalStage ? (status as VerificationStatus) : status}
                        size="sm"
                      />
                    )}
                  </Stack>
                </StepLabel>
                <StepContent>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.5 }}>
                    {isTerminalStage && isTerminal
                      ? status === 'approved'
                        ? 'Congratulations! Your submission was accepted.'
                        : status === 'rejected'
                        ? 'Your submission did not meet the requirements.'
                        : 'A reviewer needs additional information.'
                      : stage.description}
                  </Typography>
                  {!isPending && stage.eta && !isTerminalStage && (
                    <Typography variant="caption" sx={{ color: stageColor, display: 'block', mt: 0.5 }}>
                      ⏱ {stage.eta}
                    </Typography>
                  )}
                  {i === 0 && record.submittedAt && (
                    <Typography variant="caption" sx={{ color: t.txtFaint, display: 'block', mt: 0.5 }}>
                      {new Date(record.submittedAt).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Typography>
                  )}
                  {i === 3 && record.reviewedAt && (
                    <Typography variant="caption" sx={{ color: t.txtFaint, display: 'block', mt: 0.5 }}>
                      {new Date(record.reviewedAt).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Typography>
                  )}
                </StepContent>
              </Step>
            );
          })}
        </Stepper>
      </Box>
    </Surface>
  );
}

// ── Reviewer feedback ─────────────────────────────────────────────────────

function ReviewerFeedback({
  status,
  feedback,
}: {
  status: VerificationStatus;
  feedback?: string;
}) {
  if (!feedback) return null;
  const isRejected = status === 'rejected';
  const isNeedsInfo = status === 'needs_info';
  if (!isRejected && !isNeedsInfo && !feedback) return null;

  const color = isRejected ? t.error : t.warning;

  return (
    <Box sx={{ margin: '0 16px 16px' }}>
      <Alert
        severity={isRejected ? 'error' : 'warning'}
        sx={{
          borderRadius: 2,
          bgcolor: `${color}08`,
          color,
          border: `1px solid ${color}30`,
          '& .MuiAlert-icon': { color },
        }}
      >
        <Typography sx={{ fontSize: 14, fontWeight: 700, color, mb: 1 }}>
          {isRejected ? 'Rejection Reason' : 'Reviewer Note'}
        </Typography>
        <Typography sx={{ fontSize: 13, color: t.txtDim, lineHeight: 1.6 }}>
          {feedback}
        </Typography>
        {isNeedsInfo && (
          <Button
            onClick={() => {}}
            endIcon={<ArrowRight size={14} />}
            sx={{
              mt: 1.75,
              background: `${t.warning}20`,
              border: `1px solid ${t.warning}40`,
              color: t.warning,
              fontSize: 13,
              fontWeight: 600,
              borderRadius: '10px',
              textTransform: 'none',
            }}
          >
            Provide More Info
          </Button>
        )}
        {isRejected && (
          <Button
            onClick={() => {}}
            startIcon={<RotateCcw size={14} />}
            sx={{
              mt: 1.75,
              background: `${t.ai}20`,
              border: `1px solid ${t.ai}40`,
              color: t.aiLight,
              fontSize: 13,
              fontWeight: 600,
              borderRadius: '10px',
              textTransform: 'none',
            }}
          >
            Resubmit
          </Button>
        )}
      </Alert>
    </Box>
  );
}

// ── Estimated timing ──────────────────────────────────────────────────────

function EstimatedTiming({ status }: { status: VerificationStatus }) {
  if (TERMINAL_STATUSES.includes(status)) return null;

  const currentStage = PIPELINE.find((s) => s.key === status);
  if (!currentStage) return null;

  return (
    <Surface variant="inset" style={{ margin: '0 16px 16px' }}>
      <Stack direction="row" spacing={1.5} sx={{ padding: '14px 16px', alignItems: 'center' }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '10px',
            background: `${t.info}18`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: t.info,
            flexShrink: 0,
          }}
        >
          <Clock size={18} />
        </Box>
        <Box>
          <Typography sx={{ fontSize: 12, color: t.txtFaint, mb: 0.25 }}>
            Expected decision time
          </Typography>
          <Typography sx={{ fontSize: 14, fontWeight: 700, color: t.txt }}>
            {currentStage.eta}
          </Typography>
        </Box>
      </Stack>
    </Surface>
  );
}

// ── Recommended missions ──────────────────────────────────────────────────

function RecommendedMissions({
  currentId,
  hunts,
}: {
  currentId: string;
  hunts: Hunt[];
}) {
  const picks = hunts.filter((h) => h.id !== currentId).slice(0, 3);
  if (picks.length === 0) return null;

  return (
    <Box sx={{ margin: '0 0 24px' }}>
      <Stack
        direction="row"
        sx={{ padding: '0 16px 12px', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <Typography variant="h6" sx={{ fontSize: 15, fontWeight: 700, color: t.txt }}>
          More Opportunities
        </Typography>
        <Button
          href="/explore"
          endIcon={<ChevronRight size={14} />}
          sx={{ fontSize: 12, color: t.accent, p: 0, minWidth: 0, textTransform: 'none' }}
        >
          See all
        </Button>
      </Stack>
      <Stack spacing={1.5} sx={{ padding: '0 16px' }}>
        {picks.map((h) => (
          <MissionCard key={h.id} hunt={h} compact />
        ))}
      </Stack>
    </Box>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function CompletePage() {
  const params = useParams();
  const router = useRouter();
  const huntId = params.id as string;

  const [hunt, setHunt] = useState<Hunt | null>(null);
  const [record, setRecord] = useState<VerificationRecord | null>(null);
  const [allHunts, setAllHunts] = useState<Hunt[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const state = loadState();
    const found = state.hunts.find((h) => h.id === huntId) ?? null;
    setHunt(found);
    setAllHunts(state.hunts);
    const rec = getVerificationStatus(huntId);
    setRecord(rec);
  }, [huntId]);

  if (!hunt) {
    return (
      <Box className="consumer-app">
        <Box className="consumer-app-inner">
          <Stack
            spacing={1.5}
            sx={{ minHeight: '60vh', color: t.txtDim, alignItems: 'center', justifyContent: 'center' }}
          >
            <Sparkles size={32} color={t.txtFaint} />
            <Typography sx={{ fontSize: 14 }}>Mission not found</Typography>
            <Button
              variant="outlined"
              onClick={() => router.push('/missions')}
              sx={{
                borderRadius: '10px',
                background: `${t.accent}18`,
                border: `1px solid ${t.accent}30`,
                color: t.accent,
                fontSize: 13,
                fontWeight: 600,
                textTransform: 'none',
              }}
            >
              My Missions
            </Button>
          </Stack>
        </Box>
      </Box>
    );
  }

  const status: VerificationStatus = record?.status ?? 'submitted';
  const isTerminal = TERMINAL_STATUSES.includes(status);

  async function handleShare() {
    const text = `I just submitted my proof for "${hunt!.title}" on X-Hunt!`;
    if (navigator.share) {
      await navigator.share({ title: 'X-Hunt Submission', text }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <Box className="consumer-app">
      <BottomNav />
      <Box className="consumer-app-inner" sx={{ paddingBottom: '100px' }}>
        {/* Hero */}
        <HeroSection status={status} hunt={hunt} />

        <Box sx={{ height: 20 }} />

        {/* Estimated timing (only while pending) */}
        <EstimatedTiming status={status} />

        {/* Verification timeline */}
        <VerificationTimeline status={status} record={record ?? { huntId, status, submittedAt: new Date().toISOString() }} />

        {/* Reviewer feedback */}
        <ReviewerFeedback status={status} feedback={record?.feedback} />

        {/* What happens next — show while in pipeline */}
        {!isTerminal && (
          <Surface variant="inset" style={{ margin: '0 16px 16px' }}>
            <Box sx={{ padding: '16px 18px' }}>
              <Stack direction="row" spacing={1} sx={{ mb: 1.25, alignItems: 'center' }}>
                <User2 size={16} color={t.ai} />
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: t.txt }}>What happens next?</Typography>
              </Stack>
              <Box component="ul" sx={{ margin: 0, padding: '0 0 0 16px', color: t.txtDim, fontSize: 12, lineHeight: 1.8 }}>
                <li>You'll receive an in-app notification when your status changes.</li>
                <li>If approved, your reward will be credited automatically.</li>
                <li>If more info is needed, check back here for reviewer notes.</li>
              </Box>
            </Box>
          </Surface>
        )}

        {/* Recommended missions */}
        <RecommendedMissions currentId={huntId} hunts={allHunts} />

        {/* Actions */}
        <Stack spacing={1.25} sx={{ padding: '0 16px' }}>
          <Button
            variant="outlined"
            fullWidth
            onClick={handleShare}
            startIcon={<Share2 size={16} />}
            sx={{
              padding: '14px',
              borderRadius: '14px',
              background: `${t.accent}14`,
              border: `1px solid ${t.accent}30`,
              color: t.accent,
              fontSize: 14,
              fontWeight: 600,
              textTransform: 'none',
            }}
          >
            {copied ? 'Copied!' : 'Share Submission'}
          </Button>

          <Button
            fullWidth
            onClick={() => router.push('/home')}
            startIcon={<Home size={16} />}
            sx={{
              padding: '14px',
              borderRadius: '14px',
              background: t.surface,
              border: `1px solid ${t.border}`,
              color: t.txtDim,
              fontSize: 14,
              fontWeight: 600,
              textTransform: 'none',
            }}
          >
            Return Home
          </Button>

          <Button
            fullWidth
            onClick={() => router.push('/explore')}
            endIcon={<ArrowRight size={16} />}
            sx={{
              padding: '14px',
              borderRadius: '14px',
              background: `${t.ai}14`,
              border: `1px solid ${t.ai}30`,
              color: t.aiLight,
              fontSize: 14,
              fontWeight: 600,
              textTransform: 'none',
            }}
          >
            Explore Opportunities
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}
