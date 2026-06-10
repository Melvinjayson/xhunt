'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Target, Clock, Zap, Trophy, ChevronRight, CheckCircle2, ShieldCheck, Building2, Lock, Sparkles, Bell } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { loadState, saveState } from '@/lib/store';
import { MOCK_HUNTS, getTagEmoji } from '@/lib/mockHunts';
import type { Hunt } from '@/lib/types';
import { fetchSupabaseMissions } from '@/lib/supabase/events';

const BG = '#050816';
const ACCENT = '#22FFAA', AI = '#6D5DFD', WARN = '#FFB84D', ERR = '#FF5C7A';
const TXT = '#F0F4FF', DIM = '#8B9CC0', FAINT = '#4A5578';
const XGLASS: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.08)' };

const DIFF = {
  easy:   { label: 'Easy',   color: ACCENT, bg: 'rgba(34,255,170,.1)'  },
  medium: { label: 'Medium', color: WARN,   bg: 'rgba(255,184,77,.1)'  },
  hard:   { label: 'Hard',   color: ERR,    bg: 'rgba(255,92,122,.1)'  },
} as const;

const TABS = ['All', 'Active', 'Completed'] as const;
type Tab = typeof TABS[number];

interface SubStatus { canAccessPremiumMissions: boolean; isTrialActive: boolean; trialDaysLeft: number; tier: string; hasUsedTrial: boolean; }
function isPremium(hunt: Hunt) { return hunt.isVerified || !!hunt.tenantName; }

function MissionCard({ hunt, done, locked }: { hunt: Hunt; done: boolean; locked: boolean }) {
  const diff  = DIFF[hunt.difficulty] ?? DIFF.easy;
  const emoji = getTagEmoji(hunt.tags);

  return (
    <motion.div whileTap={{ scale: locked ? 1 : 0.985 }} transition={{ duration: 0.1 }}
      style={{ ...XGLASS, borderRadius: 22, overflow: 'hidden', opacity: done ? 0.6 : locked ? 0.75 : 1, position: 'relative',
        boxShadow: locked ? 'none' : `0 0 32px rgba(34,255,170,0.04)`,
        borderColor: locked ? 'rgba(255,255,255,.05)' : 'rgba(255,255,255,.08)' }}>

      {/* accent bar */}
      <div style={{ height: 2, background: done ? `linear-gradient(90deg,${ACCENT},rgba(34,255,170,0))` : locked ? 'linear-gradient(90deg,rgba(255,255,255,.08),transparent)' : `linear-gradient(90deg,${ACCENT},rgba(34,255,170,0))` }} />

      <div style={{ padding: '16px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, flexShrink: 0, background: locked ? 'rgba(255,255,255,.04)' : 'rgba(34,255,170,.1)', border: `1px solid ${locked ? 'rgba(255,255,255,.07)' : 'rgba(34,255,170,.18)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
            {locked ? <Lock size={18} style={{ color: FAINT }} strokeWidth={2} /> : emoji}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {done && <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: ACCENT, background: 'rgba(34,255,170,.1)', padding: '2px 8px', borderRadius: 999, marginBottom: 4 }}><CheckCircle2 size={10} strokeWidth={2.5} />Completed</div>}
            {locked && <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: AI, background: 'rgba(109,93,253,.1)', padding: '2px 8px', borderRadius: 999, marginBottom: 4 }}><Sparkles size={10} strokeWidth={2.5} />Premium</div>}
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, lineHeight: 1.3, color: TXT, letterSpacing: '-.01em' }}>{hunt.title}</h3>
          </div>
          <ChevronRight size={15} strokeWidth={2} style={{ color: FAINT, flexShrink: 0, marginTop: 2 }} />
        </div>

        <p style={{ margin: '0 0 12px', fontSize: 13, lineHeight: 1.5, color: DIM, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{hunt.story_context}</p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {hunt.tags.slice(0, 3).map((tag) => (
            <span key={tag} style={{ fontSize: 10.5, fontWeight: 500, color: DIM, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)', padding: '2px 10px', borderRadius: 999 }}>{tag}</span>
          ))}
        </div>

        {(hunt.tenantName || hunt.isVerified) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            {hunt.tenantName && <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              {hunt.tenantLogo ? <img src={hunt.tenantLogo} alt={hunt.tenantName} style={{ width: 16, height: 16, borderRadius: 4 }} /> : <Building2 size={10} strokeWidth={2} style={{ color: FAINT }} />}
              <span style={{ fontSize: 11, fontWeight: 600, color: FAINT }}>{hunt.tenantName}</span>
            </div>}
            {hunt.isVerified && <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginLeft: hunt.tenantName ? 'auto' : 0 }}>
              <ShieldCheck size={11} strokeWidth={2.5} style={{ color: ACCENT }} />
              <span style={{ fontSize: 10, fontWeight: 800, color: ACCENT, letterSpacing: '.05em', textTransform: 'uppercase' }}>Verified</span>
            </div>}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Clock size={12} strokeWidth={2} style={{ color: FAINT }} />
            <span style={{ fontSize: 12, fontWeight: 500, color: DIM }}>{hunt.estimated_time}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 999, background: diff.bg }}>
            <Zap size={10} strokeWidth={2.5} style={{ color: diff.color }} />
            <span style={{ fontSize: 10.5, fontWeight: 700, color: diff.color }}>{diff.label}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginLeft: 'auto' }}>
            <Trophy size={12} strokeWidth={2} style={{ color: ACCENT }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: ACCENT, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hunt.reward.split('+')[0].trim()}</span>
          </div>
        </div>
      </div>

      {!done ? (
        <div style={{ padding: '12px 16px 16px' }}>
          {locked ? (
            <div style={{ width: '100%', height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'rgba(109,93,253,.08)', border: '1px solid rgba(109,93,253,.2)', color: AI, fontSize: 13, fontWeight: 700 }}>
              <Sparkles size={14} strokeWidth={2.5} /> Unlock with Trial
            </div>
          ) : (
            <div style={{ width: '100%', height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: ACCENT, boxShadow: `0 0 28px rgba(34,255,170,.35)`, color: '#050816', fontSize: 14, fontWeight: 800 }}>
              <Target size={15} strokeWidth={2.5} /> Start Mission
            </div>
          )}
        </div>
      ) : <div style={{ height: 16 }} />}
    </motion.div>
  );
}

export default function MissionsPage() {
  const router = useRouter();
  const [hunts, setHunts]       = useState<Hunt[]>([]);
  const [completedIds, setIds]  = useState<string[]>([]);
  const [streak, setStreak]     = useState(0);
  const [tab, setTab]           = useState<Tab>('All');
  const [mounted, setMounted]   = useState(false);
  const [subStatus, setSub]     = useState<SubStatus | null>(null);

  useEffect(() => {
    const state = loadState();
    if (!state.user?.onboardingComplete) { router.replace('/'); return; }
    setIds(state.completedHunts.map((h) => h.huntId));
    setStreak(state.streak);
    setHunts(state.hunts.length > 0 ? state.hunts : MOCK_HUNTS);
    setMounted(true);
    void fetch('/api/subscription/status').then((r) => r.json()).then((d: SubStatus) => setSub(d)).catch(() => setSub({ canAccessPremiumMissions: false, isTrialActive: false, trialDaysLeft: 0, tier: 'free', hasUsedTrial: false }));
    void fetchSupabaseMissions().then((r) => { if (r?.length) { setHunts(r); const s = loadState(); saveState({ ...s, hunts: r }); } });
  }, [router]);

  if (!mounted) return null;

  const canPremium  = subStatus?.canAccessPremiumMissions ?? false;
  const activeHunts = hunts.filter((h) => !completedIds.includes(h.id));
  const doneHunts   = hunts.filter((h) =>  completedIds.includes(h.id));
  const filtered    = tab === 'Active' ? activeHunts : tab === 'Completed' ? doneHunts : hunts;

  function handleClick(hunt: Hunt) {
    const locked = isPremium(hunt) && !canPremium && !completedIds.includes(hunt.id);
    router.push(locked ? '/upgrade' : `/hunt/${hunt.id}`);
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 100, background: `radial-gradient(800px 500px at 50% 0%, rgba(34,255,170,.07) 0%, transparent 60%), ${BG}`, color: TXT }}>
      <div style={{ maxWidth: 430, margin: '0 auto' }}>

        {/* ── Header ── */}
        <div style={{ padding: '56px 20px 0' }}>

          {/* Trial expiring */}
          {subStatus?.isTrialActive && subStatus.trialDaysLeft <= 3 && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              style={{ borderRadius: 14, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, background: `rgba(255,184,77,.08)`, border: `1px solid rgba(255,184,77,.2)` }}>
              <span style={{ fontSize: 14 }}>⏳</span>
              <p style={{ margin: 0, fontSize: 12, color: WARN, fontWeight: 600 }}>Trial ends in {subStatus.trialDaysLeft} day{subStatus.trialDaysLeft !== 1 ? 's' : ''}</p>
              <button onClick={() => router.push('/upgrade')} style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: WARN, background: `rgba(255,184,77,.15)`, border: 'none', padding: '4px 10px', borderRadius: 999, cursor: 'pointer' }}>Upgrade</button>
            </motion.div>
          )}

          {/* Start trial */}
          {subStatus && !subStatus.canAccessPremiumMissions && !subStatus.hasUsedTrial && (
            <motion.button initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} onClick={() => router.push('/upgrade')}
              style={{ width: '100%', borderRadius: 14, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, background: `rgba(109,93,253,.08)`, border: `1px solid rgba(109,93,253,.2)`, cursor: 'pointer', textAlign: 'left' }}>
              <Sparkles size={15} style={{ color: AI }} strokeWidth={2} />
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: AI }}>Unlock AI + Premium Missions</p>
                <p style={{ margin: 0, fontSize: 11, color: FAINT }}>Start your free 14-day trial</p>
              </div>
              <ChevronRight size={14} style={{ color: AI }} strokeWidth={2} />
            </motion.button>
          )}

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
            <div>
              <span style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: FAINT, marginBottom: 4 }}>X-hunt</span>
              <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, letterSpacing: '-.03em', color: TXT }}>Missions</h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {streak > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 999, background: `rgba(255,184,77,.1)`, border: `1px solid rgba(255,184,77,.2)` }}>
                  <span style={{ fontSize: 13 }}>🔥</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: WARN }}>{streak}</span>
                </div>
              )}
              <button style={{ width: 40, height: 40, borderRadius: 12, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <Bell size={17} strokeWidth={1.8} style={{ color: DIM }} />
              </button>
            </div>
          </div>

          {/* Stats chips */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'Total',  value: hunts.length,       accent: TXT    },
              { label: 'Active', value: activeHunts.length, accent: ACCENT },
              { label: 'Done',   value: doneHunts.length,   accent: ACCENT },
            ].map((s) => (
              <div key={s.label} style={{ ...XGLASS, borderRadius: 16, padding: '12px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: s.accent, letterSpacing: '-.02em' }}>{s.value}</div>
                <div style={{ fontSize: 10, fontWeight: 600, color: FAINT, marginTop: 2, textTransform: 'uppercase', letterSpacing: '.06em' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 999, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)', marginBottom: 20 }}>
            {TABS.map((t) => {
              const active = tab === t;
              return (
                <button key={t} onClick={() => setTab(t)} style={{ flex: 1, height: 38, borderRadius: 999, border: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700, letterSpacing: '-.01em', transition: 'all .18s', ...(active ? { background: ACCENT, boxShadow: `0 0 20px rgba(34,255,170,.35)`, color: '#050816' } : { background: 'transparent', color: DIM }) }}>
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Mission list ── */}
        <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 0', textAlign: 'center' }}>
              <Target size={44} strokeWidth={1.2} style={{ color: FAINT, marginBottom: 16 }} />
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: TXT }}>{tab === 'Completed' ? 'Nothing completed yet' : 'No missions here'}</p>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: DIM }}>{tab === 'Completed' ? 'Finish a mission to see it here.' : 'Check back soon.'}</p>
            </div>
          ) : (
            filtered.map((hunt, i) => {
              const done   = completedIds.includes(hunt.id);
              const locked = isPremium(hunt) && !canPremium && !done;
              return (
                <motion.div key={hunt.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.055, duration: 0.28 }}>
                  <div onClick={() => handleClick(hunt)} style={{ cursor: 'pointer' }}>
                    <MissionCard hunt={hunt} done={done} locked={locked} />
                  </div>
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
