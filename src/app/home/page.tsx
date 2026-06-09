'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Flame, Sparkles, X, ArrowRight } from 'lucide-react';
import HuntCard from '@/components/HuntCard';
import BottomNav from '@/components/BottomNav';
import { loadState, saveState } from '@/lib/store';
import { MOCK_HUNTS } from '@/lib/mockHunts';
import type { Hunt } from '@/lib/types';
import { fetchSupabaseMissions } from '@/lib/supabase/events';

interface SubStatus { tier: string; isTrialActive: boolean; trialDaysLeft: number; hasUsedTrial: boolean; canUseAI: boolean; }

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning, Explorer.';
  if (hour < 17) return 'Good afternoon, Explorer.';
  return 'Good evening, Explorer.';
}

export default function HomePage() {
  const router = useRouter();
  const [hunts, setHunts]             = useState<Hunt[]>([]);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [streak, setStreak]           = useState(0);
  const [mounted, setMounted]         = useState(false);
  const [subStatus, setSubStatus]     = useState<SubStatus | null>(null);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);

  useEffect(() => {
    const state = loadState();
    if (!state.user?.onboardingComplete) {
      router.replace('/');
      return;
    }

    setCompletedIds(state.completedHunts.map((h) => h.huntId));
    setStreak(state.streak);

    const localHunts = state.hunts.length > 0 ? state.hunts : MOCK_HUNTS;
    setHunts(localHunts);
    setMounted(true);

    void fetchSupabaseMissions().then((remote) => {
      if (remote && remote.length > 0) {
        setHunts(remote);
        const s = loadState();
        saveState({ ...s, hunts: remote });
      }
    });

    void fetch('/api/subscription/status')
      .then((r) => r.json())
      .then((d: SubStatus) => setSubStatus(d))
      .catch(() => {});
  }, [router]);

  if (!mounted) return null;

  const activeHunts = hunts.filter((h) => !completedIds.includes(h.id));
  const doneHunts = hunts.filter((h) => completedIds.includes(h.id));

  return (
    <div className="min-h-screen pb-24" style={{ background: '#070d0e' }}>
      <div className="max-w-[430px] mx-auto">
        {/* Header */}
        <div
          className="px-5 pt-14 pb-5"
          style={{ background: '#0e1719', borderBottom: '1px solid rgba(255,255,255,.07)' }}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm font-medium" style={{ color: '#7d8b8e' }}>{getGreeting()}</p>
              <h1 className="text-[24px] font-bold mt-0.5" style={{ color: '#e9eff0', letterSpacing: '-.02em' }}>
                Your Hunts
              </h1>
            </div>
            <div className="flex items-center gap-3">
              {streak > 0 && (
                <div
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full"
                  style={{ background: 'rgba(247,147,26,.12)', border: '1px solid rgba(247,147,26,.2)' }}
                >
                  <Flame size={14} style={{ color: '#f7931a' }} strokeWidth={2} />
                  <span className="text-xs font-bold" style={{ color: '#f7931a' }}>{streak}</span>
                </div>
              )}
              <button
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.07)' }}
              >
                <Bell size={17} strokeWidth={1.8} style={{ color: '#7d8b8e' }} />
              </button>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Available', value: activeHunts.length, color: '#27e07d' },
              { label: 'Completed', value: doneHunts.length,   color: '#34d98a' },
              { label: 'Streak',    value: `${streak}d`,       color: '#f7931a' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl p-3 text-center"
                style={{ background: '#121d20', border: '1px solid rgba(255,255,255,.07)' }}
              >
                <p className="text-xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
                <p className="text-[11px] font-medium mt-0.5" style={{ color: '#54625f' }}>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Trial nudge */}
        <AnimatePresence>
          {subStatus && !subStatus.canUseAI && !subStatus.hasUsedTrial && !nudgeDismissed && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0, marginTop: 0 }}
              className="mx-5 mt-4 rounded-2xl overflow-hidden"
              style={{ border: '1px solid rgba(34,211,238,.18)', background: 'rgba(34,211,238,.05)' }}
            >
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: 'rgba(34,211,238,.12)' }}>
                  <Sparkles size={15} strokeWidth={2} style={{ color: '#22d3ee' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold" style={{ color: '#e9eff0' }}>Unlock AI + Premium Missions</p>
                  <p className="text-[11px]" style={{ color: '#54625f' }}>14-day free trial — no card required</p>
                </div>
                <button onClick={() => router.push('/upgrade')} className="flex items-center gap-1 flex-shrink-0" style={{ fontSize: 12, fontWeight: 700, color: '#22d3ee' }}>
                  Try free <ArrowRight size={12} strokeWidth={2.5} />
                </button>
                <button onClick={() => setNudgeDismissed(true)} className="flex-shrink-0 ml-1" style={{ background: 'none', border: 0, cursor: 'pointer', padding: 2 }}>
                  <X size={14} strokeWidth={2} style={{ color: '#54625f' }} />
                </button>
              </div>
            </motion.div>
          )}
          {subStatus?.isTrialActive && subStatus.trialDaysLeft <= 3 && !nudgeDismissed && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}
              className="mx-5 mt-4 rounded-2xl overflow-hidden"
              style={{ border: '1px solid rgba(247,147,26,.22)', background: 'rgba(247,147,26,.07)' }}
            >
              <div className="flex items-center gap-3 px-4 py-3">
                <span className="text-base flex-shrink-0">⏳</span>
                <p className="flex-1 text-[12px] font-semibold" style={{ color: '#f7931a' }}>
                  Trial ends in {subStatus.trialDaysLeft} day{subStatus.trialDaysLeft !== 1 ? 's' : ''}
                </p>
                <button onClick={() => router.push('/upgrade')} style={{ fontSize: 11, fontWeight: 700, color: '#f7931a', background: 'rgba(247,147,26,.15)', border: 'none', padding: '4px 10px', borderRadius: 999, cursor: 'pointer', flexShrink: 0 }}>
                  Upgrade
                </button>
                <button onClick={() => setNudgeDismissed(true)} style={{ background: 'none', border: 0, cursor: 'pointer', padding: 2, marginLeft: 2 }}>
                  <X size={14} strokeWidth={2} style={{ color: '#54625f' }} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Feed */}
        <div className="px-5 py-6">
          {activeHunts.length > 0 && (
            <section className="mb-8">
              <h2 className="text-[17px] font-bold mb-4" style={{ color: '#e9eff0' }}>Ready to explore</h2>
              <div className="flex flex-col gap-4">
                {activeHunts.map((hunt, i) => (
                  <motion.div
                    key={hunt.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07, duration: 0.3 }}
                  >
                    <HuntCard hunt={hunt} />
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {doneHunts.length > 0 && (
            <section>
              <h2 className="text-[17px] font-bold mb-4" style={{ color: '#e9eff0' }}>Completed</h2>
              <div className="flex flex-col gap-4">
                {doneHunts.map((hunt, i) => (
                  <motion.div
                    key={hunt.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07, duration: 0.3 }}
                  >
                    <HuntCard hunt={hunt} isCompleted />
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {hunts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="text-5xl mb-4">🔍</div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: '#e9eff0' }}>No hunts yet</h3>
              <p className="text-sm" style={{ color: '#7d8b8e' }}>Pull to refresh or check back soon.</p>
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
