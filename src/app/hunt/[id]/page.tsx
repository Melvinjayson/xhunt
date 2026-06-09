'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, Zap, Trophy, ChevronDown, ChevronUp, ShieldCheck, Building2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { loadState } from '@/lib/store';
import { MOCK_HUNTS, getTagGradient, getTagEmoji } from '@/lib/mockHunts';
import type { Hunt } from '@/lib/types';

const DIFFICULTY_COLOR: Record<string, string> = {
  easy:   '#27e07d',
  medium: '#f7931a',
  hard:   '#ef5b6b',
};

const STEP_TYPE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  action:     { bg: 'bg-[#1a0f00]', text: 'text-[#fb923c]', label: 'Action'     },
  reflection: { bg: 'bg-[#0f0f2a]', text: 'text-[#818cf8]', label: 'Reflection' },
  discovery:  { bg: 'bg-[#001a1a]', text: 'text-[#2dd4bf]', label: 'Discovery'  },
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#070d0e' }}>
        <p style={{ color: '#7d8b8e' }}>Hunt not found.</p>
      </div>
    );
  }

  const gradient = getTagGradient(hunt.tags);
  const emoji = getTagEmoji(hunt.tags);
  const diffColor = DIFFICULTY_COLOR[hunt.difficulty] ?? '#27e07d';

  return (
    <div className="min-h-screen" style={{ background: '#070d0e' }}>
      <div className="max-w-[430px] mx-auto">
        {/* Hero */}
        <div className={cn('relative bg-gradient-to-br h-72', gradient)}>
          <div className="absolute inset-0 bg-black/30" />

          <button
            onClick={() => router.back()}
            className="absolute top-12 left-5 z-10 w-9 h-9 backdrop-blur-sm rounded-full flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,.35)', border: '1px solid rgba(255,255,255,.14)' }}
          >
            <ArrowLeft size={18} strokeWidth={2} className="text-white" />
          </button>

          <div className="absolute bottom-6 left-5 right-5 z-10">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-3xl">{emoji}</span>
              <div className="flex flex-wrap gap-1.5">
                {hunt.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="backdrop-blur-sm text-white text-[11px] font-medium px-2.5 py-1 rounded-full"
                    style={{ background: 'rgba(0,0,0,.35)' }}
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
          {/* Sponsor / verified */}
          {(hunt.tenantName || hunt.isVerified) && (
            <div
              className="flex items-center gap-3 mb-5 px-4 py-3 rounded-xl"
              style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)' }}
            >
              {hunt.tenantName && (
                <div className="flex items-center gap-2">
                  {hunt.tenantLogo ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={hunt.tenantLogo} alt={hunt.tenantName}
                      className="w-6 h-6 rounded-md object-cover" />
                  ) : (
                    <div className="w-6 h-6 rounded-md flex items-center justify-center"
                      style={{ background: '#17262a' }}>
                      <Building2 size={13} strokeWidth={2} style={{ color: '#54625f' }} />
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#54625f' }}>
                      Hosted by
                    </p>
                    <p className="text-[13px] font-bold" style={{ color: '#e9eff0' }}>{hunt.tenantName}</p>
                  </div>
                </div>
              )}
              {hunt.isVerified && (
                <div className="flex items-center gap-1.5 ml-auto">
                  <ShieldCheck size={14} strokeWidth={2.5} style={{ color: '#27e07d' }} />
                  <span className="text-[12px] font-bold" style={{ color: '#27e07d' }}>Verified</span>
                </div>
              )}
            </div>
          )}

          {/* Stats row */}
          <div className="flex items-center gap-3 mb-6">
            {[
              { icon: <Clock size={14} strokeWidth={2} style={{ color: '#7d8b8e' }} />, value: hunt.estimated_time },
              { icon: <Zap size={14} strokeWidth={2} style={{ color: '#7d8b8e' }} />,
                value: <span style={{ color: diffColor, fontWeight: 700 }}>
                  {hunt.difficulty.charAt(0).toUpperCase() + hunt.difficulty.slice(1)}
                </span> },
              { icon: null, value: <><span style={{ color: '#7d8b8e' }}>{hunt.steps.length}</span>&nbsp;<span style={{ color: '#e9eff0', fontWeight: 700 }}>Steps</span></> },
            ].map((s, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-xl px-3 py-2.5 flex-1 justify-center"
                style={{ background: '#121d20', border: '1px solid rgba(255,255,255,.07)' }}
              >
                {s.icon}
                <span className="text-sm font-semibold" style={{ color: '#e9eff0' }}>{s.value}</span>
              </div>
            ))}
          </div>

          {/* Story */}
          <section className="mb-6">
            <h2 className="text-[13px] font-bold uppercase tracking-widest mb-3" style={{ color: '#54625f' }}>
              The Story
            </h2>
            <p className="text-[16px] leading-relaxed" style={{ color: '#c4d2d5' }}>{hunt.story_context}</p>
          </section>

          {/* Reward */}
          <section className="mb-6">
            <div
              className="rounded-2xl p-4 flex items-center gap-3"
              style={{ background: '#18120a', border: '1px solid rgba(247,147,26,.15)' }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(247,147,26,.12)' }}
              >
                <Trophy size={20} style={{ color: '#f7931a' }} strokeWidth={2} />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider mb-0.5" style={{ color: '#f7931a' }}>
                  Reward
                </p>
                <p className="text-[14px] font-semibold" style={{ color: '#e9eff0' }}>{hunt.reward}</p>
              </div>
            </div>
          </section>

          {/* Steps preview */}
          <section className="mb-8">
            <button
              onClick={() => setStepsExpanded(!stepsExpanded)}
              className="w-full flex items-center justify-between mb-3"
            >
              <h2 className="text-[13px] font-bold uppercase tracking-widest" style={{ color: '#54625f' }}>
                Your Journey ({hunt.steps.length} steps)
              </h2>
              {stepsExpanded
                ? <ChevronUp size={18} style={{ color: '#54625f' }} />
                : <ChevronDown size={18} style={{ color: '#54625f' }} />}
            </button>

            <div className="flex flex-col gap-2">
              {(stepsExpanded ? hunt.steps : hunt.steps.slice(0, 2)).map((step, i) => {
                const typeStyle = STEP_TYPE_COLORS[step.type];
                return (
                  <div
                    key={step.id}
                    className="flex items-start gap-3 p-3 rounded-xl"
                    style={{ background: '#121d20', border: '1px solid rgba(255,255,255,.07)' }}
                  >
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: '#17262a' }}
                    >
                      <span className="text-[11px] font-bold" style={{ color: '#7d8b8e' }}>{i + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={cn('text-[10px] font-bold uppercase tracking-wider', typeStyle.text)}>
                        {typeStyle.label}
                      </span>
                      <p className="text-[13px] mt-0.5" style={{ color: '#c4d2d5' }}>
                        {stepsExpanded ? step.instruction : step.instruction}
                      </p>
                    </div>
                  </div>
                );
              })}
              {!stepsExpanded && hunt.steps.length > 2 && (
                <button
                  onClick={() => setStepsExpanded(true)}
                  className="text-[13px] font-medium text-center py-2 text-accent"
                >
                  +{hunt.steps.length - 2} more steps
                </button>
              )}
            </div>
          </section>
        </div>

        {/* Sticky CTA */}
        <div
          className="fixed bottom-0 left-0 right-0 z-50 px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]"
          style={{ background: '#0e1719', borderTop: '1px solid rgba(255,255,255,.07)' }}
        >
          <div className="max-w-[430px] mx-auto">
            {isCompleted ? (
              <div
                className="flex items-center justify-center gap-2 h-14 rounded-2xl"
                style={{ background: 'rgba(39,224,125,.08)', border: '1px solid rgba(39,224,125,.2)' }}
              >
                <span className="text-accent font-semibold">Mission Completed ✓</span>
              </div>
            ) : (
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push(`/active/${hunt.id}`)}
                className="w-full h-14 rounded-2xl font-bold text-base flex items-center justify-center gap-2"
                style={{
                  background: 'linear-gradient(180deg,#3ee888,#19c268)',
                  color: '#04130b',
                  boxShadow: '0 4px 24px rgba(39,224,125,.4)',
                }}
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
