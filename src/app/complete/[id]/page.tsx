'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Trophy, Share2, ArrowRight, Home, Clock, Zap, Sparkles, Radio, CheckCircle2 } from 'lucide-react';
import { loadState } from '@/lib/store';
import { MOCK_HUNTS, getTagGradient } from '@/lib/mockHunts';
import type { Hunt } from '@/lib/types';
import { cn } from '@/lib/cn';
import { emitEvent, emitRewardClaimed } from '@/lib/supabase/events';

const CONFETTI_COLORS = ['#27e07d', '#22d3ee', '#f7931a', '#a78bfa', '#f472b6', '#60a5fa'];

const DIFFICULTY_COLOR: Record<string, string> = {
  easy:   '#27e07d',
  medium: '#f7931a',
  hard:   '#ef5b6b',
};

interface Recommendation {
  id: string;
  title: string;
  difficulty: string;
  estimated_time: string | null;
  tags: string[];
  confidence_pct: number;
  reason: string;
}

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
      transition={{ duration: 2.5 + Math.random(), delay, ease: 'easeIn' }}
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
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [sharing, setSharing] = useState(false);
  const [shared, setShared] = useState(false);

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

    void fetch(`/api/recommendations?mission_id=${huntId}&limit=3`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.recommendations?.length) {
          setRecommendations(data.recommendations as Recommendation[]);
        }
      })
      .catch(() => {});
  }, [huntId]);

  if (!mounted || !hunt) return null;

  const gradient = getTagGradient(hunt.tags);
  const completionDate = new Date(completedAt).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

  async function handleShareToTimeline() {
    if (sharing || shared) return;
    setSharing(true);
    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(huntId);
      await fetch('/api/timeline/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_type:  'completion',
          caption:    `Just completed "${hunt!.title}" 🏆`,
          mission_id: isUUID ? huntId : undefined,
          metadata:   { reward: hunt!.reward, steps: stepsCompleted, title: hunt!.title },
        }),
      });
      setShared(true);
    } finally {
      setSharing(false);
    }
  }

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
    <div className="min-h-screen flex flex-col overflow-hidden" style={{ background: '#070d0e' }}>
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {Array.from({ length: 40 }).map((_, i) => (
            <ConfettiPiece key={i} delay={i * 0.04} x={(i / 40) * 100} />
          ))}
        </div>
      )}

      <div className="max-w-[430px] mx-auto w-full flex flex-col min-h-screen px-5">
        {/* Hero */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 18, stiffness: 200, delay: 0.2 }}
          className="flex flex-col items-center pt-20 pb-8"
        >
          <div
            className={cn('w-24 h-24 rounded-full bg-gradient-to-br flex items-center justify-center mb-6', gradient)}
            style={{ boxShadow: '0 0 40px rgba(39,224,125,.3)' }}
          >
            <span className="text-4xl">🏆</span>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="text-center"
          >
            <p className="font-bold text-sm uppercase tracking-widest mb-2 text-accent">Mission Complete!</p>
            <h1 className="text-[26px] font-bold leading-tight mb-2" style={{ color: '#e9eff0' }}>{hunt.title}</h1>
            <p className="text-sm" style={{ color: '#7d8b8e' }}>{completionDate}</p>
          </motion.div>
        </motion.div>

        {/* Reward */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.4 }}
          className="rounded-2xl p-5 mb-6"
          style={{ background: '#18120a', border: '1px solid rgba(247,147,26,.15)' }}
        >
          <p className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: '#f7931a' }}>Your Reward</p>
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(247,147,26,.12)' }}
            >
              <Trophy size={28} style={{ color: '#f7931a' }} strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-[17px] font-bold leading-snug" style={{ color: '#e9eff0' }}>{hunt.reward}</p>
              <p className="text-[13px] mt-0.5" style={{ color: '#7d8b8e' }}>Added to your profile</p>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.4 }}
          className="grid grid-cols-2 gap-3 mb-8"
        >
          {[
            { value: stepsCompleted, label: 'Steps Completed', color: '#27e07d' },
            { value: hunt.estimated_time, label: 'Time Well Spent', color: '#e9eff0' },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl p-4 text-center"
              style={{ background: '#121d20', border: '1px solid rgba(255,255,255,.07)' }}
            >
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[12px] font-medium mt-1" style={{ color: '#7d8b8e' }}>{s.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.95, duration: 0.4 }}
            className="mb-8"
          >
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={15} className="text-ai" strokeWidth={2} />
              <h2 className="text-[15px] font-bold" style={{ color: '#e9eff0' }}>What&apos;s next for you</h2>
            </div>
            <div className="flex flex-col gap-3">
              {recommendations.map((rec) => (
                <button
                  key={rec.id}
                  onClick={() => router.push(`/hunt/${rec.id}`)}
                  className="rounded-2xl p-4 text-left transition-colors group"
                  style={{ background: '#121d20', border: '1px solid rgba(255,255,255,.07)' }}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <p
                      className="text-[14px] font-semibold leading-snug group-hover:text-accent transition-colors"
                      style={{ color: '#e9eff0' }}
                    >
                      {rec.title}
                    </p>
                    <ArrowRight size={15} style={{ color: '#54625f' }} className="group-hover:text-accent transition-colors flex-shrink-0 mt-0.5" strokeWidth={2} />
                  </div>
                  <div className="flex items-center gap-3">
                    {rec.estimated_time && (
                      <span className="flex items-center gap-1 text-[11px]" style={{ color: '#7d8b8e' }}>
                        <Clock size={10} strokeWidth={2} />{rec.estimated_time}
                      </span>
                    )}
                    <span
                      className="flex items-center gap-1 text-[11px] font-semibold"
                      style={{ color: DIFFICULTY_COLOR[rec.difficulty] ?? '#7d8b8e' }}
                    >
                      <Zap size={10} strokeWidth={2} />
                      {rec.difficulty.charAt(0).toUpperCase() + rec.difficulty.slice(1)}
                    </span>
                    <span
                      className="ml-auto text-[10px] px-2 py-0.5 rounded-full"
                      style={{ color: '#54625f', background: '#17262a' }}
                    >
                      {rec.reason}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: recommendations.length > 0 ? 1.1 : 0.95, duration: 0.4 }}
          className="flex flex-col gap-3 pb-12"
        >
          {/* Share to Timeline */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleShareToTimeline}
            disabled={sharing || shared}
            className="w-full h-14 rounded-2xl font-semibold flex items-center justify-center gap-2"
            style={{
              background: shared ? 'rgba(39,224,125,.1)' : '#121d20',
              border: shared ? '1px solid rgba(39,224,125,.3)' : '1px solid rgba(255,255,255,.07)',
              color: shared ? '#27e07d' : '#e9eff0',
            }}
          >
            {shared ? <CheckCircle2 size={18} strokeWidth={2} /> : <Radio size={18} strokeWidth={2} />}
            {sharing ? 'Sharing…' : shared ? 'Shared to Timeline!' : 'Share to Timeline'}
          </motion.button>

          {/* Native share */}
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleShare}
              className="w-full h-14 rounded-2xl font-semibold flex items-center justify-center gap-2"
              style={{ background: '#121d20', border: '1px solid rgba(255,255,255,.07)', color: '#e9eff0' }}
            >
              <Share2 size={18} strokeWidth={2} />
              Share Achievement
            </motion.button>
          )}

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push('/home')}
            className="w-full h-14 rounded-2xl font-bold text-base flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(180deg,#3ee888,#19c268)',
              color: '#04130b',
              boxShadow: '0 4px 24px rgba(39,224,125,.4)',
            }}
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
