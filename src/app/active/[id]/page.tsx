'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, SkipForward, X, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { loadState, saveState } from '@/lib/store';
import { MOCK_HUNTS } from '@/lib/mockHunts';
import type { Hunt, HuntProgress, Step } from '@/lib/types';
import { emitEvent, syncProgress } from '@/lib/supabase/events';

const STEP_TYPE_CONFIG = {
  action: { label: 'Action', emoji: '⚡', bg: 'bg-[#1a0f00]', text: 'text-[#fb923c]', border: 'border-[#2a1800]' },
  reflection: { label: 'Reflection', emoji: '💭', bg: 'bg-[#0f0f2a]', text: 'text-[#818cf8]', border: 'border-[#1a1a3a]' },
  discovery: { label: 'Discovery', emoji: '🔍', bg: 'bg-[#001a1a]', text: 'text-[#2dd4bf]', border: 'border-[#002a2a]' },
};

type SheetState = 'hidden' | 'skip_confirm' | 'adapting' | 'adapted';

export default function ActiveHuntPage() {
  const params = useParams();
  const router = useRouter();
  const huntId = params?.id as string;

  const [hunt, setHunt] = useState<Hunt | null>(null);
  const [progress, setProgress] = useState<HuntProgress | null>(null);
  const [mounted, setMounted] = useState(false);
  const [sheet, setSheet] = useState<SheetState>('hidden');
  const [adaptedStep, setAdaptedStep] = useState<Step | null>(null);
  const [isAdaptedMode, setIsAdaptedMode] = useState(false);

  useEffect(() => {
    const state = loadState();
    const allHunts = state.hunts.length > 0 ? [...state.hunts, ...MOCK_HUNTS] : MOCK_HUNTS;
    const found = allHunts.find((h) => h.id === huntId);
    if (!found) return;
    setHunt(found);

    const existing = state.progress[huntId];
    if (existing) {
      setProgress(existing);
      emitEvent('mission_resumed', { missionId: huntId });
      emitEvent('step_started', { missionId: huntId, stepId: found.steps[existing.currentStepIndex]?.id });
    } else {
      const fresh: HuntProgress = {
        huntId,
        currentStepIndex: 0,
        completedSteps: [],
        startedAt: new Date().toISOString(),
      };
      setProgress(fresh);
      saveState({ ...state, progress: { ...state.progress, [huntId]: fresh } });
      emitEvent('mission_started', { missionId: huntId });
      emitEvent('step_started', { missionId: huntId, stepId: found.steps[0]?.id });
    }
    setMounted(true);
  }, [huntId]);

  useEffect(() => {
    setIsAdaptedMode(false);
    setAdaptedStep(null);
  }, [progress?.currentStepIndex]);

  if (!mounted || !hunt || !progress) return null;

  const rawStep = hunt.steps[progress.currentStepIndex];
  const currentStep = isAdaptedMode && adaptedStep ? adaptedStep : rawStep;
  const isLastStep = progress.currentStepIndex === hunt.steps.length - 1;
  const progressPercent = Math.round((progress.completedSteps.length / hunt.steps.length) * 100);
  const typeConfig = STEP_TYPE_CONFIG[currentStep.type];

  function completeStep() {
    if (!hunt || !progress) return;
    const updatedCompleted = [...progress.completedSteps, rawStep.id];
    const state = loadState();

    emitEvent('step_completed', { missionId: huntId, stepId: rawStep.id });

    if (isLastStep) {
      const updatedProgress: HuntProgress = {
        ...progress,
        completedSteps: updatedCompleted,
        completedAt: new Date().toISOString(),
      };
      const alreadyCompleted = state.completedHunts.some((c) => c.huntId === huntId);
      const newCompleted = alreadyCompleted
        ? state.completedHunts
        : [...state.completedHunts, { huntId, huntTitle: hunt.title, reward: hunt.reward, completedAt: new Date().toISOString() }];
      saveState({ ...state, progress: { ...state.progress, [huntId]: updatedProgress }, completedHunts: newCompleted, streak: (state.streak || 0) + 1 });
      syncProgress(huntId, updatedProgress);
      router.push(`/complete/${huntId}`);
    } else {
      const updatedProgress: HuntProgress = {
        ...progress,
        currentStepIndex: progress.currentStepIndex + 1,
        completedSteps: updatedCompleted,
      };
      setProgress(updatedProgress);
      saveState({ ...state, progress: { ...state.progress, [huntId]: updatedProgress } });
      syncProgress(huntId, updatedProgress);
      emitEvent('step_started', { missionId: huntId, stepId: hunt.steps[progress.currentStepIndex + 1]?.id });
    }
  }

  function skipStep() {
    if (!hunt || !progress) return;
    const state = loadState();
    emitEvent('step_skipped', { missionId: huntId, stepId: rawStep.id });
    if (isLastStep) { router.push(`/complete/${huntId}`); return; }
    const updatedProgress: HuntProgress = { ...progress, currentStepIndex: progress.currentStepIndex + 1 };
    setProgress(updatedProgress);
    saveState({ ...state, progress: { ...state.progress, [huntId]: updatedProgress } });
    syncProgress(huntId, updatedProgress);
    emitEvent('step_started', { missionId: huntId, stepId: hunt.steps[progress.currentStepIndex + 1]?.id });
    setSheet('hidden');
  }

  async function handleAdaptRequest() {
    if (!hunt) return;
    setSheet('adapting');

    try {
      const state = loadState();
      const res = await fetch('/api/adapt-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          huntTitle: hunt.title,
          storyContext: hunt.story_context,
          step: rawStep,
          context: 'user_skipped',
          userInterests: state.user?.interests ?? [],
        }),
      });

      if (!res.ok) throw new Error('API error');
      const data = await res.json();

      if (data.adaptedStep) {
        setAdaptedStep(data.adaptedStep);
        setSheet('adapted');
      } else {
        setSheet('skip_confirm');
      }
    } catch {
      setSheet('skip_confirm');
    }
  }

  function applyAdaptedStep() {
    setIsAdaptedMode(true);
    setSheet('hidden');
  }

  return (
    <div className="min-h-screen bg-[#080c14] flex flex-col">
      <div className="max-w-[430px] mx-auto w-full flex flex-col min-h-screen">
        {/* Progress bar */}
        <div className="h-1 bg-[#1c2a3a] w-full">
          <motion.div
            className="h-full bg-accent"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            style={{ boxShadow: '0 0 8px rgba(0,230,118,0.6)' }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-10 pb-4">
          <button onClick={() => router.back()} className="w-9 h-9 bg-[#111927] rounded-full flex items-center justify-center border border-[#1c2a3a]">
            <ArrowLeft size={18} strokeWidth={2} className="text-[#e8f0fe]" />
          </button>
          <div className="text-center">
            <p className="text-[13px] font-semibold text-[#7a8fa8]">
              Step {progress.currentStepIndex + 1} of {hunt.steps.length}
            </p>
            <p className="text-[11px] text-[#3d5068] mt-0.5 truncate max-w-[180px]">{hunt.title}</p>
          </div>
          <button onClick={() => router.push(`/hunt/${huntId}`)} className="w-9 h-9 bg-[#111927] rounded-full flex items-center justify-center border border-[#1c2a3a]">
            <X size={16} strokeWidth={2} className="text-[#7a8fa8]" />
          </button>
        </div>

        {/* Step content */}
        <div className="flex-1 flex flex-col px-5 py-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${progress.currentStepIndex}-${isAdaptedMode}`}
              initial={{ opacity: 0, x: isAdaptedMode ? 0 : 30, y: isAdaptedMode ? 10 : 0 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="flex flex-col flex-1"
            >
              {/* Adapted banner */}
              {isAdaptedMode && (
                <div className="flex items-center gap-2 bg-ai-light border border-[#0a3040] rounded-xl px-3 py-2 mb-4 self-start">
                  <Sparkles size={13} className="text-ai" strokeWidth={2} />
                  <span className="text-[12px] font-semibold text-ai">AI-adapted for you</span>
                </div>
              )}

              {/* Step type badge */}
              <div className={cn('inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6 self-start border', typeConfig.bg, typeConfig.text, typeConfig.border)}>
                <span className="text-base">{typeConfig.emoji}</span>
                <span className="text-xs font-bold uppercase tracking-wider">{typeConfig.label}</span>
              </div>

              {/* Main instruction */}
              <div className="flex-1">
                <p className="text-[22px] font-bold text-[#e8f0fe] leading-snug mb-6">
                  {currentStep.instruction}
                </p>
                <div className="bg-[#111927] rounded-xl p-4 border border-[#1c2a3a]">
                  <p className="text-[11px] font-bold text-[#3d5068] uppercase tracking-wider mb-1">
                    {isAdaptedMode ? "Easier version — done when" : "You're done when"}
                  </p>
                  <p className="text-[14px] text-[#7a8fa8] leading-relaxed">{currentStep.success_criteria}</p>
                </div>
              </div>

              {/* Step dots */}
              <div className="flex justify-center gap-2 py-6">
                {hunt.steps.map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'rounded-full transition-all duration-300',
                      i < progress.currentStepIndex ? 'w-2 h-2 bg-accent'
                      : i === progress.currentStepIndex ? 'w-5 h-2 bg-accent'
                      : 'w-2 h-2 bg-[#1c2a3a]'
                    )}
                  />
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Actions */}
        <div className="px-5 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] flex flex-col gap-3">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={completeStep}
            className="w-full h-14 bg-accent text-[#060a0e] rounded-2xl font-bold text-base shadow-[0_4px_24px_rgba(0,230,118,0.4)] flex items-center justify-center gap-2"
          >
            <Check size={20} strokeWidth={2.5} />
            {isLastStep ? 'Complete Hunt' : 'Mark as Done'}
          </motion.button>

          <button
            onClick={() => setSheet('skip_confirm')}
            className="flex items-center justify-center gap-1.5 py-2 text-[#3d5068] text-sm font-medium"
          >
            <SkipForward size={14} strokeWidth={2} />
            {isAdaptedMode ? 'Still too hard — skip' : 'Skip this step'}
          </button>
        </div>
      </div>

      {/* Bottom sheet */}
      <AnimatePresence>
        {sheet !== 'hidden' && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40"
              onClick={() => sheet === 'skip_confirm' && setSheet('hidden')}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-[#0f1824] border-t border-[#1c2a3a] rounded-t-3xl px-5 pt-6 pb-[calc(2rem+env(safe-area-inset-bottom,0px))]"
            >
              <div className="max-w-[430px] mx-auto">
                <div className="w-10 h-1 bg-[#1c2a3a] rounded-full mx-auto mb-6" />

                {/* Skip confirm */}
                {sheet === 'skip_confirm' && (
                  <>
                    <h3 className="text-xl font-bold text-[#e8f0fe] mb-1">This step feeling tough?</h3>
                    <p className="text-[#7a8fa8] text-sm mb-6">
                      Let AI adapt it into an easier version, or skip entirely.
                    </p>
                    <div className="flex flex-col gap-2.5">
                      <button
                        onClick={handleAdaptRequest}
                        className="w-full h-13 bg-ai text-[#060a0e] rounded-2xl font-semibold flex items-center justify-center gap-2 py-3.5 shadow-[0_4px_20px_rgba(34,211,238,0.3)]"
                      >
                        <Sparkles size={16} strokeWidth={2} />
                        Make it easier for me
                      </button>
                      <div className="flex gap-2.5">
                        <button onClick={() => setSheet('hidden')} className="flex-1 h-12 bg-[#162030] rounded-2xl font-semibold text-[#e8f0fe] border border-[#1c2a3a]">
                          Cancel
                        </button>
                        <button onClick={skipStep} className="flex-1 h-12 bg-[#e8f0fe] rounded-2xl font-semibold text-[#080c14]">
                          Skip entirely
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* Adapting loading */}
                {sheet === 'adapting' && (
                  <div className="flex flex-col items-center py-6 gap-4">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                      <Loader2 size={32} className="text-ai" strokeWidth={2} />
                    </motion.div>
                    <div className="text-center">
                      <p className="font-bold text-[#e8f0fe] text-lg mb-1">Adapting your step…</p>
                      <p className="text-[#7a8fa8] text-sm">Creating an easier version just for you.</p>
                    </div>
                  </div>
                )}

                {/* Adapted step ready */}
                {sheet === 'adapted' && adaptedStep && (
                  <>
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles size={16} className="text-ai" strokeWidth={2} />
                      <p className="text-[13px] font-bold text-ai uppercase tracking-wide">Easier version ready</p>
                    </div>
                    <div className="bg-ai-light border border-[#0a3040] rounded-2xl p-4 mb-5">
                      <p className="text-[15px] font-semibold text-[#e8f0fe] leading-snug mb-2">
                        {adaptedStep.instruction}
                      </p>
                      <p className="text-[12px] text-[#7a8fa8]">{adaptedStep.success_criteria}</p>
                    </div>
                    <div className="flex gap-2.5">
                      <button onClick={skipStep} className="flex-1 h-12 bg-[#162030] rounded-2xl font-semibold text-[#7a8fa8] text-sm border border-[#1c2a3a]">
                        Skip anyway
                      </button>
                      <button
                        onClick={applyAdaptedStep}
                        className="flex-[2] h-12 bg-ai text-[#060a0e] rounded-2xl font-bold shadow-[0_4px_20px_rgba(34,211,238,0.3)]"
                      >
                        Try this version
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
