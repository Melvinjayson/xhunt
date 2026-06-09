'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Bell, Target, Clock, Zap, Trophy, ChevronRight, CheckCircle2, ShieldCheck, Building2, Lock, Sparkles } from 'lucide-react';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import { loadState, saveState } from '@/lib/store';
import { MOCK_HUNTS, getTagEmoji } from '@/lib/mockHunts';
import type { Hunt } from '@/lib/types';
import { fetchSupabaseMissions } from '@/lib/supabase/events';

const T = {
  bg:        '#070d0e',
  panel:     '#0e1719',
  elev:      '#17262a',
  line:      'rgba(255,255,255,.07)',
  line2:     'rgba(255,255,255,.12)',
  txt:       '#e9eff0',
  muted:     '#7d8b8e',
  dim:       '#54625f',
  green:     '#27e07d',
  green2:    '#34d98a',
  greenDeep: '#15b866',
  greenGlow: 'rgba(39,224,125,.32)',
  red:       '#ef5b6b',
  amber:     '#f7931a',
  ai:        '#22d3ee',
} as const;

const DIFF = {
  easy:   { label: 'Easy',   color: T.green, bg: 'rgba(39,224,125,.12)' },
  medium: { label: 'Medium', color: T.amber, bg: 'rgba(247,147,26,.12)' },
  hard:   { label: 'Hard',   color: T.red,   bg: 'rgba(239,91,107,.12)' },
} as const;

const TABS = ['All', 'Active', 'Completed'] as const;
type Tab = typeof TABS[number];

interface SubStatus {
  canAccessPremiumMissions: boolean;
  isTrialActive: boolean;
  trialDaysLeft: number;
  tier: string;
  hasUsedTrial: boolean;
}

function isPremiumMission(hunt: Hunt) {
  return hunt.isVerified || !!hunt.tenantName;
}

// ── Card ─────────────────────────────────────────────────────────────────────
function MissionCard({ hunt, done, locked }: { hunt: Hunt; done: boolean; locked: boolean }) {
  const diff  = DIFF[hunt.difficulty];
  const emoji = getTagEmoji(hunt.tags);

  return (
    <motion.div
      whileTap={{ scale: locked ? 1 : 0.985 }}
      transition={{ duration: 0.1 }}
      style={{
        background: `linear-gradient(180deg, rgba(255,255,255,.022), rgba(255,255,255,0)), ${T.panel}`,
        border: `1px solid ${locked ? 'rgba(255,255,255,.05)' : T.line}`,
        borderRadius: 22,
        overflow: 'hidden',
        opacity: done ? 0.62 : locked ? 0.75 : 1,
        position: 'relative',
      }}
    >
      {/* Accent bar */}
      <div style={{
        height: 2,
        background: done
          ? `linear-gradient(90deg,${T.green2},${T.greenDeep})`
          : locked
          ? `linear-gradient(90deg,rgba(255,255,255,.08),rgba(255,255,255,0))`
          : `linear-gradient(90deg,${T.green},rgba(39,224,125,0))`,
      }} />

      <div style={{ padding: '16px 16px 0' }}>
        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, flexShrink: 0, background: locked ? 'rgba(255,255,255,.04)' : 'rgba(39,224,125,.1)', border: `1px solid ${locked ? T.line : 'rgba(39,224,125,.15)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
            {locked ? <Lock size={18} style={{ color: T.dim }} strokeWidth={2} /> : emoji}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {done && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: T.green, background: 'rgba(39,224,125,.12)', padding: '2px 8px', borderRadius: 999, marginBottom: 4 }}>
                <CheckCircle2 size={10} strokeWidth={2.5} />Completed
              </div>
            )}
            {locked && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: T.ai, background: 'rgba(34,211,238,.08)', padding: '2px 8px', borderRadius: 999, marginBottom: 4 }}>
                <Sparkles size={10} strokeWidth={2.5} />Premium
              </div>
            )}
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, lineHeight: 1.3, color: T.txt, letterSpacing: '-.01em' }}>
              {hunt.title}
            </h3>
          </div>
          <ChevronRight size={15} strokeWidth={2} style={{ color: T.dim, flexShrink: 0, marginTop: 2 }} />
        </div>

        <p style={{ margin: '0 0 12px', fontSize: 13, lineHeight: 1.5, color: T.muted, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {hunt.story_context}
        </p>

        {/* Tags */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {hunt.tags.slice(0, 3).map((tag) => (
            <span key={tag} style={{ fontSize: 10.5, fontWeight: 500, color: T.muted, background: 'rgba(255,255,255,.05)', border: `1px solid ${T.line}`, padding: '2px 10px', borderRadius: 999 }}>
              {tag}
            </span>
          ))}
        </div>

        {/* Sponsor / verified row */}
        {(hunt.tenantName || hunt.isVerified) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            {hunt.tenantName && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                {hunt.tenantLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={hunt.tenantLogo} alt={hunt.tenantName} style={{ width: 16, height: 16, borderRadius: 4, objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: 16, height: 16, borderRadius: 4, background: T.elev, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Building2 size={10} strokeWidth={2} style={{ color: T.dim }} />
                  </div>
                )}
                <span style={{ fontSize: 11, fontWeight: 600, color: T.dim }}>{hunt.tenantName}</span>
              </div>
            )}
            {hunt.isVerified && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginLeft: hunt.tenantName ? 'auto' : 0 }}>
                <ShieldCheck size={11} strokeWidth={2.5} style={{ color: T.green }} />
                <span style={{ fontSize: 10, fontWeight: 800, color: T.green, letterSpacing: '.05em', textTransform: 'uppercase' }}>Verified</span>
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingTop: 12, borderTop: `1px solid ${T.line}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Clock size={12} strokeWidth={2} style={{ color: T.dim }} />
            <span style={{ fontSize: 12, fontWeight: 500, color: T.muted }}>{hunt.estimated_time}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 999, background: diff.bg }}>
            <Zap size={10} strokeWidth={2.5} style={{ color: diff.color }} />
            <span style={{ fontSize: 10.5, fontWeight: 700, color: diff.color }}>{diff.label}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginLeft: 'auto' }}>
            <Trophy size={12} strokeWidth={2} style={{ color: T.green }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: T.green, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {hunt.reward.split('+')[0].trim()}
            </span>
          </div>
        </div>
      </div>

      {/* CTA */}
      {!done ? (
        <div style={{ padding: '12px 16px 16px' }}>
          {locked ? (
            <div style={{ width: '100%', height: 48, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'rgba(34,211,238,.07)', border: '1px solid rgba(34,211,238,.18)', color: T.ai, fontSize: 13, fontWeight: 700 }}>
              <Sparkles size={14} strokeWidth={2.5} />
              Unlock with Trial
            </div>
          ) : (
            <div style={{ width: '100%', height: 48, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'linear-gradient(180deg,#3ee888 0%,#19c268 100%)', boxShadow: `0 8px 24px ${T.greenGlow}`, color: '#04130b', fontSize: 14, fontWeight: 700 }}>
              <Target size={15} strokeWidth={2.5} />
              Start Mission
            </div>
          )}
        </div>
      ) : (
        <div style={{ height: 16 }} />
      )}
    </motion.div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function MissionsPage() {
  const router = useRouter();
  const [hunts, setHunts]             = useState<Hunt[]>([]);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [streak, setStreak]           = useState(0);
  const [tab, setTab]                 = useState<Tab>('All');
  const [mounted, setMounted]         = useState(false);
  const [subStatus, setSubStatus]     = useState<SubStatus | null>(null);

  useEffect(() => {
    const state = loadState();
    if (!state.user?.onboardingComplete) { router.replace('/'); return; }
    setCompletedIds(state.completedHunts.map((h) => h.huntId));
    setStreak(state.streak);
    setHunts(state.hunts.length > 0 ? state.hunts : MOCK_HUNTS);
    setMounted(true);

    // Fetch subscription status (non-blocking)
    void fetch('/api/subscription/status')
      .then((r) => r.json())
      .then((d: SubStatus) => setSubStatus(d))
      .catch(() => setSubStatus({ canAccessPremiumMissions: false, isTrialActive: false, trialDaysLeft: 0, tier: 'free', hasUsedTrial: false }));

    void fetchSupabaseMissions().then((remote) => {
      if (remote?.length) {
        setHunts(remote);
        const s = loadState();
        saveState({ ...s, hunts: remote });
      }
    });
  }, [router]);

  if (!mounted) return null;

  const canPremium = subStatus?.canAccessPremiumMissions ?? false;

  const activeHunts = hunts.filter((h) => !completedIds.includes(h.id));
  const doneHunts   = hunts.filter((h) =>  completedIds.includes(h.id));
  const filtered    = tab === 'Active' ? activeHunts : tab === 'Completed' ? doneHunts : hunts;

  function handleMissionClick(hunt: Hunt) {
    const locked = isPremiumMission(hunt) && !canPremium && !completedIds.includes(hunt.id);
    if (locked) { router.push('/upgrade'); return; }
    router.push(`/hunt/${hunt.id}`);
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 96, background: `radial-gradient(900px 500px at 50% 0%, rgba(39,224,125,.09), transparent 60%), radial-gradient(600px 400px at 90% 80%, rgba(39,224,125,.05), transparent 60%), ${T.bg}`, fontFamily: 'var(--font-onest), var(--font-inter), system-ui, sans-serif', color: T.txt }}>
      <div style={{ maxWidth: 430, margin: '0 auto' }}>

        {/* ── Header ── */}
        <div style={{ padding: '56px 20px 0' }}>

          {/* Trial banner */}
          {subStatus && subStatus.isTrialActive && subStatus.trialDaysLeft <= 3 && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              style={{ borderRadius: 14, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(247,147,26,.08)', border: '1px solid rgba(247,147,26,.2)' }}>
              <span style={{ fontSize: 15 }}>⏳</span>
              <p style={{ margin: 0, fontSize: 12, color: T.amber, fontWeight: 600 }}>
                Trial ends in {subStatus.trialDaysLeft} day{subStatus.trialDaysLeft !== 1 ? 's' : ''}
              </p>
              <button onClick={() => router.push('/upgrade')} style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: T.amber, background: 'rgba(247,147,26,.15)', border: 'none', padding: '4px 10px', borderRadius: 999, cursor: 'pointer' }}>
                Upgrade
              </button>
            </motion.div>
          )}

          {/* Start trial banner (free, never tried) */}
          {subStatus && !subStatus.canAccessPremiumMissions && !subStatus.hasUsedTrial && (
            <motion.button initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              onClick={() => router.push('/upgrade')}
              style={{ width: '100%', borderRadius: 14, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(34,211,238,.06)', border: '1px solid rgba(34,211,238,.15)', cursor: 'pointer', textAlign: 'left' }}>
              <Sparkles size={15} style={{ color: T.ai }} strokeWidth={2} />
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: T.ai }}>Unlock AI + Premium Missions</p>
                <p style={{ margin: 0, fontSize: 11, color: T.dim }}>Start your free 14-day trial</p>
              </div>
              <ChevronRight size={14} style={{ color: T.ai }} strokeWidth={2} />
            </motion.button>
          )}

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
            <div>
              <span style={{ display: 'block', fontSize: 10.5, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: T.dim, marginBottom: 4 }}>X-hunt</span>
              <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, letterSpacing: '-.03em', color: T.txt }}>Missions</h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {streak > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999, background: 'rgba(247,147,26,.12)', border: '1px solid rgba(247,147,26,.22)' }}>
                  <span style={{ fontSize: 13 }}>🔥</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: T.amber }}>{streak}</span>
                </div>
              )}
              <button style={{ width: 40, height: 40, borderRadius: '50%', border: `1px solid ${T.line}`, background: 'rgba(255,255,255,.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <Bell size={17} strokeWidth={1.8} style={{ color: T.muted }} />
              </button>
            </div>
          </div>

          {/* Stats chips */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'Total',  value: hunts.length,       accent: T.txt    },
              { label: 'Active', value: activeHunts.length, accent: T.green  },
              { label: 'Done',   value: doneHunts.length,   accent: T.green2 },
            ].map((s) => (
              <div key={s.label} style={{ borderRadius: 18, padding: '12px 8px', textAlign: 'center', background: 'rgba(255,255,255,.025)', border: `1px solid ${T.line}` }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: s.accent, letterSpacing: '-.02em' }}>{s.value}</div>
                <div style={{ fontSize: 10.5, fontWeight: 600, color: T.dim, marginTop: 2, textTransform: 'uppercase', letterSpacing: '.06em' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 999, background: 'rgba(255,255,255,.04)', border: `1px solid ${T.line}`, marginBottom: 20 }}>
            {TABS.map((t) => {
              const active = tab === t;
              return (
                <button key={t} onClick={() => setTab(t)} style={{ flex: 1, height: 38, borderRadius: 999, border: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700, letterSpacing: '-.01em', transition: 'all .18s ease', ...(active ? { background: `linear-gradient(180deg,#37e589,${T.greenDeep})`, boxShadow: `0 4px 14px ${T.greenGlow}`, color: '#04130b' } : { background: 'transparent', color: T.muted }) }}>
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Mission list ── */}
        <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filtered.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', textAlign: 'center' }}>
              <Target size={44} strokeWidth={1.2} style={{ color: T.dim, marginBottom: 16 }} />
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: T.txt }}>
                {tab === 'Completed' ? 'Nothing completed yet' : 'No missions here'}
              </p>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: T.muted }}>
                {tab === 'Completed' ? 'Finish a mission to see it here.' : 'Check back soon — new missions drop regularly.'}
              </p>
            </div>
          ) : (
            filtered.map((hunt, i) => {
              const done   = completedIds.includes(hunt.id);
              const locked = isPremiumMission(hunt) && !canPremium && !done;
              return (
                <motion.div
                  key={hunt.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.055, duration: 0.28, ease: 'easeOut' }}
                >
                  {locked ? (
                    <div onClick={() => handleMissionClick(hunt)} style={{ cursor: 'pointer' }}>
                      <MissionCard hunt={hunt} done={done} locked={locked} />
                    </div>
                  ) : (
                    <Link href={`/hunt/${hunt.id}`} style={{ display: 'block', textDecoration: 'none' }}>
                      <MissionCard hunt={hunt} done={done} locked={false} />
                    </Link>
                  )}
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
