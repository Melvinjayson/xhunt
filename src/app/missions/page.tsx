'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target, Clock, CheckCircle2, ChevronRight, Bookmark, BookmarkX,
  Play, Eye, Gift, Share2, Award, Zap, ShieldCheck, Users,
  MailCheck, Bot, Search, Compass, Trophy, Star, DollarSign,
  ArrowRight, AlertCircle,
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { loadState, saveState } from '@/lib/store';
import { fetchSupabaseMissions } from '@/lib/supabase/events';
import { createClient } from '@/lib/supabase/client';
import {
  DIFF_META, MISSION_TYPE_META, resolveCategory, estimateCashReward, estimateXP,
} from '@/lib/missionCategories';
import { t } from '@/theme/colors';
import type { Hunt, HuntProgress, CompletedHunt } from '@/lib/types';
import type { DbMissionProgress } from '@/lib/supabase/types';

// ─── local storage key for saved hunts ───────────────────────────────────────
const SAVED_KEY = 'xhunt_saved_v1';

function loadSaved(): string[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(SAVED_KEY) ?? '[]'); } catch { return []; }
}
function writeSaved(ids: string[]): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(SAVED_KEY, JSON.stringify(ids)); } catch {}
}

// ─── verification record shape (from mission_progress) ───────────────────────
type VerifStatus = 'submitted' | 'ai_reviewing' | 'manual_review' | 'approved' | 'rejected';
interface VerifRecord {
  missionId: string;
  status: VerifStatus;
  submittedAt?: string;
}

// ─── tabs ─────────────────────────────────────────────────────────────────────
const TABS = ['Active', 'Pending Review', 'Approved', 'Completed', 'Saved'] as const;
type Tab = typeof TABS[number];

// ─── Unsplash thumbnails ──────────────────────────────────────────────────────
const MISSION_IMAGES: Record<string, string> = {
  fitness:   'photo-1571019613454-1cb2f99b2d8b',
  adventure: 'photo-1476514525535-07fb3b4ae5f1',
  food:      'photo-1504674900247-0877df9cc836',
  tech:      'photo-1518770660439-4636190af475',
  learning:  'photo-1456513080510-7bf3a84b82f8',
  social:    'photo-1529156069898-49953e39b3ac',
  art:       'photo-1513364776144-60967b0f800f',
  travel:    'photo-1488085061387-422e29b40080',
  mindful:   'photo-1506126613408-eca07ce68773',
  civic:     'photo-1554224155-6726b3ff858f',
  nature:    'photo-1441974231531-c6227db76b6e',
  finance:   'photo-1611974789855-9c2a0a7236a3',
  default:   'photo-1519389950473-47ba0277781c',
};
function getMissionImage(tags: string[]): string {
  for (const tag of tags) {
    const id = MISSION_IMAGES[tag.toLowerCase()];
    if (id) return `https://images.unsplash.com/${id}?w=700&h=220&fit=crop&q=75&auto=format`;
  }
  return `https://images.unsplash.com/${MISSION_IMAGES.default}?w=700&h=220&fit=crop&q=75&auto=format`;
}

// ─── ProgressBar ─────────────────────────────────────────────────────────────
function ProgressBar({ value, max, color = t.accent }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div style={{ height: 4, borderRadius: 999, background: 'rgba(255,255,255,.07)', overflow: 'hidden' }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        style={{ height: '100%', borderRadius: 999, background: color, boxShadow: `0 0 6px ${color}60` }}
      />
    </div>
  );
}

// ─── StatusPill ───────────────────────────────────────────────────────────────
type PillVariant = 'active' | 'pending' | 'reviewing' | 'approved' | 'completed' | 'saved' | 'rejected';
const PILL_STYLES: Record<PillVariant, { label: string; color: string; Icon: React.ElementType }> = {
  active:    { label: 'Active',        color: t.accent,   Icon: Play          },
  pending:   { label: 'Submitted',     color: t.info,     Icon: MailCheck     },
  reviewing: { label: 'AI Review',     color: t.ai,       Icon: Bot           },
  approved:  { label: 'Approved',      color: t.success,  Icon: CheckCircle2  },
  completed: { label: 'Completed',     color: t.accent,   Icon: Trophy        },
  saved:     { label: 'Saved',         color: t.txtDim,   Icon: Bookmark      },
  rejected:  { label: 'Not Approved',  color: t.error,    Icon: AlertCircle   },
};

function StatusPill({ variant }: { variant: PillVariant }) {
  const { label, color, Icon } = PILL_STYLES[variant];
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 9.5, fontWeight: 700, color,
      background: `${color}12`, border: `1px solid ${color}28`,
      padding: '2px 8px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '.04em',
    }}>
      <Icon size={9} strokeWidth={2.5} />
      {label}
    </div>
  );
}

// ─── Verification Timeline ────────────────────────────────────────────────────
const VERIF_STAGES: { key: VerifStatus; label: string; Icon: React.ElementType }[] = [
  { key: 'submitted',    label: 'Submitted',    Icon: MailCheck },
  { key: 'ai_reviewing', label: 'AI Review',    Icon: Bot       },
  { key: 'manual_review',label: 'Human Review', Icon: Search    },
  { key: 'approved',     label: 'Approved',     Icon: CheckCircle2 },
];

function VerifTimeline({ status }: { status: VerifStatus }) {
  const stageKeys = VERIF_STAGES.map((s) => s.key);
  const currentIdx = stageKeys.indexOf(status);
  return (
    <div style={{ paddingTop: 12, borderTop: '1px solid rgba(255,255,255,.05)' }}>
      <p style={{ margin: '0 0 10px', fontSize: 10, fontWeight: 700, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '.07em' }}>
        Verification Progress
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        {VERIF_STAGES.map((stage, i) => {
          const done    = i < currentIdx;
          const current = i === currentIdx;
          const pending = i > currentIdx;
          const color   = done ? t.accent : current ? t.ai : t.txtFaint;
          const { Icon } = stage;
          return (
            <div key={stage.key} style={{ display: 'flex', alignItems: 'center', flex: i < VERIF_STAGES.length - 1 ? '1 1 auto' : undefined }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: done ? `${t.accent}18` : current ? `${t.ai}18` : 'rgba(255,255,255,.04)',
                  border: `1.5px solid ${color}${done ? '60' : current ? '80' : '28'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: current ? `0 0 10px ${t.ai}40` : 'none',
                }}>
                  <Icon size={11} strokeWidth={2.5} style={{ color }} />
                </div>
                <span style={{ fontSize: 8.5, fontWeight: current ? 800 : 600, color, whiteSpace: 'nowrap', textAlign: 'center', maxWidth: 52 }}>
                  {stage.label}
                </span>
              </div>
              {i < VERIF_STAGES.length - 1 && (
                <div style={{ flex: 1, height: 1.5, background: done ? `linear-gradient(90deg,${t.accent}60,${t.accent}20)` : 'rgba(255,255,255,.08)', margin: '0 2px', marginBottom: 18 }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────
function EmptyState({
  icon: Icon, title, subtitle, actionLabel, actionHref,
}: {
  icon: React.ElementType; title: string; subtitle: string;
  actionLabel?: string; actionHref?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 24px', textAlign: 'center' }}
    >
      <div style={{
        width: 56, height: 56, borderRadius: '50%',
        background: `${t.accent}0D`, border: `1px solid ${t.accent}20`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
      }}>
        <Icon size={24} strokeWidth={1.4} style={{ color: t.accent }} />
      </div>
      <p style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800, color: t.txt }}>{title}</p>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: t.txtDim, lineHeight: 1.5 }}>{subtitle}</p>
      {actionLabel && actionHref && (
        <Link href={actionHref} style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          padding: '11px 22px', borderRadius: 14,
          background: t.accent, color: t.bg,
          fontWeight: 800, fontSize: 13, textDecoration: 'none',
          boxShadow: `0 0 24px ${t.accent}35`,
        }}>
          <Compass size={13} strokeWidth={2.5} />
          {actionLabel}
        </Link>
      )}
    </motion.div>
  );
}

// ─── MissionCard row ─────────────────────────────────────────────────────────
interface MissionRowProps {
  hunt: Hunt;
  tab: Tab;
  progress?: HuntProgress;
  verif?: VerifRecord;
  saved?: boolean;
  onRemoveSaved?: (id: string) => void;
  index: number;
}

function MissionRow({ hunt, tab, progress, verif, saved, onRemoveSaved, index }: MissionRowProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const cat      = resolveCategory(hunt.tags, hunt.category);
  const diff     = DIFF_META[hunt.difficulty] ?? DIFF_META.easy;
  const mtype    = hunt.missionType ? MISSION_TYPE_META[hunt.missionType] : null;
  const cash     = estimateCashReward(hunt.cashReward, hunt.difficulty, hunt.missionType);
  const xp       = estimateXP(hunt.xpReward, hunt.difficulty, hunt.steps.length);
  const thumbImg = getMissionImage(hunt.tags);

  const stepsDone  = progress?.completedSteps.length ?? 0;
  const stepsTotal = hunt.steps.length;

  // pill variant
  const pillVariant: PillVariant =
    tab === 'Active'        ? 'active'
    : tab === 'Approved'    ? 'approved'
    : tab === 'Completed'   ? 'completed'
    : tab === 'Saved'       ? 'saved'
    : verif?.status === 'ai_reviewing'  ? 'reviewing'
    : verif?.status === 'manual_review' ? 'reviewing'
    : 'pending';

  // primary CTA
  let ctaHref  = `/hunt/${hunt.id}`;
  let ctaLabel = 'View Mission';
  let ctaIcon  = <Eye size={13} strokeWidth={2.5} />;
  let ctaBg: string    = `${t.ai}14`;
  let ctaColor: string = t.ai;
  let ctaBorder: string= `1px solid ${t.ai}28`;
  let ctaShadow: string= 'none';

  if (tab === 'Active') {
    ctaHref   = `/active/${hunt.id}`;
    ctaLabel  = 'Continue';
    ctaIcon   = <Play size={13} strokeWidth={2.5} />;
    ctaBg     = t.accent;
    ctaColor  = t.bg;
    ctaBorder = 'none';
    ctaShadow = `0 0 24px ${t.accent}35`;
  } else if (tab === 'Pending Review') {
    ctaHref   = `/complete/${hunt.id}`;
    ctaLabel  = 'View Status';
    ctaIcon   = <Eye size={13} strokeWidth={2.5} />;
    ctaBg     = `${t.ai}14`;
    ctaColor  = t.ai;
    ctaBorder = `1px solid ${t.ai}28`;
  } else if (tab === 'Approved') {
    ctaHref   = `/complete/${hunt.id}`;
    ctaLabel  = 'Claim Reward';
    ctaIcon   = <Gift size={13} strokeWidth={2.5} />;
    ctaBg     = `${t.accent}14`;
    ctaColor  = t.accent;
    ctaBorder = `1px solid ${t.accent}28`;
  } else if (tab === 'Completed') {
    ctaHref   = `/complete/${hunt.id}`;
    ctaLabel  = 'View Certificate';
    ctaIcon   = <Award size={13} strokeWidth={2.5} />;
    ctaBg     = `${t.accent}08`;
    ctaColor  = t.accent;
    ctaBorder = `1px solid ${t.accent}18`;
  } else if (tab === 'Saved') {
    ctaHref   = `/hunt/${hunt.id}`;
    ctaLabel  = 'View Mission';
    ctaIcon   = <ArrowRight size={13} strokeWidth={2.5} />;
    ctaBg     = `${t.accent}14`;
    ctaColor  = t.accent;
    ctaBorder = `1px solid ${t.accent}28`;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.28 }}
      className="liquid-glass"
      style={{
        borderRadius: 22, overflow: 'hidden', position: 'relative',
        background: t.card,
        border: `1px solid ${cat.color}1A`,
        boxShadow: `0 0 40px ${cat.color}06`,
      }}
    >
      {/* thumbnail */}
      <div style={{ position: 'relative', height: 108, overflow: 'hidden', background: t.bg }}>
        {!imgFailed && (
          <Image
            src={thumbImg} alt="" fill unoptimized
            style={{ objectFit: 'cover', objectPosition: 'center', opacity: 0.72 }}
            onError={() => setImgFailed(true)}
          />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,transparent 0%,rgba(10,18,38,.92) 100%)' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1.5, background: `linear-gradient(90deg,${cat.color}60,${cat.color}00)` }} />
        {/* status badge overlay */}
        <div style={{ position: 'absolute', top: 10, left: 10 }}>
          <StatusPill variant={pillVariant} />
        </div>
        {/* match score or cert */}
        {hunt.certificationReward && (
          <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', alignItems: 'center', gap: 3, background: 'rgba(5,8,22,.75)', border: `1px solid ${t.warning}40`, borderRadius: 999, padding: '3px 9px', backdropFilter: 'blur(8px)' }}>
            <Award size={9} strokeWidth={2.5} style={{ color: t.warning }} />
            <span style={{ fontSize: 9.5, fontWeight: 700, color: t.warning }}>Certificate</span>
          </div>
        )}
      </div>

      <div style={{ padding: '14px 16px 0' }}>
        {/* badges row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10, flexWrap: 'wrap' }}>
          {mtype && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9.5, fontWeight: 700, color: mtype.color, background: `${mtype.color}10`, border: `1px solid ${mtype.color}20`, padding: '2px 8px', borderRadius: 999 }}>
              <span style={{ fontSize: 10 }}>{mtype.emoji}</span> {mtype.label}
            </div>
          )}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9.5, fontWeight: 700, color: cat.color, background: `${cat.color}10`, border: `1px solid ${cat.color}20`, padding: '2px 8px', borderRadius: 999 }}>
            <span style={{ fontSize: 10 }}>{cat.emoji}</span> {cat.label}
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 999, background: `${diff.color}10`, border: `1px solid ${diff.color}20` }}>
            <Zap size={9} strokeWidth={2.5} style={{ color: diff.color }} />
            <span style={{ fontSize: 9.5, fontWeight: 700, color: diff.color }}>{diff.label}</span>
          </div>
        </div>

        {/* title + org */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
          <div style={{ width: 42, height: 42, borderRadius: 13, flexShrink: 0, background: `${cat.color}12`, border: `1px solid ${cat.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
            {cat.emoji}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ margin: '0 0 3px', fontSize: 15, fontWeight: 800, color: t.txt, lineHeight: 1.25, letterSpacing: '-.01em' }}>
              {hunt.title}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 11, color: t.txtFaint, fontWeight: 500 }}>{hunt.tenantName ?? 'X-Hunt Community'}</span>
              {hunt.isVerified && <ShieldCheck size={10} strokeWidth={2.5} style={{ color: t.accent }} />}
            </div>
          </div>
        </div>

        {/* description */}
        <p style={{ margin: '0 0 10px', fontSize: 12.5, color: t.txtDim, lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {hunt.story_context}
        </p>

        {/* econometrics row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,.06)', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <DollarSign size={12} strokeWidth={2} style={{ color: t.accent }} />
            <span style={{ fontSize: 13.5, fontWeight: 900, color: t.accent, letterSpacing: '-.02em' }}>${cash}</span>
          </div>
          <div style={{ width: 3, height: 3, borderRadius: '50%', background: t.txtFaint }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Star size={11} strokeWidth={2} style={{ color: t.ai }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: t.ai }}>+{xp} XP</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
            <Clock size={11} strokeWidth={2} style={{ color: t.txtFaint }} />
            <span style={{ fontSize: 11, color: t.txtDim }}>{hunt.estimated_time}</span>
          </div>
        </div>

        {/* active progress bar */}
        {tab === 'Active' && stepsTotal > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 10.5, color: t.txtDim, fontWeight: 600 }}>Progress</span>
              <span style={{ fontSize: 10.5, color: t.accent, fontWeight: 700 }}>
                Step {(progress?.currentStepIndex ?? 0) + 1} of {stepsTotal}
              </span>
            </div>
            <ProgressBar value={stepsDone} max={stepsTotal} color={t.accent} />
          </div>
        )}

        {/* pending review verification timeline */}
        {tab === 'Pending Review' && verif && (
          <div style={{ marginBottom: 12 }}>
            <VerifTimeline status={verif.status} />
          </div>
        )}

        {/* completed: participants badge */}
        {tab === 'Completed' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, padding: '8px 12px', borderRadius: 12, background: `${t.accent}08`, border: `1px solid ${t.accent}18` }}>
            <Trophy size={13} strokeWidth={2} style={{ color: t.accent }} />
            <span style={{ fontSize: 11.5, fontWeight: 700, color: t.accent }}>Mission Complete</span>
            {hunt.applicationCount != null && (
              <span style={{ fontSize: 10, color: t.txtFaint, marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 3 }}>
                <Users size={10} strokeWidth={2} /> {hunt.applicationCount} participants
              </span>
            )}
          </div>
        )}
      </div>

      {/* CTAs */}
      <div style={{ padding: '0 16px 16px', display: 'flex', gap: 8 }}>
        <Link href={ctaHref} style={{
          flex: 1, height: 44, borderRadius: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          background: ctaBg, color: ctaColor, border: ctaBorder,
          boxShadow: ctaShadow, fontSize: 13, fontWeight: 700, textDecoration: 'none',
        }}>
          {ctaIcon}
          {ctaLabel}
        </Link>
        {/* secondary action */}
        {tab === 'Approved' && (
          <button style={{
            width: 44, height: 44, borderRadius: 14, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.09)',
            cursor: 'pointer',
          }}>
            <Share2 size={14} strokeWidth={2} style={{ color: t.txtDim }} />
          </button>
        )}
        {tab === 'Completed' && (
          <button style={{
            width: 44, height: 44, borderRadius: 14, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.09)',
            cursor: 'pointer',
          }}>
            <Share2 size={14} strokeWidth={2} style={{ color: t.txtDim }} />
          </button>
        )}
        {tab === 'Saved' && (
          <button
            onClick={() => onRemoveSaved?.(hunt.id)}
            style={{
              width: 44, height: 44, borderRadius: 14, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: `${t.error}0A`, border: `1px solid ${t.error}22`,
              cursor: 'pointer',
            }}
          >
            <BookmarkX size={14} strokeWidth={2} style={{ color: t.error }} />
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ─── CopilotFab ───────────────────────────────────────────────────────────────
function CopilotFab() {
  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.6, type: 'spring', stiffness: 260, damping: 20 }}
      whileTap={{ scale: 0.9 }}
      style={{
        position: 'fixed', bottom: 84, right: 18, zIndex: 60,
        width: 52, height: 52, borderRadius: '50%',
        background: `linear-gradient(135deg, ${t.ai}, ${t.accent})`,
        border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 4px 24px ${t.ai}50, 0 0 0 1px ${t.ai}30`,
      }}
    >
      <Bot size={22} strokeWidth={2} style={{ color: '#fff' }} />
    </motion.button>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────
export default function MyMissionsPage() {
  const router  = useRouter();
  const { user: authUser, isLoaded } = useAuth();

  const [mounted, setMounted]           = useState(false);
  const [tab, setTab]                   = useState<Tab>('Active');
  const [hunts, setHunts]               = useState<Hunt[]>([]);
  const [progress, setProgress]         = useState<Record<string, HuntProgress>>({});
  const [completedHunts, setCompleted]  = useState<CompletedHunt[]>([]);
  const [savedIds, setSavedIds]         = useState<string[]>([]);
  const [verifMap, setVerifMap]         = useState<Record<string, VerifRecord>>({});

  // ── auth guard ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoaded) return;
    if (!authUser) { router.replace('/sign-in'); return; }

    const state = loadState();
    if (!state.user?.onboardingComplete) { router.replace('/get-started'); return; }

    setProgress(state.progress);
    setCompleted(state.completedHunts);
    setHunts(state.hunts);
    setSavedIds(loadSaved());
    setMounted(true);

    // fetch fresh missions from Supabase
    void fetchSupabaseMissions().then((r) => {
      if (r?.length) {
        setHunts(r);
        const s = loadState();
        saveState({ ...s, hunts: r });
      }
    });

    // fetch verification statuses from mission_progress
    void (async () => {
      try {
        const sb = createClient();
        const { data } = await sb
          .from('mission_progress')
          .select('*')
          .order('started_at', { ascending: false }) as { data: DbMissionProgress[] | null };
        if (!data) return;
        const map: Record<string, VerifRecord> = {};
        for (const row of data) {
          // map DB completion state to verif status
          let status: VerifStatus = 'submitted';
          if (row.completed_at) status = 'approved';
          else if (row.current_step_index > 0) status = 'ai_reviewing';
          map[row.mission_id] = { missionId: row.mission_id, status, submittedAt: row.started_at };
        }
        setVerifMap(map);
      } catch {
        // non-fatal — continue with empty map
      }
    })();
  }, [isLoaded, authUser, router]);

  const removeSaved = useCallback((id: string) => {
    setSavedIds((prev) => {
      const next = prev.filter((x) => x !== id);
      writeSaved(next);
      return next;
    });
  }, []);

  if (!mounted) return null;

  // ── tab filtering ─────────────────────────────────────────────────────────
  const completedIds = new Set(completedHunts.map((c) => c.huntId));

  const huntById = (id: string) => hunts.find((h) => h.id === id) ?? null;

  const activeHunts = Object.entries(progress)
    .filter(([, p]) => !p.completedAt && !completedIds.has(p.huntId))
    .map(([id]) => huntById(id))
    .filter(Boolean) as Hunt[];

  const pendingHunts = Object.values(verifMap)
    .filter((v) => ['submitted', 'ai_reviewing', 'manual_review'].includes(v.status))
    .map((v) => huntById(v.missionId))
    .filter(Boolean) as Hunt[];

  const approvedHunts = Object.values(verifMap)
    .filter((v) => v.status === 'approved' && completedIds.has(v.missionId))
    .map((v) => huntById(v.missionId))
    .filter(Boolean) as Hunt[];

  const completedList = completedHunts
    .map((c) => huntById(c.huntId))
    .filter(Boolean) as Hunt[];

  const savedHunts = savedIds
    .map((id) => huntById(id))
    .filter(Boolean) as Hunt[];

  const tabCounts: Record<Tab, number> = {
    'Active':         activeHunts.length,
    'Pending Review': pendingHunts.length,
    'Approved':       approvedHunts.length,
    'Completed':      completedList.length,
    'Saved':          savedHunts.length,
  };

  const listedHunts: Hunt[] =
    tab === 'Active'        ? activeHunts
    : tab === 'Pending Review' ? pendingHunts
    : tab === 'Approved'    ? approvedHunts
    : tab === 'Completed'   ? completedList
    : savedHunts;

  const emptyProps: Record<Tab, { icon: React.ElementType; title: string; subtitle: string; actionLabel?: string; actionHref?: string }> = {
    'Active':         { icon: Target,   title: 'No active missions',      subtitle: 'Pick up a mission and start making an impact.', actionLabel: 'Find Opportunities', actionHref: '/explore' },
    'Pending Review': { icon: MailCheck, title: 'Nothing under review',   subtitle: 'Submit a mission to see it here.' },
    'Approved':       { icon: CheckCircle2, title: 'No approved missions yet', subtitle: 'Keep going — approvals appear here when earned.' },
    'Completed':      { icon: Trophy,   title: 'No completed missions',   subtitle: 'Finish your first mission to see it here.', actionLabel: 'Start your first mission', actionHref: '/explore' },
    'Saved':          { icon: Bookmark, title: 'No saved missions',       subtitle: 'Bookmark missions you want to revisit.', actionLabel: 'Explore missions', actionHref: '/explore' },
  };

  return (
    <div className="consumer-app" style={{ minHeight: '100vh', paddingBottom: 100, background: t.bg, color: t.txt }}>
      {/* ambient glows */}
      <div style={{ position: 'fixed', top: -80, right: -80, width: 300, height: 300, borderRadius: '50%', background: `radial-gradient(circle,${t.accent}07 0%,transparent 65%)`, pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', bottom: 120, left: -60, width: 200, height: 200, borderRadius: '50%', background: `radial-gradient(circle,${t.ai}06 0%,transparent 65%)`, pointerEvents: 'none', zIndex: 0 }} />

      <div className="consumer-app-inner" style={{ maxWidth: 430, margin: '0 auto', position: 'relative', zIndex: 1 }}>

        {/* ── PAGE HEADER ── */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ padding: '56px 20px 0' }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
            <div>
              <span style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: t.txtFaint, marginBottom: 4 }}>
                Participation
              </span>
              <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, letterSpacing: '-.03em', color: t.txt }}>
                My Missions
              </h1>
            </div>
            {/* summary chips */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, paddingTop: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 999, background: `${t.accent}0F`, border: `1px solid ${t.accent}22` }}>
                  <Play size={10} strokeWidth={2.5} style={{ color: t.accent }} />
                  <span style={{ fontSize: 11, fontWeight: 800, color: t.accent }}>{activeHunts.length} active</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 999, background: `${t.accent}0F`, border: `1px solid ${t.accent}22` }}>
                  <Trophy size={10} strokeWidth={2.5} style={{ color: t.accent }} />
                  <span style={{ fontSize: 11, fontWeight: 800, color: t.accent }}>{completedList.length} done</span>
                </div>
              </div>
            </div>
          </div>

          {/* stats summary bar */}
          <div
            className="liquid-glass"
            style={{
              background: t.card, border: `1px solid ${t.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
              borderRadius: 18, padding: '12px 16px', marginTop: 16, marginBottom: 4,
              display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8,
            }}
          >
            {([
              { label: 'Active',    val: activeHunts.length,   color: t.accent  },
              { label: 'Reviewing', val: pendingHunts.length,  color: t.ai      },
              { label: 'Approved',  val: approvedHunts.length, color: t.success },
              { label: 'Done',      val: completedList.length, color: t.accent  },
            ] as { label: string; val: number; color: string }[]).map(({ label, val, color }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 900, color, letterSpacing: '-.02em', lineHeight: 1 }}>{val}</div>
                <div style={{ fontSize: 9, fontWeight: 700, color: t.txtFaint, marginTop: 3, textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── STICKY TAB BAR ── */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 40,
          background: `${t.bg}E8`, backdropFilter: 'blur(20px)',
          padding: '12px 20px 0',
          borderBottom: '1px solid rgba(255,255,255,.05)',
        }}>
          <div style={{ display: 'flex', gap: 0, overflowX: 'auto', paddingBottom: 1 }} className="hide-scrollbar">
            {TABS.map((tb) => {
              const isActive = tab === tb;
              const count    = tabCounts[tb];
              return (
                <button
                  key={tb}
                  onClick={() => setTab(tb)}
                  style={{
                    flexShrink: 0, padding: '9px 14px', border: 0,
                    background: 'transparent', cursor: 'pointer',
                    fontFamily: 'inherit', fontSize: 12.5, fontWeight: isActive ? 800 : 600,
                    color: isActive ? t.accent : t.txtFaint,
                    borderBottom: isActive ? `2px solid ${t.accent}` : '2px solid transparent',
                    transition: 'all .15s', letterSpacing: '-.01em',
                    display: 'flex', alignItems: 'center', gap: 5,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {tb}
                  {count > 0 && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      minWidth: 16, height: 16, borderRadius: 999, padding: '0 4px',
                      fontSize: 9, fontWeight: 800,
                      background: isActive ? t.accent : 'rgba(255,255,255,.09)',
                      color: isActive ? t.bg : t.txtDim,
                    }}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── MISSION LIST ── */}
        <div style={{ padding: '16px 20px 0' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
            >
              {listedHunts.length === 0 ? (
                <EmptyState {...emptyProps[tab]} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {listedHunts.map((hunt, i) => (
                    <MissionRow
                      key={hunt.id}
                      hunt={hunt}
                      tab={tab}
                      progress={progress[hunt.id]}
                      verif={verifMap[hunt.id]}
                      saved={savedIds.includes(hunt.id)}
                      onRemoveSaved={removeSaved}
                      index={i}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* spacer above BottomNav */}
        <div style={{ height: 24 }} />
      </div>

      <CopilotFab />
      <BottomNav />
    </div>
  );
}
