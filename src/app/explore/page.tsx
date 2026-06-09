'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import HuntCard from '@/components/HuntCard';
import BottomNav from '@/components/BottomNav';
import { MOCK_HUNTS } from '@/lib/mockHunts';
import { loadState } from '@/lib/store';
import { cn } from '@/lib/cn';

const FILTERS = ['All', 'Easy', 'Medium', 'Hard'];

export default function ExplorePage() {
  const [filter, setFilter] = useState('All');
  const [completedIds, setCompletedIds] = useState<string[]>([]);

  useEffect(() => {
    const state = loadState();
    setCompletedIds(state.completedHunts.map((h) => h.huntId));
  }, []);

  const filtered = MOCK_HUNTS.filter((h) => {
    if (filter === 'All') return true;
    return h.difficulty === filter.toLowerCase();
  });

  return (
    <div className="min-h-screen bg-[#080c14] pb-24">
      <div className="max-w-[430px] mx-auto">
        {/* Header */}
        <div className="bg-[#0f1824] px-5 pt-14 pb-5 border-b border-[#1c2a3a]">
          <h1 className="text-[24px] font-bold text-[#e8f0fe] mb-4">Explore</h1>

          {/* Filters */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'flex-shrink-0 px-4 py-2 rounded-full text-[13px] font-semibold transition-all duration-150',
                  filter === f
                    ? 'bg-accent text-[#060a0e] shadow-[0_2px_12px_rgba(0,230,118,0.35)]'
                    : 'bg-[#111927] text-[#7a8fa8] border border-[#1c2a3a]'
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="px-5 py-6">
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
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
