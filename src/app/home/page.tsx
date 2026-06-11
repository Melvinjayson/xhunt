'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, Brain, ChevronRight, Zap, Compass, Radio,
  ArrowUpRight, TrendingUp, Sparkles, ArrowRight,
  Target, X, Star, Flame,
  CheckCircle2, PlayCircle, BarChart3,
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { loadState, saveState, loadProfile } from '@/lib/store';

import type { Hunt, ImpactProfile } from '@/lib/types';
import { fetchSupabaseMissions } from '@/lib/supabase/events';

/* ─── types ─── */
interface SubStatus {
  tier: string;
  isTrialActive: boolean;
  trialDaysLeft: number;
  hasUsedTrial: boolean;
  canUseAI: boolean;
}
interface Recommendation {
  id: string;
  title: string;
  tags: string[];
  estimated_time: string;
  difficulty: string;
  confidence_pct: number;
  reason: string;
  reward?: string;
}

/* ─── design tokens ─── */
const ACCENT  = '#22FFAA';
const AI_CLR  = '#6D5DFD';
const WARN    = '#FFB84D';
const ERR     = '#FF5C7A';
const BG      = '#050816';
const CARD    = '#0A1226';
const TXT     = '#F0F4FF';
const DIM     = '#8B9CC0';
const FAINT   = '#4A5578';

const XGLASS: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  backdropFilter: 'blur(24px)',
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: '0 0 40px rgba(34,255,170,0.06)',
};

/* ─── category colour map ─── */
const TAG_ACCENT: Record<string, string> = {
  fitness: ACCENT, adventure: WARN, food: ERR,
  learning: '#60A5FA', social: AI_CLR, tech: '#60A5FA',
  art: WARN, travel: ACCENT, mindful: AI_CLR,
};
const TAG_BG: Record<string, [string, string]> = {
  fitness:   ['#030F09', '#061A10'],
  adventure: ['#100A02', '#1A1204'],
  food:      ['#100205', '#1A0508'],
  learning:  ['#020510', '#040A1E'],
  social:    ['#060218', '#0A0528'],
  tech:      ['#020510', '#040A20'],
  art:       ['#100802', '#1A1204'],
  travel:    ['#030F09', '#061A10'],
  mindful:   ['#060218', '#0C0830'],
};
function tagAccent(tags: string[]) {
  for (const t of tags) { const c = TAG_ACCENT[t.toLowerCase()]; if (c) return c; }
  return ACCENT;
}
function tagBg(tags: string[]): [string, string] {
  for (const t of tags) { const c = TAG_BG[t.toLowerCase()]; if (c) return c; }
  return ['#030F09', '#061A10'];
}

/* ─── helpers ─── */
function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

const DIFF_CLR: Record<string, string> = { easy: ACCENT, medium: WARN, hard: ERR };

/* ─── animated counter ─── */
function Counter({ to, dur = 900, prefix = '', suffix = '' }: { to: number; dur?: number; prefix?: string; suffix?: string }) {
  const [val, setVal] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let n = 0;
    const inc = to / (dur / 16);
    const t = setInterval(() => { n += inc; if (n >= to) { setVal(to); clearInterval(t); } else setVal(n); }, 16);
    return () => clearInterval(t);
  }, [to, dur]);
  return <>{prefix}{Math.floor(val).toLocaleString()}{suffix}</>;
}

/* ─── sparkline ─── */
const SPARKS = [
  '0,24 16,18 32,21 48,11 64,15 80,6 96,3',
  '0,5 16,9 32,7 48,15 64,12 80,19 96,23',
  '0,20 16,14 32,17 48,7 64,12 80,4 96,2',
  '0,4 16,8 32,5 48,14 56,10 72,18 88,15 96,22',
];
function Spark({ i = 0, color = ACCENT }: { i?: number; color?: string }) {
  return (
    <svg width="72" height="28" viewBox="0 0 96 28" fill="none">
      <polyline points={SPARKS[i % SPARKS.length]} stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── MMS hero card ─── */
function MMSCard({ score, delta, tier, tierColor }: { score: number; delta: number; tier: string; tierColor: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.08 }}
      style={{
        ...XGLASS,
        borderRadius: 20,
        padding: '18px 20px',
        position: 'relative',
        overflow: 'hidden',
        flex: '1 1 0',
      }}
    >
      {/* ambient glow */}
      <div style={{ position: 'absolute', bottom: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: `radial-gradient(circle, ${ACCENT}18 0%, transparent 70%)`, pointerEvents: 'none' }} />

      <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 600, color: FAINT, textTransform: 'uppercase', letterSpacing: '.08em' }}>
        Mission Momentum
      </p>
      <p style={{ margin: '0 0 6px', fontSize: 36, fontWeight: 900, color: TXT, lineHeight: 1, letterSpacing: '-0.04em' }}>
        <Counter to={score} dur={1000} />
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, background: `${ACCENT}14`, border: `1px solid ${ACCENT}22`, borderRadius: 999, padding: '2px 8px' }}>
          <TrendingUp size={9} strokeWidth={2.5} style={{ color: ACCENT }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: ACCENT }}>+{delta} this week</span>
        </div>
      </div>
      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: tierColor, boxShadow: `0 0 8px ${tierColor}` }} />
        <span style={{ fontSize: 10.5, fontWeight: 600, color: tierColor }}>{tier}</span>
      </div>

      {/* mini sparkline */}
      <div style={{ position: 'absolute', right: 12, bottom: 14, opacity: 0.7 }}>
        <Spark i={0} color={ACCENT} />
      </div>
    </motion.div>
  );
}

/* ─── small stat card ─── */
function StatCard({ label, value, sub, icon: Icon, accent, index }: {
  label: string; value: string | number; sub: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties }>;
  accent: string; index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.12 + index * 0.07 }}
      style={{ ...XGLASS, borderRadius: 18, padding: '14px 14px', flex: '1 1 0', minWidth: 0, position: 'relative', overflow: 'hidden' }}
    >
      <div style={{ position: 'absolute', top: -20, right: -20, width: 70, height: 70, borderRadius: '50%', background: `radial-gradient(circle, ${accent}18 0%, transparent 70%)`, pointerEvents: 'none' }} />
      <div style={{ width: 28, height: 28, borderRadius: 9, background: `${accent}16`, border: `1px solid ${accent}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
        <Icon size={13} strokeWidth={2} style={{ color: accent }} />
      </div>
      <p style={{ margin: '0 0 2px', fontSize: 22, fontWeight: 900, color: TXT, lineHeight: 1, letterSpacing: '-0.04em' }}>
        {typeof value === 'number' ? <Counter to={value} /> : value}
      </p>
      <p style={{ margin: '0 0 6px', fontSize: 10, color: FAINT, fontWeight: 500 }}>{label}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
        <TrendingUp size={8} strokeWidth={2.5} style={{ color: accent }} />
        <span style={{ fontSize: 9.5, fontWeight: 700, color: accent }}>{sub}</span>
      </div>
    </motion.div>
  );
}

/* ─── active mission card ─── */
function ActiveMissionCard({ hunt, progress = 0 }: { hunt: Hunt; progress?: number }) {
  const accent = tagAccent(hunt.tags);
  const [bg0, bg1] = tagBg(hunt.tags);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.22 }}
      style={{ borderRadius: 22, overflow: 'hidden', border: `1px solid ${accent}18`, boxShadow: `0 0 48px ${accent}10` }}
    >
      {/* Mission "scene" */}
      <div
        style={{
          background: `linear-gradient(160deg, ${bg0} 0%, ${bg1} 100%)`,
          height: 90, position: 'relative', overflow: 'hidden',
          display: 'flex', alignItems: 'flex-end', padding: '0 18px 14px',
        }}
      >
        {/* glow orbs */}
        <div style={{ position: 'absolute', top: 10, right: 20, width: 80, height: 80, borderRadius: '50%', background: `radial-gradient(circle, ${accent}30 0%, transparent 70%)` }} />
        <div style={{ position: 'absolute', top: 20, left: 40, width: 50, height: 50, borderRadius: '50%', background: `radial-gradient(circle, ${accent}16 0%, transparent 70%)` }} />
        {/* label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 999, padding: '5px 12px' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: accent, boxShadow: `0 0 8px ${accent}` }} />
          <span style={{ fontSize: 10.5, fontWeight: 700, color: TXT, textTransform: 'uppercase', letterSpacing: '.06em' }}>Active Mission</span>
        </div>

        {/* play button */}
        <Link href={`/missions/${hunt.id}`} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', textDecoration: 'none' }}>
          <motion.div
            whileTap={{ scale: 0.92 }}
            style={{
              width: 44, height: 44, borderRadius: '50%',
              background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 0 24px ${accent}60`,
            }}
          >
            <PlayCircle size={22} strokeWidth={2} style={{ color: '#050816' }} />
          </motion.div>
        </Link>
      </div>

      {/* Card body */}
      <div style={{ background: CARD, padding: '16px 18px' }}>
        <p style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800, color: TXT, lineHeight: 1.25, letterSpacing: '-0.02em' }}>
          {hunt.title}
        </p>
        <p style={{ margin: '0 0 14px', fontSize: 11.5, color: DIM }}>
          {hunt.steps?.length ?? '?'} tasks remaining · Est. {hunt.estimated_time}
        </p>

        {/* Progress */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 10.5, fontWeight: 600, color: FAINT }}>Progress</span>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: accent }}>{progress}%</span>
          </div>
          <div style={{ height: 6, borderRadius: 4, background: 'rgba(255,255,255,.07)', overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
              style={{
                height: '100%', borderRadius: 4,
                background: `linear-gradient(90deg, ${accent}, ${accent}CC)`,
                boxShadow: `0 0 12px ${accent}80`,
              }}
            />
          </div>
        </div>

        {/* Reward + category */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 12, padding: '8px 12px' }}>
            <p style={{ margin: '0 0 2px', fontSize: 9.5, color: FAINT, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>Reward</p>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: accent }}>{hunt.reward.split('+')[0].trim()}</p>
          </div>
          <div style={{ flex: 1, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 12, padding: '8px 12px' }}>
            <p style={{ margin: '0 0 2px', fontSize: 9.5, color: FAINT, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>Category</p>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: TXT }}>{hunt.tags[0] ?? 'Mission'}</p>
          </div>
        </div>

        {/* CTA */}
        <Link href={`/missions/${hunt.id}`} style={{ textDecoration: 'none', display: 'block' }}>
          <motion.div
            whileTap={{ scale: 0.98 }}
            style={{
              height: 48, borderRadius: 14, background: accent,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: `0 0 28px ${accent}40`,
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 800, color: '#050816' }}>{progress > 0 ? 'Continue Mission' : 'Start Mission'}</span>
            <ArrowRight size={16} strokeWidth={2.8} style={{ color: '#050816' }} />
          </motion.div>
        </Link>
      </div>
    </motion.div>
  );
}

/* ─── AI insight card ─── */
function AIInsightCard({ recs, onDismiss }: { recs: Recommendation[]; onDismiss: () => void }) {
  const count = recs.length;
  const top = recs[0];
  const estimatedEarnings = recs.reduce((acc, r) => {
    const m = r.reward?.match(/\$(\d+)/);
    return acc + (m ? parseInt(m[1]) : 25);
  }, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      style={{
        background: `linear-gradient(135deg, #0A0820 0%, #0E0C2A 100%)`,
        border: `1px solid rgba(109,93,253,0.22)`,
        borderRadius: 22,
        padding: '18px 18px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 0 48px rgba(109,93,253,0.12)',
      }}
    >
      {/* purple glow */}
      <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(109,93,253,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* dismiss */}
      <button onClick={onDismiss} style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', borderRadius: '50%', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
        <X size={11} strokeWidth={2} style={{ color: FAINT }} />
      </button>

      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ position: 'relative' }}>
          <div style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(109,93,253,0.2)', border: '1px solid rgba(109,93,253,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Brain size={18} strokeWidth={1.8} style={{ color: AI_CLR }} />
          </div>
          {/* breathing dot */}
          <div style={{ position: 'absolute', top: -3, right: -3, width: 9, height: 9, borderRadius: '50%', background: ACCENT, border: '2px solid #050816', animation: 'breathe 2.5s ease-in-out infinite' }} />
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: TXT }}>AI Mission Assistant</p>
          <p style={{ margin: 0, fontSize: 10.5, color: AI_CLR, fontWeight: 600 }}>6 agents active · Analysing</p>
        </div>
      </div>

      <p style={{ margin: '0 0 16px', fontSize: 13.5, color: DIM, lineHeight: 1.6 }}>
        I found <span style={{ color: TXT, fontWeight: 700 }}>{count} mission{count !== 1 ? 's' : ''}</span> matched to your interests that can boost your XP.
        {top && ` Top pick: "${top.title.slice(0, 30)}…" with ${top.confidence_pct}% confidence.`}
        {estimatedEarnings > 0 && ` Estimated value: up to $${estimatedEarnings}.`}
      </p>

      {/* CTA */}
      <Link href="/explore" style={{ textDecoration: 'none', display: 'block' }}>
        <motion.div
          whileTap={{ scale: 0.98 }}
          style={{
            height: 44, borderRadius: 12,
            background: ACCENT,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            boxShadow: `0 0 24px ${ACCENT}40`,
          }}
        >
          <Sparkles size={14} strokeWidth={2} style={{ color: '#050816' }} />
          <span style={{ fontSize: 13.5, fontWeight: 800, color: '#050816' }}>Show Me</span>
        </motion.div>
      </Link>
    </motion.div>
  );
}

/* ─── match score helper ─── */
function computeMatchScore(hunt: Hunt, profile: ImpactProfile | null): number | null {
  if (!profile) return null;
  const huntTagsLower = hunt.tags.map((t) => t.toLowerCase());
  const causesLower = profile.causes.map((c) => c.toLowerCase());
  const strengthsLower = profile.strengths.map((s) => s.name.toLowerCase());
  let score = 55;
  for (const tag of huntTagsLower) {
    if (causesLower.some((c) => c.includes(tag) || tag.includes(c))) score += 12;
    if (strengthsLower.some((s) => s.includes(tag) || tag.includes(s))) score += 8;
  }
  score += Math.round((profile.impactScore / 100) * 10);
  return Math.min(98, score);
}

/* ─── compact mission card (recommended) ─── */
function MissionCard({ hunt, index, isCompleted, matchScore }: { hunt: Hunt; index: number; isCompleted?: boolean; matchScore?: number | null }) {
  const accent = tagAccent(hunt.tags);
  const diffColor = DIFF_CLR[hunt.difficulty] ?? DIM;
  const rewardMatch = hunt.reward.match(/\$(\d+[\d,]*)/);
  const rewardLabel = rewardMatch ? rewardMatch[0] : hunt.reward.split('+')[0].trim();
  const sparkPos = index % 2 === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.35 }}
    >
      <Link href={`/missions/${hunt.id}`} style={{ textDecoration: 'none', display: 'block' }}>
        <div
          style={{
            ...XGLASS,
            borderRadius: 20,
            padding: '15px 16px',
            borderColor: isCompleted ? 'rgba(255,255,255,0.05)' : `rgba(255,255,255,0.08)`,
            transition: 'border-color .2s',
          }}
        >
          {/* row 1 — icon + title + arrow */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 8 }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, flexShrink: 0, background: `${accent}14`, border: `1px solid ${accent}25`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Target size={17} strokeWidth={2} style={{ color: accent }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: isCompleted ? DIM : TXT, lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {hunt.title}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 10.5, color: FAINT }}>({hunt.tags[0] ?? 'mission'})</p>
            </div>
            <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowUpRight size={13} strokeWidth={2.5} style={{ color: FAINT }} />
            </div>
          </div>

          {/* row 2 — meta + difficulty + match */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 49, marginBottom: 12 }}>
            <span style={{ fontSize: 11, color: FAINT }}>{hunt.estimated_time}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: diffColor, background: `${diffColor}12`, border: `1px solid ${diffColor}25`, borderRadius: 999, padding: '1px 7px' }}>
              {hunt.difficulty}
            </span>
            {matchScore != null && !isCompleted && (
              <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 800, color: matchScore >= 80 ? ACCENT : matchScore >= 65 ? WARN : DIM, background: matchScore >= 80 ? `${ACCENT}12` : matchScore >= 65 ? `${WARN}12` : 'rgba(255,255,255,.04)', border: `1px solid ${matchScore >= 80 ? `${ACCENT}25` : matchScore >= 65 ? `${WARN}25` : 'rgba(255,255,255,.08)'}`, borderRadius: 999, padding: '2px 8px' }}>
                {matchScore}% match
              </span>
            )}
            {isCompleted && (
              <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, color: ACCENT }}>
                <CheckCircle2 size={10} strokeWidth={2.5} /> Completed
              </span>
            )}
          </div>

          {/* row 3 — reward + sparkline */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: isCompleted ? FAINT : TXT, letterSpacing: '-0.04em', lineHeight: 1 }}>
              {rewardLabel}
            </p>
            <div style={{ opacity: isCompleted ? 0.25 : 0.85 }}>
              <Spark i={index} color={sparkPos ? ACCENT : WARN} />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/* ─── Recent activity row ─── */
function ActivityItem({ text, sub, xp, positive, index }: { text: string; sub: string; xp: string; positive: boolean; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.05 + index * 0.07, duration: 0.3 }}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: '1px solid rgba(255,255,255,.05)' }}
    >
      <div style={{ width: 34, height: 34, borderRadius: 11, background: positive ? `${ACCENT}14` : `${ERR}14`, border: `1px solid ${positive ? ACCENT : ERR}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {positive
          ? <CheckCircle2 size={15} strokeWidth={2} style={{ color: ACCENT }} />
          : <BarChart3 size={15} strokeWidth={2} style={{ color: ERR }} />
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: TXT, lineHeight: 1.25 }}>{text}</p>
        <p style={{ margin: '2px 0 0', fontSize: 10.5, color: FAINT }}>{sub}</p>
      </div>
      <span style={{ fontSize: 12, fontWeight: 800, color: positive ? ACCENT : ERR, flexShrink: 0 }}>{xp}</span>
    </motion.div>
  );
}

/* ─── PAGE ─── */
export default function HomePage() {
  const router = useRouter();
  const [hunts, setHunts]           = useState<Hunt[]>([]);
  const [completedIds, setIds]      = useState<string[]>([]);
  const [streak, setStreak]         = useState(0);
  const [mounted, setMounted]       = useState(false);
  const [subStatus, setSub]         = useState<SubStatus | null>(null);
  const [nudgeDismissed, setNudge]  = useState(false);
  const [aiDismissed, setAIDismiss] = useState(false);
  const [recs, setRecs]             = useState<Recommendation[]>([]);
  const [userName, setUserName]     = useState('Explorer');
  const [impactProfile, setProfile] = useState<ImpactProfile | null>(null);

  useEffect(() => {
    const state = loadState();
    if (!state.user?.onboardingComplete) { router.replace('/'); return; }
    setIds(state.completedHunts.map((h) => h.huntId));
    setStreak(state.streak);
    if ((state.user as { name?: string }).name) setUserName((state.user as { name?: string }).name!);
    setHunts(state.hunts);
    setProfile(loadProfile());
    setMounted(true);

    void fetchSupabaseMissions().then((r) => {
      if (r?.length) { setHunts(r); const s = loadState(); saveState({ ...s, hunts: r }); }
    });
    void fetch('/api/subscription/status').then((r) => r.json()).then((d: SubStatus) => setSub(d)).catch(() => {});
    void fetch('/api/recommendations?limit=5')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.recommendations?.length) setRecs(d.recommendations); })
      .catch(() => {});
  }, [router]);

  if (!mounted) return null;

  const active   = hunts.filter((h) => !completedIds.includes(h.id));
  const done     = hunts.filter((h) =>  completedIds.includes(h.id));
  const topHunt  = active[0] ?? null;

  /* computed metrics */
  const mms        = Math.min(1000, 50 + completedIds.length * 40 + streak * 15);
  const mmsDelta   = streak * 3 + completedIds.length * 2;
  const xpBalance  = 100 + completedIds.length * 250 + streak * 15;
  const tierLabel  = mms >= 700 ? 'Elite Hunter' : mms >= 400 ? 'Pro Hunter' : mms >= 150 ? 'Verified Hunter' : 'Explorer';
  const tierColor  = mms >= 700 ? WARN : mms >= 400 ? AI_CLR : mms >= 150 ? ACCENT : FAINT;

  const ACTIONS = [
    { icon: Compass,   label: 'Explore',  href: '/explore',  primary: false },
    { icon: Zap,       label: 'Go Live',  href: '/timeline', primary: false },
    { icon: BarChart3, label: 'Missions', href: '/missions', primary: false },
    { icon: Radio,     label: 'Timeline', href: '/timeline', primary: false },
  ];

  return (
    <div className="consumer-app" style={{ minHeight: '100vh', background: BG, paddingBottom: 100 }}>

      {/* ambient glow top-right */}
      <div style={{ position: 'fixed', top: -80, right: -80, width: 320, height: 320, borderRadius: '50%', background: `radial-gradient(circle, ${ACCENT}08 0%, transparent 65%)`, pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', bottom: 80, left: -60, width: 200, height: 200, borderRadius: '50%', background: `radial-gradient(circle, ${AI_CLR}08 0%, transparent 65%)`, pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ maxWidth: 430, margin: '0 auto', position: 'relative', zIndex: 1 }}>

        {/* ─────────── TOP BAR ─────────── */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 50,
          background: 'rgba(5,8,22,0.85)',
          backdropFilter: 'blur(24px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          padding: '50px 20px 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ position: 'relative', width: 36, height: 36 }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `2px solid ${ACCENT}`, opacity: 0.95 }} />
              <div style={{ position: 'absolute', inset: 6, borderRadius: '50%', border: `1.5px solid ${ACCENT}50` }} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 900, color: ACCENT, letterSpacing: '-0.05em' }}>X</span>
              </div>
            </div>
            <span style={{ fontSize: 15, fontWeight: 800, color: TXT, letterSpacing: '-0.03em' }}>XHUNT</span>
          </div>

          {/* Right */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Search */}
            <Link href="/explore" style={{ textDecoration: 'none' }}>
              <div style={{ height: 38, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px', cursor: 'pointer' }}>
                <span style={{ fontSize: 12, color: FAINT }}>Search missions…</span>
              </div>
            </Link>
            {/* Bell */}
            <button style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative', flexShrink: 0 }}>
              <Bell size={16} strokeWidth={1.8} style={{ color: DIM }} />
              <div style={{ position: 'absolute', top: 7, right: 7, width: 7, height: 7, borderRadius: '50%', background: ACCENT, border: `1.5px solid ${BG}`, animation: 'breathe 2.5s ease-in-out infinite' }} />
            </button>
            {/* Avatar */}
            <div style={{ width: 38, height: 38, borderRadius: 12, background: `linear-gradient(135deg, ${ACCENT}20, ${AI_CLR}20)`, border: `1.5px solid ${ACCENT}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: ACCENT }}>{userName[0].toUpperCase()}</span>
            </div>
          </div>
        </div>

        {/* ─────────── WELCOME ─────────── */}
        <div style={{ padding: '24px 20px 0' }}>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <h1 style={{ margin: '0 0 3px', fontSize: 22, fontWeight: 800, color: TXT, letterSpacing: '-0.03em' }}>
              {greeting()}, {userName} 👋
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: DIM }}>
              {active.length > 0
                ? `${active.length} mission${active.length !== 1 ? 's' : ''} waiting · Let's complete them.`
                : done.length > 0
                ? `${done.length} mission${done.length !== 1 ? 's' : ''} completed · Great work.`
                : 'Generate your first mission to start earning.'}
            </p>
          </motion.div>
        </div>

        {/* ─────────── STAT CARDS ─────────── */}
        <div style={{ padding: '20px 20px 0' }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <MMSCard score={mms} delta={mmsDelta} tier={tierLabel} tierColor={tierColor} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: '0 0 auto' }}>
              <StatCard label="XPoints" value={xpBalance} sub={`+${completedIds.length * 50 || 0} Today`} icon={Star} accent={AI_CLR} index={0} />
              <StatCard label="Completed" value={completedIds.length} sub={`+${Math.min(streak, 3)} this week`} icon={CheckCircle2} accent={ACCENT} index={1} />
            </div>
          </div>
        </div>

        {/* ─────────── FREEMIUM NUDGE ─────────── */}
        <AnimatePresence>
          {subStatus && !subStatus.canUseAI && !subStatus.hasUsedTrial && !nudgeDismissed && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}
              style={{ margin: '16px 20px 0', borderRadius: 16, background: `${AI_CLR}0D`, border: `1px solid ${AI_CLR}28`, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}
            >
              <Sparkles size={15} strokeWidth={2} style={{ color: AI_CLR, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: TXT }}>Unlock AI Agents + Premium Missions</p>
                <p style={{ margin: '1px 0 0', fontSize: 10.5, color: FAINT }}>14-day free trial · No card required</p>
              </div>
              <button onClick={() => router.push('/upgrade')} style={{ fontSize: 11.5, fontWeight: 700, color: AI_CLR, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                Try free <ArrowRight size={11} strokeWidth={2.5} />
              </button>
              <button onClick={() => setNudge(true)} style={{ background: 'none', border: 0, cursor: 'pointer', padding: 2 }}>
                <X size={13} strokeWidth={2} style={{ color: FAINT }} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─────────── ACTIVE MISSION ─────────── */}
        {topHunt && (
          <div style={{ padding: '20px 20px 0' }}>
            <ActiveMissionCard hunt={topHunt} progress={0} />
          </div>
        )}

        {/* ─────────── AI INSIGHT ─────────── */}
        {recs.length > 0 && !aiDismissed && (
          <div style={{ padding: '16px 20px 0' }}>
            <AIInsightCard recs={recs} onDismiss={() => setAIDismiss(true)} />
          </div>
        )}

        {/* ─────────── QUICK ACTIONS ─────────── */}
        <div style={{ padding: '20px 20px 0' }}>
          <p style={{ margin: '0 0 14px', fontSize: 11, fontWeight: 700, color: FAINT, textTransform: 'uppercase', letterSpacing: '.08em' }}>Quick Actions</p>
          <div style={{ display: 'flex', gap: 12 }}>
            {ACTIONS.map(({ icon: Icon, label, href }) => (
              <Link key={label} href={href} style={{ textDecoration: 'none', flex: 1 }}>
                <motion.div
                  whileTap={{ scale: 0.93 }}
                  style={{ ...XGLASS, borderRadius: 16, padding: '14px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}
                >
                  <Icon size={19} strokeWidth={1.8} style={{ color: DIM }} />
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: FAINT }}>{label}</span>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>

        {/* ─────────── DAILY STREAK ─────────── */}
        {streak > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            style={{ margin: '16px 20px 0', ...XGLASS, borderRadius: 20, padding: '16px 18px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <div style={{ width: 34, height: 34, borderRadius: 11, background: `${WARN}14`, border: `1px solid ${WARN}28`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Flame size={17} strokeWidth={2} style={{ color: WARN }} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: TXT }}>Daily Streak</p>
                  <p style={{ margin: 0, fontSize: 10.5, color: FAINT }}>{streak} days in a row</p>
                </div>
              </div>
              <span style={{ fontSize: 28, fontWeight: 900, color: WARN, letterSpacing: '-0.04em' }}>{streak}</span>
            </div>
            {/* day dots */}
            <div style={{ display: 'flex', gap: 6, justifyContent: 'space-between' }}>
              {['M','T','W','T','F','S','S'].map((d, i) => {
                const filled = i < streak;
                return (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: filled ? `${ACCENT}18` : 'rgba(255,255,255,.04)', border: `1px solid ${filled ? ACCENT : 'rgba(255,255,255,.08)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: filled ? `0 0 8px ${ACCENT}30` : 'none' }}>
                      {filled && <div style={{ width: 8, height: 8, borderRadius: '50%', background: ACCENT }} />}
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 600, color: filled ? ACCENT : FAINT }}>{d}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ─────────── RECOMMENDED MISSIONS ─────────── */}
        <div style={{ padding: '24px 20px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: TXT }}>
              {recs.length > 0 ? 'Recommended for You' : active.length > 0 ? 'Active Missions' : 'All Missions'}
            </p>
            <Link href="/explore" style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, fontWeight: 600, color: DIM, textDecoration: 'none' }}>
              View all <ArrowUpRight size={12} strokeWidth={2} />
            </Link>
          </div>

          {hunts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 0' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: `${ACCENT}0D`, border: `1px solid ${ACCENT}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <Compass size={22} strokeWidth={1.6} style={{ color: ACCENT }} />
              </div>
              <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: TXT }}>No missions yet</p>
              <p style={{ margin: '0 0 20px', fontSize: 12.5, color: FAINT }}>Generate your first AI mission to start earning.</p>
              <Link href="/get-started" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '11px 22px', borderRadius: 14, background: ACCENT, color: '#050816', fontWeight: 800, fontSize: 13.5, textDecoration: 'none', boxShadow: `0 0 24px ${ACCENT}40` }}>
                <Zap size={14} strokeWidth={2.5} /> Start My First Hunt
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {(active.length > 0 ? active : done).slice(0, 4).map((hunt, i) => (
                <MissionCard key={hunt.id} hunt={hunt} index={i} isCompleted={completedIds.includes(hunt.id)} matchScore={computeMatchScore(hunt, impactProfile)} />
              ))}
            </div>
          )}
        </div>

        {/* ─────────── RECENT ACTIVITY ─────────── */}
        {done.length > 0 && (
          <div style={{ margin: '24px 20px 0', ...XGLASS, borderRadius: 22, padding: '18px 18px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: TXT }}>Recent Activity</p>
              <Link href="/profile" style={{ fontSize: 12, fontWeight: 600, color: DIM, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 2 }}>
                View all <ChevronRight size={12} strokeWidth={2} />
              </Link>
            </div>
            {done.slice(0, 3).map((hunt, i) => (
              <ActivityItem
                key={hunt.id}
                text="Mission Completed"
                sub={hunt.title.length > 32 ? hunt.title.slice(0, 30) + '…' : hunt.title}
                xp={`+250 XP`}
                positive={true}
                index={i}
              />
            ))}
            {streak > 1 && (
              <ActivityItem
                text="Streak Milestone"
                sub={`${streak} day streak reached`}
                xp={`+${streak * 10} XP`}
                positive={true}
                index={done.length}
              />
            )}
          </div>
        )}

        {/* ─────────── COMPLETED SECTION ─────────── */}
        {done.length > 0 && active.length > 0 && (
          <div style={{ padding: '24px 20px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: TXT }}>Completed</p>
              <span style={{ fontSize: 11, color: FAINT }}>{done.length} verified</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {done.slice(0, 3).map((hunt, i) => (
                <MissionCard key={hunt.id} hunt={hunt} index={i} isCompleted matchScore={null} />
              ))}
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
