'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { loadState, saveState } from '@/lib/store';

const INTERESTS = [
  { id: 'adventure', label: 'Adventure', emoji: '🌍' },
  { id: 'food', label: 'Food & Drink', emoji: '🍴' },
  { id: 'art', label: 'Art & Culture', emoji: '🎨' },
  { id: 'tech', label: 'Tech & Innovation', emoji: '💻' },
  { id: 'fitness', label: 'Fitness & Health', emoji: '💪' },
  { id: 'mindfulness', label: 'Mindfulness', emoji: '🧘' },
  { id: 'social', label: 'Social & Community', emoji: '👥' },
  { id: 'learning', label: 'Learning & Skills', emoji: '📚' },
];

const GOALS = [
  { id: 'explore', label: 'Explore new things', emoji: '🔍', desc: "Discover what you've been missing" },
  { id: 'habits', label: 'Build better habits', emoji: '🔄', desc: 'Small steps, real change' },
  { id: 'challenge', label: 'Challenge myself', emoji: '⚡', desc: 'Push past comfort zones' },
  { id: 'discover', label: 'Discover hidden gems', emoji: '🗺️', desc: "Uncover your city's secrets" },
  { id: 'connect', label: 'Connect with others', emoji: '🤝', desc: 'Meaningful human moments' },
];

const pageVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.2 } },
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [interests, setInterests] = useState<string[]>([]);
  const [goal, setGoal] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const state = loadState();
    if (state.user?.onboardingComplete) {
      router.replace('/home');
    }
  }, [router]);

  if (!mounted) return null;

  function toggleInterest(id: string) {
    setInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  async function handleComplete() {
    if (!goal) return;
    setStep(3);
    setIsGenerating(true);

    try {
      const res = await fetch('/api/generate-hunts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interests, goals: [goal] }),
      });
      const data = await res.json();

      const state = loadState();
      saveState({
        ...state,
        user: {
          interests,
          goals: [goal],
          onboardingComplete: true,
        },
        hunts: data.hunts ?? [],
      });
    } catch {
      const state = loadState();
      saveState({
        ...state,
        user: { interests, goals: [goal], onboardingComplete: true },
        hunts: [],
      });
    } finally {
      setIsGenerating(false);
      router.push('/home');
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#070d0e' }}>
      <div className="max-w-[430px] mx-auto w-full min-h-screen flex flex-col">
        {/* Step indicator */}
        {step < 3 && (
          <div className="flex justify-center gap-2 pt-14 pb-2">
            {[1, 2].map((s) => (
              <div
                key={s}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  s === step ? 'w-8 bg-accent' : s < step ? 'w-3 bg-accent/40' : 'w-3 bg-[rgba(255,255,255,.07)]'
                )}
              />
            ))}
          </div>
        )}

        <div className="flex-1 flex flex-col px-6 py-4">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                variants={pageVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="flex flex-col flex-1"
              >
                {/* Logo */}
                <div className="flex items-center gap-2 mb-10 mt-2">
                  <div className="w-9 h-9 bg-accent rounded-xl flex items-center justify-center shadow-[0_0_16px_rgba(39,224,125,.4)]">
                    <span className="text-[#04130b] font-black text-lg">X</span>
                  </div>
                  <span className="text-xl font-bold text-[#e9eff0]">hunt</span>
                </div>

                <h1 className="text-[28px] font-bold text-[#e9eff0] leading-tight mb-2">
                  What excites you?
                </h1>
                <p className="text-[#7d8b8e] text-base mb-8">
                  Select everything that sparks something in you.
                </p>

                <div className="grid grid-cols-2 gap-3 flex-1">
                  {INTERESTS.map((interest) => {
                    const active = interests.includes(interest.id);
                    return (
                      <motion.button
                        key={interest.id}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => toggleInterest(interest.id)}
                        className={cn(
                          'relative flex flex-col items-start gap-2 p-4 rounded-2xl border-2 text-left transition-all duration-200',
                          active
                            ? 'border-accent bg-accent-light'
                            : 'border-[rgba(255,255,255,.07)] bg-[#121d20]'
                        )}
                      >
                        <span className="text-2xl">{interest.emoji}</span>
                        <span
                          className={cn(
                            'text-[13px] font-semibold',
                            active ? 'text-accent' : 'text-[#e9eff0]'
                          )}
                        >
                          {interest.label}
                        </span>
                        {active && (
                          <div className="absolute top-3 right-3 w-5 h-5 bg-accent rounded-full flex items-center justify-center">
                            <Check size={11} strokeWidth={3} className="text-[#04130b]" />
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                <div className="pt-6 pb-8">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    disabled={interests.length === 0}
                    onClick={() => setStep(2)}
                    className={cn(
                      'w-full h-14 rounded-2xl font-semibold text-base flex items-center justify-center gap-2 transition-all duration-200',
                      interests.length > 0
                        ? 'bg-accent text-[#04130b] shadow-[0_4px_24px_rgba(39,224,125,.4)]'
                        : 'bg-[#121d20] text-[#54625f] cursor-not-allowed border border-[rgba(255,255,255,.07)]'
                    )}
                  >
                    Continue
                    <ArrowRight size={18} strokeWidth={2.5} />
                  </motion.button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                variants={pageVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="flex flex-col flex-1"
              >
                <button
                  onClick={() => setStep(1)}
                  className="text-[#7d8b8e] text-sm font-medium mb-8 text-left flex items-center gap-1"
                >
                  ← Back
                </button>

                <h1 className="text-[28px] font-bold text-[#e9eff0] leading-tight mb-2">
                  What brings you here?
                </h1>
                <p className="text-[#7d8b8e] text-base mb-8">
                  Your primary goal shapes every Hunt we create for you.
                </p>

                <div className="flex flex-col gap-3 flex-1">
                  {GOALS.map((g) => {
                    const active = goal === g.id;
                    return (
                      <motion.button
                        key={g.id}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setGoal(g.id)}
                        className={cn(
                          'flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all duration-200',
                          active
                            ? 'border-accent bg-accent-light'
                            : 'border-[rgba(255,255,255,.07)] bg-[#121d20]'
                        )}
                      >
                        <span className="text-2xl">{g.emoji}</span>
                        <div className="flex-1">
                          <p
                            className={cn(
                              'text-[15px] font-semibold',
                              active ? 'text-accent' : 'text-[#e9eff0]'
                            )}
                          >
                            {g.label}
                          </p>
                          <p className="text-[13px] text-[#7d8b8e] mt-0.5">{g.desc}</p>
                        </div>
                        <div
                          className={cn(
                            'w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all',
                            active ? 'border-accent bg-accent' : 'border-[#54625f]'
                          )}
                        >
                          {active && <div className="w-2 h-2 bg-[#04130b] rounded-full" />}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>

                <div className="pt-6 pb-8">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    disabled={!goal}
                    onClick={handleComplete}
                    className={cn(
                      'w-full h-14 rounded-2xl font-semibold text-base flex items-center justify-center gap-2 transition-all duration-200',
                      goal
                        ? 'bg-accent text-[#04130b] shadow-[0_4px_24px_rgba(39,224,125,.4)]'
                        : 'bg-[#121d20] text-[#54625f] cursor-not-allowed border border-[rgba(255,255,255,.07)]'
                    )}
                  >
                    Create My Hunts
                    <ArrowRight size={18} strokeWidth={2.5} />
                  </motion.button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                variants={pageVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="flex flex-col items-center justify-center flex-1 text-center gap-6"
              >
                <div className="w-20 h-20 bg-ai-light rounded-full flex items-center justify-center shadow-[0_0_32px_rgba(34,211,238,0.2)]">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                  >
                    <Loader2 size={36} className="text-ai" strokeWidth={2} />
                  </motion.div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-[#e9eff0] mb-2">
                    Building your hunts…
                  </h2>
                  <p className="text-[#7d8b8e] text-base max-w-[260px] mx-auto">
                    Our AI is crafting personalized experiences just for you.
                  </p>
                </div>
                <div className="flex gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-2 h-2 bg-accent rounded-full"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
