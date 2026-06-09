'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import HuntCard from '@/components/HuntCard';
import BottomNav from '@/components/BottomNav';
import { MOCK_HUNTS } from '@/lib/mockHunts';
import { loadState, saveState } from '@/lib/store';
import { fetchSupabaseMissions } from '@/lib/supabase/events';
import type { Hunt } from '@/lib/types';

const FILTERS = ['All', 'Easy', 'Medium', 'Hard'];

export default function ExplorePage() {
  const [filter, setFilter] = useState('All');
  const [hunts, setHunts] = useState<Hunt[]>([]);
  const [completedIds, setCompletedIds] = useState<string[]>([]);

  useEffect(() => {
    const state = loadState();
    setCompletedIds(state.completedHunts.map((h) => h.huntId));

    const local = state.hunts.length > 0 ? state.hunts : MOCK_HUNTS;
    setHunts(local);

    void fetchSupabaseMissions().then((remote) => {
      if (remote && remote.length > 0) {
        setHunts(remote);
        const s = loadState();
        saveState({ ...s, hunts: remote });
      }
    });
  }, []);

  const filtered = hunts.filter((h) => {
    if (filter === 'All') return true;
    return h.difficulty === filter.toLowerCase();
  });

  return (
    <div className="min-h-screen pb-24" style={{ background: '#070d0e' }}>
      <div className="max-w-[430px] mx-auto">
        <div
          className="px-5 pt-14 pb-5"
          style={{ background: '#0e1719', borderBottom: '1px solid rgba(255,255,255,.07)' }}
        >
          <h1
            className="text-[24px] font-bold mb-4"
            style={{ color: '#e9eff0', letterSpacing: '-.02em' }}
          >
            Explore
          </h1>

          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {FILTERS.map((f) => {
              const active = filter === f;
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className="flex-shrink-0 px-4 py-2 rounded-full text-[13px] font-semibold transition-all duration-150"
                  style={active ? {
                    background: 'linear-gradient(180deg,#3ee888,#19c268)',
                    color: '#04130b',
                    boxShadow: '0 4px 14px rgba(39,224,125,.32)',
                  } : {
                    background: '#121d20',
                    color: '#7d8b8e',
                    border: '1px solid rgba(255,255,255,.07)',
                  }}
                >
                  {f}
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-5 py-6">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="text-4xl mb-4">🔍</div>
              <p className="text-sm" style={{ color: '#7d8b8e' }}>
                No {filter.toLowerCase()} missions available.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {filtered.map((hunt, i) => (
                <motion.div
                  key={hunt.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.3 }}
                >
                  <HuntCard hunt={hunt} isCompleted={completedIds.includes(hunt.id)} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
