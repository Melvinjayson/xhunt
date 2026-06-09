'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, Zap, Trophy, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/cn';
import { loadState } from '@/lib/store';
import { MOCK_HUNTS, getTagGradient, getTagEmoji } from '@/lib/mockHunts';
import type { Hunt } from '@/lib/types';

const DIFFICULTY_BADGE: Record<string, string> = {
  easy: 'bg-[#002918] text-[#00e676]',
  medium: 'bg-[#2a1a00] text-[#fbbf24]',
  hard: 'bg-[#2a0a0a] text-[#ff5252]',
};

const STEP_TYPE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  action: { bg: 'bg-[#1a0f00]', text: 'text-[#fb923c]', label: 'Action' },
  reflection: { bg: 'bg-[#0f0f2a]', text: 'text-[#818cf8]', label: 'Reflection' },
  discovery: { bg: 'bg-[#001a1a]', text: 'text-[#2dd4bf]', label: 'Discovery' },
};

export default function HuntDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [hunt, setHunt] = useState<Hunt | null>(null);
  const [stepsExpanded, setStepsExpanded] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [mounted, setMounted] = useState(false);

  const huntId = params?.id as string;

  useEffect(() => {
    const state = loadState();
    const allHunts = state.hunts.length > 0 ? [...state.hunts, ...MOCK_HUNTS] : MOCK_HUNTS;
    const found = allHunts.find((h) => h.id === huntId);
    if (found) {
      setHunt(found);
      setIsCompleted(state.completedHunts.some((c) => c.huntId === huntId));
    }
    setMounted(true);
  }, [huntId]);

  if (!mounted) return null;
  if (!hunt) {
    return (
      <div className="min-h-screen bg-[#080c14] flex items-center justify-center">
        <p className="text-[#7a8fa8]">Hunt not found.</p>
      </div>
    );
  }

  const gradient = getTagGradient(hunt.tags);
  const emoji = getTagEmoji(hunt.tags);

  function handleStart() {
    router.push(`/active/${hunt!.id}`);
  }

  return (
    <div className="min-h-screen bg-[#080c14]">
      <div className="max-w-[430px] mx-auto">
        {/* Hero */}
        <div className={cn('relative bg-gradient-to-br h-72', gradient)}>
          <div className="absolute inset-0 bg-black/30" />

          {/* Back button */}
          <button
            onClick={() => router.back()}
            className="absolute top-12 left-5 z-10 w-9 h-9 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/10"
          >
            <ArrowLeft size={18} strokeWidth={2} className="text-white" />
          </button>

          {/* Hero content */}
          <div className="absolute bottom-6 left-5 right-5 z-10">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-3xl">{emoji}</span>
              <div className="flex flex-wrap gap-1.5">
                {hunt.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="bg-black/35 backdrop-blur-sm text-white text-[11px] font-medium px-2.5 py-1 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <h1 className="text-[26px] font-bold text-white leading-tight">{hunt.title}</h1>
          </div>
        </div>

        {/* Content */}
        <div className="px-5 py-6 pb-32">
          {/* Stats row */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center gap-2 bg-[#111927] rounded-xl px-3 py-2.5 flex-1 justify-center border border-[#1c2a3a]">
              <Clock size={14} strokeWidth={2} className="text-[#7a8fa8]" />
              <span className="text-sm font-semibold text-[#e8f0fe]">{hunt.estimated_time}</span>
            </div>
            <div className="flex items-center gap-2 bg-[#111927] rounded-xl px-3 py-2.5 flex-1 justify-center border border-[#1c2a3a]">
              <Zap size={14} strokeWidth={2} className="text-[#7a8fa8]" />
              <span
                className={cn(
                  'text-sm font-semibold',
                  DIFFICULTY_BADGE[hunt.difficulty]
                    .split(' ')
                    .filter((c) => c.startsWith('text-'))
                    .join(' ')
                )}
              >
                {hunt.difficulty.charAt(0).toUpperCase() + hunt.difficulty.slice(1)}
              </span>
            </div>
            <div className="flex items-center gap-2 bg-[#111927] rounded-xl px-3 py-2.5 flex-1 justify-center border border-[#1c2a3a]">
              <span className="text-sm text-[#7a8fa8]">{hunt.steps.length}</span>
              <span className="text-sm font-semibold text-[#e8f0fe]">Steps</span>
            </div>
          </div>

          {/* Story */}
          <section className="mb-6">
            <h2 className="text-[13px] font-bold text-[#3d5068] uppercase tracking-widest mb-3">
              The Story
            </h2>
            <p className="text-[16px] text-[#c8d8ee] leading-relaxed">{hunt.story_context}</p>
          </section>

          {/* Reward */}
          <section className="mb-6">
            <div className="bg-[#1a1200] border border-[#2a2000] rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-[#2a2000] rounded-xl flex items-center justify-center flex-shrink-0">
                <Trophy size={20} className="text-[#fbbf24]" strokeWidth={2} />
              </div>
              <div>
                <p className="text-[11px] font-bold text-[#fbbf24] uppercase tracking-wider mb-0.5">
                  Reward
                </p>
                <p className="text-[14px] font-semibold text-[#e8f0fe]">{hunt.reward}</p>
              </div>
            </div>
          </section>

          {/* Steps preview */}
          <section className="mb-8">
            <button
              onClick={() => setStepsExpanded(!stepsExpanded)}
              className="w-full flex items-center justify-between mb-3"
            >
              <h2 className="text-[13px] font-bold text-[#3d5068] uppercase tracking-widest">
                Your Journey ({hunt.steps.length} steps)
              </h2>
              {stepsExpanded ? (
                <ChevronUp size={18} className="text-[#3d5068]" />
              ) : (
                <ChevronDown size={18} className="text-[#3d5068]" />
              )}
            </button>

            {!stepsExpanded && (
              <div className="flex flex-col gap-2">
                {hunt.steps.slice(0, 2).map((step, i) => {
                  const typeStyle = STEP_TYPE_COLORS[step.type];
                  return (
                    <div key={step.id} className="flex items-start gap-3 p-3 bg-[#111927] rounded-xl border border-[#1c2a3a]">
                      <div className="w-6 h-6 bg-[#162030] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-[11px] font-bold text-[#7a8fa8]">{i + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={cn('text-[10px] font-bold uppercase tracking-wider', typeStyle.text)}>
                          {typeStyle.label}
                        </span>
                        <p className="text-[13px] text-[#c8d8ee] mt-0.5 line-clamp-2">
                          {step.instruction}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {hunt.steps.length > 2 && (
                  <button
                    onClick={() => setStepsExpanded(true)}
                    className="text-[13px] text-accent font-medium text-center py-2"
                  >
                    +{hunt.steps.length - 2} more steps
                  </button>
                )}
              </div>
            )}

            {stepsExpanded && (
              <div className="flex flex-col gap-2">
                {hunt.steps.map((step, i) => {
                  const typeStyle = STEP_TYPE_COLORS[step.type];
                  return (
                    <div key={step.id} className="flex items-start gap-3 p-3 bg-[#111927] rounded-xl border border-[#1c2a3a]">
                      <div className="w-6 h-6 bg-[#162030] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-[11px] font-bold text-[#7a8fa8]">{i + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={cn('text-[10px] font-bold uppercase tracking-wider', typeStyle.text)}>
                          {typeStyle.label}
                        </span>
                        <p className="text-[13px] text-[#c8d8ee] mt-0.5">{step.instruction}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Sticky CTA */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0f1824] border-t border-[#1c2a3a] px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
          <div className="max-w-[430px] mx-auto">
            {isCompleted ? (
              <div className="flex items-center justify-center gap-2 h-14 bg-[#002918] rounded-2xl border border-[#004d2a]">
                <span className="text-accent font-semibold">Hunt Completed ✓</span>
              </div>
            ) : (
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleStart}
                className="w-full h-14 bg-accent text-[#060a0e] rounded-2xl font-bold text-base shadow-[0_4px_24px_rgba(0,230,118,0.4)] flex items-center justify-center gap-2"
              >
                Start Hunt
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
