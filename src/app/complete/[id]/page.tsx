'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  CheckCircle2, Clock, Zap, DollarSign, Share2, Home,
  ChevronRight, AlertCircle, XCircle, RotateCcw, ArrowRight,
  Sparkles, Shield, Eye, User2,
} from 'lucide-react';
import { t } from '@/theme/colors';
import { loadState, getVerificationStatus } from '@/lib/store';
import { estimateCashReward, estimateXP } from '@/lib/missionCategories';
import StatusPill from '@/components/consumer/StatusPill';
import MissionCard from '@/components/consumer/MissionCard';
import Surface from '@/components/consumer/Surface';
import type { Hunt, VerificationRecord, VerificationStatus } from '@/lib/types';

// ── Verification pipeline ─────────────────────────────────────────────────

interface PipelineStage {
  key: VerificationStatus | 'terminal';
  label: string;
  description: string;
  icon: React.ReactNode;
  eta: string;
}

const PIPELINE: PipelineStage[] = [
  {
    key: 'submitted',
    label: 'Submitted',
    description: 'Your proof of work has been received and queued.',
    icon: <CheckCircle2 size={18} />,
    eta: 'Instant',
  },
  {
    key: 'ai_reviewing',
    label: 'AI Review',
    description: 'Our AI agent is checking your submission against requirements.',
    icon: <Sparkles size={18} />,
    eta: '5–15 min',
  },
  {
    key: 'manual_review',
    label: 'Human Review',
    description: 'A mission reviewer is evaluating your work.',
    icon: <Eye size={18} />,
    eta: '24–48 hrs',
  },
  {
    key: 'terminal',
    label: 'Decision',
    description: 'Your verification result is available.',
    icon: <Shield size={18} />,
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
  const isTerminal = TERMINAL_STATUSES.includes(status);
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
    <div className="breathe" style={{ color: t.ai }}>
      <Sparkles size={48} />
    </div>
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
    ? 'Your submission didn\'t meet requirements. See feedback below.'
    : isNeedsInfo
    ? 'The reviewer needs additional information from you.'
    : 'Your submission is being reviewed. We\'ll notify you when done.';

  return (
    <div
      style={{
        background: heroGlow,
        padding: '40px 24px 32px',
        textAlign: 'center',
        borderBottom: `1px solid ${t.border}`,
      }}
    >
      {/* Status icon */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
        {heroIcon}
      </div>

      {/* Status pill */}
      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
        <StatusPill status={status} size="md" />
      </div>

      {/* Title */}
      <h1
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: t.txt,
          margin: '0 0 8px',
          lineHeight: 1.2,
        }}
      >
        {heroTitle}
      </h1>
      <p style={{ fontSize: 13, color: t.txtDim, margin: '0 0 24px', lineHeight: 1.5 }}>
        {heroSubtitle}
      </p>

      {/* Mission name */}
      <p
        style={{
          fontSize: 12,
          color: heroColor,
          fontWeight: 600,
          margin: '0 0 20px',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}
      >
        {hunt.tenantName ?? 'Mission'} · {hunt.title}
      </p>

      {/* Reward pills — only show if not rejected */}
      {!isRejected && (
        <div
          style={{
            display: 'flex',
            gap: 10,
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          {cash > 0 && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 100,
                background: isApproved ? `${t.accent}18` : `${t.txtFaint}18`,
                border: `1px solid ${isApproved ? `${t.accent}30` : t.border}`,
                color: isApproved ? t.accent : t.txtDim,
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              <DollarSign size={14} />
              {isApproved ? `$${cash} USD` : `$${cash} Pending`}
            </div>
          )}
          {xp > 0 && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 100,
                background: isApproved ? `${t.ai}18` : `${t.txtFaint}18`,
                border: `1px solid ${isApproved ? `${t.ai}30` : t.border}`,
                color: isApproved ? t.aiLight : t.txtDim,
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              <Zap size={14} />
              {isApproved ? `+${xp} XP` : `${xp} XP Pending`}
            </div>
          )}
        </div>
      )}
    </div>
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
      <div style={{ padding: '20px 20px 8px' }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: t.txt, margin: '0 0 20px' }}>
          Verification Timeline
        </h2>

        <div style={{ position: 'relative' }}>
          {/* Vertical track */}
          <div
            style={{
              position: 'absolute',
              left: 17,
              top: 20,
              bottom: 20,
              width: 2,
              background: t.border,
            }}
          />

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

            const bgColor = isCompleted
              ? `${t.accent}20`
              : isCurrent
              ? isTerminalStage
                ? `${terminalColor}20`
                : `${t.ai}20`
              : `${t.txtFaint}10`;

            return (
              <div
                key={stage.key}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 14,
                  marginBottom: i < PIPELINE.length - 1 ? 24 : 8,
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                {/* Node */}
                <div
                  className={isCurrent && !isTerminalStage ? 'breathe' : undefined}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: bgColor,
                    border: `2px solid ${stageColor}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: stageColor,
                    flexShrink: 0,
                  }}
                >
                  {isCompleted ? <CheckCircle2 size={16} /> : stage.icon}
                </div>

                {/* Content */}
                <div style={{ flex: 1, paddingTop: 4 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 3,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
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
                    </span>
                    {isCurrent && (
                      <StatusPill
                        status={
                          isTerminalStage
                            ? (status as VerificationStatus)
                            : status
                        }
                        size="sm"
                      />
                    )}
                  </div>
                  <p
                    style={{
                      fontSize: 12,
                      color: isPending ? t.txtFaint : t.txtDim,
                      margin: 0,
                      lineHeight: 1.5,
                    }}
                  >
                    {isTerminalStage && isTerminal
                      ? status === 'approved'
                        ? 'Congratulations! Your submission was accepted.'
                        : status === 'rejected'
                        ? 'Your submission did not meet the requirements.'
                        : 'A reviewer needs additional information.'
                      : stage.description}
                  </p>
                  {!isPending && stage.eta && !isTerminalStage && (
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        marginTop: 5,
                        padding: '2px 8px',
                        borderRadius: 6,
                        background: `${stageColor}10`,
                        color: stageColor,
                        fontSize: 11,
                        fontWeight: 500,
                      }}
                    >
                      <Clock size={10} />
                      {stage.eta}
                    </div>
                  )}
                  {i === 0 && record.submittedAt && (
                    <p style={{ fontSize: 11, color: t.txtFaint, margin: '4px 0 0' }}>
                      {new Date(record.submittedAt).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  )}
                  {i === 3 && record.reviewedAt && (
                    <p style={{ fontSize: 11, color: t.txtFaint, margin: '4px 0 0' }}>
                      {new Date(record.reviewedAt).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
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
  const Icon = isRejected ? XCircle : AlertCircle;

  return (
    <Surface
      variant="card"
      style={{
        margin: '0 16px 16px',
        border: `1px solid ${color}30`,
        background: `${color}08`,
      }}
    >
      <div style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Icon size={16} color={color} />
          <span style={{ fontSize: 14, fontWeight: 700, color }}>
            {isRejected ? 'Rejection Reason' : 'Reviewer Note'}
          </span>
        </div>
        <p style={{ fontSize: 13, color: t.txtDim, margin: 0, lineHeight: 1.6 }}>
          {feedback}
        </p>
        {isNeedsInfo && (
          <button
            onClick={() => {}}
            style={{
              marginTop: 14,
              padding: '10px 18px',
              borderRadius: 10,
              background: `${t.warning}20`,
              border: `1px solid ${t.warning}40`,
              color: t.warning,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            Provide More Info <ArrowRight size={14} />
          </button>
        )}
        {isRejected && (
          <button
            onClick={() => {}}
            style={{
              marginTop: 14,
              padding: '10px 18px',
              borderRadius: 10,
              background: `${t.ai}20`,
              border: `1px solid ${t.ai}40`,
              color: t.aiLight,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <RotateCcw size={14} />
            Resubmit
          </button>
        )}
      </div>
    </Surface>
  );
}

// ── Estimated timing ──────────────────────────────────────────────────────

function EstimatedTiming({ status }: { status: VerificationStatus }) {
  if (TERMINAL_STATUSES.includes(status)) return null;

  const currentStage = PIPELINE.find((s) => s.key === status);
  if (!currentStage) return null;

  return (
    <Surface variant="inset" style={{ margin: '0 16px 16px' }}>
      <div
        style={{
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: `${t.info}18`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: t.info,
            flexShrink: 0,
          }}
        >
          <Clock size={18} />
        </div>
        <div>
          <p style={{ fontSize: 12, color: t.txtFaint, margin: '0 0 2px' }}>
            Expected decision time
          </p>
          <p style={{ fontSize: 14, fontWeight: 700, color: t.txt, margin: 0 }}>
            {currentStage.eta}
          </p>
        </div>
      </div>
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
    <div style={{ margin: '0 0 24px' }}>
      <div
        style={{
          padding: '0 16px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <h2 style={{ fontSize: 15, fontWeight: 700, color: t.txt, margin: 0 }}>
          More Opportunities
        </h2>
        <a
          href="/explore"
          style={{
            fontSize: 12,
            color: t.accent,
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 3,
          }}
        >
          See all <ChevronRight size={14} />
        </a>
      </div>
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {picks.map((h) => (
          <MissionCard key={h.id} hunt={h} compact />
        ))}
      </div>
    </div>
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
      <div className="consumer-app">
        <div className="consumer-app-inner">
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '60vh',
              gap: 12,
              color: t.txtDim,
            }}
          >
            <Sparkles size={32} color={t.txtFaint} />
            <p style={{ fontSize: 14, margin: 0 }}>Mission not found</p>
            <button
              onClick={() => router.push('/missions')}
              style={{
                padding: '10px 20px',
                borderRadius: 10,
                background: `${t.accent}18`,
                border: `1px solid ${t.accent}30`,
                color: t.accent,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              My Missions
            </button>
          </div>
        </div>
      </div>
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
    <div className="consumer-app">
      <div className="consumer-app-inner" style={{ paddingBottom: 100 }}>
        {/* Hero */}
        <HeroSection status={status} hunt={hunt} />

        <div style={{ height: 20 }} />

        {/* Estimated timing (only while pending) */}
        <EstimatedTiming status={status} />

        {/* Verification timeline */}
        <VerificationTimeline status={status} record={record ?? { huntId, status, submittedAt: new Date().toISOString() }} />

        {/* Reviewer feedback */}
        <ReviewerFeedback status={status} feedback={record?.feedback} />

        {/* What happens next — show while in pipeline */}
        {!isTerminal && (
          <Surface variant="inset" style={{ margin: '0 16px 16px' }}>
            <div style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <User2 size={16} color={t.ai} />
                <span style={{ fontSize: 13, fontWeight: 600, color: t.txt }}>What happens next?</span>
              </div>
              <ul style={{ margin: 0, padding: '0 0 0 16px', color: t.txtDim, fontSize: 12, lineHeight: 1.8 }}>
                <li>You'll receive an in-app notification when your status changes.</li>
                <li>If approved, your reward will be credited automatically.</li>
                <li>If more info is needed, check back here for reviewer notes.</li>
              </ul>
            </div>
          </Surface>
        )}

        {/* Recommended missions */}
        <RecommendedMissions currentId={huntId} hunts={allHunts} />

        {/* Actions */}
        <div
          style={{
            padding: '0 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <button
            onClick={handleShare}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: 14,
              background: `${t.accent}14`,
              border: `1px solid ${t.accent}30`,
              color: t.accent,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Share2 size={16} />
            {copied ? 'Copied!' : 'Share Submission'}
          </button>

          <button
            onClick={() => router.push('/home')}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: 14,
              background: t.surface,
              border: `1px solid ${t.border}`,
              color: t.txtDim,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Home size={16} />
            Return Home
          </button>

          <button
            onClick={() => router.push('/explore')}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: 14,
              background: `${t.ai}14`,
              border: `1px solid ${t.ai}30`,
              color: t.aiLight,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            Explore Opportunities
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
