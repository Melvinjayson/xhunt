'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Trophy, Share2, ArrowRight, Home } from 'lucide-react';
import { loadState } from '@/lib/store';
import { MOCK_HUNTS, getTagGradient } from '@/lib/mockHunts';
import type { Hunt } from '@/lib/types';
import { cn } from '@/lib/cn';
import { emitEvent, emitRewardClaimed } from '@/lib/supabase/events';

const CONFETTI_COLORS = ['#00e676', '#22d3ee', '#fbbf24', '#a78bfa', '#f472b6', '#60a5fa'];

function ConfettiPiece({ delay, x }: { delay: number; x: number }) {
  const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
  return (
    <motion.div
      className="absolute top-0 w-2 h-3 rounded-sm"
      style={{ left: `${x}%`, backgroundColor: color }}
      initial={{ y: -20, opacity: 1, rotate: 0 }}
      animate={{
        y: ['0%', '120vh'],
        opacity: [1, 1, 0],
        rotate: [0, 360 * (Math.random() > 0.5 ? 1 : -1)],
        x: [(Math.random() - 0.5) * 100],
      }}
      transition={{
        duration: 2.5 + Math.random(),
        delay,
        ease: 'easeIn',
      }}
    />
  );
}

export default function CompletePage() {
  const params = useParams();
  const router = useRouter();
  const huntId = params?.id as string;

  const [hunt, setHunt] = useState<Hunt | null>(null);
  const [completedAt, setCompletedAt] = useState<string>('');
  const [stepsCompleted, setStepsCompleted] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    const state = loadState();
    const allHunts = state.hunts.length > 0 ? [...state.hunts, ...MOCK_HUNTS] : MOCK_HUNTS;
    const found = allHunts.find((h) => h.id === huntId);

    if (found) {
      setHunt(found);
      const prog = state.progress[huntId];
      if (prog) {
        setStepsCompleted(prog.completedSteps.length);
        setCompletedAt(prog.completedAt || new Date().toISOString());
      }
      emitEvent('mission_completed', { missionId: huntId });
      emitRewardClaimed(huntId, found.reward);
    }
    setMounted(true);
    setTimeout(() => setShowConfetti(true), 100);
  }, [huntId]);

  if (!mounted || !hunt) return null;

  const gradient = getTagGradient(hunt.tags);
  const completionDate = new Date(completedAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `I completed "${hunt!.title}" on X-hunt!`,
          text: `Just finished the ${hunt!.title} hunt and earned: ${hunt!.reward} 🏆`,
        });
      } catch {}
    }
  }

  return (
    <div className="min-h-screen bg-[#080c14] flex flex-col overflow-hidden">
      {/* Confetti */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {Array.from({ length: 40 }).map((_, i) => (
            <ConfettiPiece key={i} delay={i * 0.04} x={(i / 40) * 100} />
          ))}
        </div>
      )}

      <div className="max-w-[430px] mx-auto w-full flex flex-col min-h-screen px-5">
        {/* Hero celebration */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 18, stiffness: 200, delay: 0.2 }}
          className="flex flex-col items-center pt-20 pb-8"
        >
          <div
            className={cn(
              'w-24 h-24 rounded-full bg-gradient-to-br flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(0,230,118,0.3)]',
              gradient
            )}
          >
            <span className="text-4xl">🏆</span>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="text-center"
          >
            <p className="text-accent font-bold text-sm uppercase tracking-widest mb-2">
              Hunt Complete!
            </p>
            <h1 className="text-[26px] font-bold text-[#e8f0fe] leading-tight mb-2">
              {hunt.title}
            </h1>
            <p className="text-[#7a8fa8] text-sm">{completionDate}</p>
          </motion.div>
        </motion.div>

        {/* Reward */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.4 }}
          className="bg-[#1a1200] border border-[#2a2000] rounded-2xl p-5 mb-6"
        >
          <p className="text-[11px] font-bold text-[#fbbf24] uppercase tracking-wider mb-3">
            Your Reward
          </p>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-[#2a2000] rounded-2xl flex items-center justify-center flex-shrink-0">
              <Trophy size={28} className="text-[#fbbf24]" strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-[17px] font-bold text-[#e8f0fe] leading-snug">{hunt.reward}</p>
              <p className="text-[13px] text-[#7a8fa8] mt-0.5">Added to your profile</p>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.4 }}
          className="grid grid-cols-2 gap-3 mb-8"
        >
          <div className="bg-[#111927] rounded-2xl p-4 text-center border border-[#1c2a3a]">
            <p className="text-2xl font-bold text-accent">{stepsCompleted}</p>
            <p className="text-[12px] text-[#7a8fa8] font-medium mt-1">Steps Completed</p>
          </div>
          <div className="bg-[#111927] rounded-2xl p-4 text-center border border-[#1c2a3a]">
            <p className="text-2xl font-bold text-[#e8f0fe]">{hunt.estimated_time}</p>
            <p className="text-[12px] text-[#7a8fa8] font-medium mt-1">Time Well Spent</p>
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.95, duration: 0.4 }}
          className="flex flex-col gap-3 pb-12"
        >
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleShare}
              className="w-full h-14 bg-[#111927] border border-[#1c2a3a] rounded-2xl font-semibold text-[#e8f0fe] flex items-center justify-center gap-2"
            >
              <Share2 size={18} strokeWidth={2} />
              Share Achievement
            </motion.button>
          )}

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push('/home')}
            className="w-full h-14 bg-accent text-[#060a0e] rounded-2xl font-bold text-base shadow-[0_4px_24px_rgba(0,230,118,0.4)] flex items-center justify-center gap-2"
          >
            <Home size={18} strokeWidth={2} />
            Back to Hunts
            <ArrowRight size={18} strokeWidth={2.5} />
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}
