'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Bell, Flame } from 'lucide-react';
import HuntCard from '@/components/HuntCard';
import BottomNav from '@/components/BottomNav';
import { loadState } from '@/lib/store';
import { MOCK_HUNTS } from '@/lib/mockHunts';
import type { Hunt } from '@/lib/types';
import { fetchSupabaseMissions } from '@/lib/supabase/events';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning, Explorer.';
  if (hour < 17) return 'Good afternoon, Explorer.';
  return 'Good evening, Explorer.';
}

export default function HomePage() {
  const router = useRouter();
  const [hunts, setHunts] = useState<Hunt[]>([]);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [streak, setStreak] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const state = loadState();
    if (!state.user?.onboardingComplete) {
      router.replace('/');
      return;
    }

    setCompletedIds(state.completedHunts.map((h) => h.huntId));
    setStreak(state.streak);

    // Show mocks immediately, then replace with Supabase missions once loaded
    const localHunts = state.hunts.length > 0 ? state.hunts : MOCK_HUNTS;
    setHunts(localHunts);
    setMounted(true);

    void fetchSupabaseMissions().then((remote) => {
      if (remote && remote.length > 0) {
        // When Supabase has missions, show only those — no mock mixing
        setHunts(remote);
      }
      // If Supabase is not configured or has no missions, mocks remain shown
    });
  }, [router]);

  if (!mounted) return null;

  const activeHunts = hunts.filter((h) => !completedIds.includes(h.id));
  const doneHunts = hunts.filter((h) => completedIds.includes(h.id));

  return (
    <div className="min-h-screen bg-[#080c14] pb-24">
      <div className="max-w-[430px] mx-auto">
        {/* Header */}
        <div className="bg-[#0f1824] px-5 pt-14 pb-5 border-b border-[#1c2a3a]">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[#7a8fa8] text-sm font-medium">{getGreeting()}</p>
              <h1 className="text-[24px] font-bold text-[#e8f0fe] mt-0.5">Your Hunts</h1>
            </div>
            <div className="flex items-center gap-3">
              {streak > 0 && (
                <div className="flex items-center gap-1 bg-[#2a1a00] px-3 py-1.5 rounded-full">
                  <Flame size={14} className="text-[#fbbf24]" strokeWidth={2} />
                  <span className="text-xs font-bold text-[#fbbf24]">{streak}</span>
                </div>
              )}
              <button className="w-9 h-9 bg-[#162030] rounded-full flex items-center justify-center border border-[#1c2a3a]">
                <Bell size={17} strokeWidth={1.8} className="text-[#7a8fa8]" />
              </button>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Available', value: activeHunts.length, color: 'text-accent' },
              { label: 'Completed', value: doneHunts.length, color: 'text-[#00e676]' },
              { label: 'Streak', value: `${streak}d`, color: 'text-[#fbbf24]' },
            ].map((stat) => (
              <div key={stat.label} className="bg-[#111927] rounded-xl p-3 text-center border border-[#1c2a3a]">
                <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-[11px] text-[#3d5068] font-medium mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Feed */}
        <div className="px-5 py-6">
          {activeHunts.length > 0 && (
            <section className="mb-8">
              <h2 className="text-[17px] font-bold text-[#e8f0fe] mb-4">Ready to explore</h2>
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
              <h2 className="text-[17px] font-bold text-[#e8f0fe] mb-4">Completed</h2>
              <div className="flex flex-col gap-4">
                {doneHunts.map((hunt, i) => (
                  <motion.div
                    key={hunt.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07, duration: 0.3 }}
                    className="opacity-60"
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
              <h3 className="text-lg font-semibold text-[#e8f0fe] mb-2">No hunts yet</h3>
              <p className="text-[#7a8fa8] text-sm">Pull to refresh or check back soon.</p>
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
