'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Flame, CheckCircle, Settings, ArrowRight, Trophy, Loader2, Sparkles, Shield, Zap } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { loadState, clearState } from '@/lib/store';
import type { CompletedHunt } from '@/lib/types';

const INTEREST_LABELS: Record<string, string> = {
  adventure: '🌍 Adventure', food: '🍴 Food', art: '🎨 Art', tech: '💻 Tech',
  fitness: '💪 Fitness', mindfulness: '🧘 Mindfulness', social: '👥 Social', learning: '📚 Learning',
};

function getInitials(name: string | null): string {
  if (!name) return 'XP';
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

function isUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export default function ProfilePage() {
  const router = useRouter();
  const [interests, setInterests] = useState<string[]>([]);
  const [completedHunts, setCompletedHunts] = useState<CompletedHunt[]>([]);
  const [streak, setStreak] = useState(0);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [supabaseLoading, setSupabaseLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [subStatus, setSubStatus] = useState<{ tier: string; isTrialActive: boolean; trialDaysLeft: number; hasUsedTrial: boolean; canUseAI: boolean } | null>(null);

  useEffect(() => {
    const state = loadState();
    if (!state.user?.onboardingComplete) {
      router.replace('/');
      return;
    }
    setInterests(state.user?.interests ?? []);
    setCompletedHunts(state.completedHunts);
    setStreak(state.streak);
    setMounted(true);

    void fetch('/api/subscription/status')
      .then((r) => r.json())
      .then((d) => setSubStatus(d as typeof subStatus))
      .catch(() => {});

    void (async () => {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;
      setSupabaseLoading(true);
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const sb = createClient();
        const { data: { user } } = await sb.auth.getUser();
        if (!user) { setSupabaseLoading(false); return; }

        const { data: profile } = await sb
          .from('user_profiles')
          .select('display_name, interests')
          .eq('id', user.id)
          .single();

        if (profile?.display_name) setDisplayName(profile.display_name);
        if (profile?.interests?.length) setInterests(profile.interests);

        const { data: progress } = await sb
          .from('mission_progress')
          .select('mission_id, completed_at')
          .eq('user_id', user.id)
          .not('completed_at', 'is', null)
          .order('completed_at', { ascending: false });

        if (!progress?.length) { setSupabaseLoading(false); return; }

        const missionIds = [...new Set(progress.map((p: { mission_id: string }) => p.mission_id))];
        const { data: missions } = await sb
          .from('missions')
          .select('id, title, reward')
          .in('id', missionIds);

        if (missions?.length) {
          const mMap = new Map((missions as { id: string; title: string; reward: string }[]).map((m) => [m.id, m]));
          const sbCompletions: CompletedHunt[] = progress
            .filter((p: { mission_id: string }) => mMap.has(p.mission_id))
            .map((p: { mission_id: string; completed_at: string }) => {
              const m = mMap.get(p.mission_id)!;
              return { huntId: p.mission_id, huntTitle: m.title, reward: m.reward, completedAt: p.completed_at };
            });

          setCompletedHunts((prev) => {
            const sbIds = new Set(sbCompletions.map((c) => c.huntId));
            const localOnly = prev.filter((c) => !sbIds.has(c.huntId) && !isUUID(c.huntId));
            return [...sbCompletions, ...localOnly].sort(
              (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
            );
          });
        }
      } catch { /* silent */ }
      setSupabaseLoading(false);
    })();
  }, [router]);

  if (!mounted) return null;

  function handleReset() {
    if (confirm('Reset all your data and start fresh?')) {
      clearState();
      router.replace('/');
    }
  }

  const initials = getInitials(displayName);
  const profileName = displayName ?? 'Explorer';

  return (
    <div className="min-h-screen pb-24" style={{ background: '#070d0e' }}>
      <div className="max-w-[430px] mx-auto">
        {/* Header */}
        <div
          className="px-5 pt-14 pb-6"
          style={{ background: '#0e1719', borderBottom: '1px solid rgba(255,255,255,.07)' }}
        >
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-[22px] font-bold" style={{ color: '#e9eff0', letterSpacing: '-.02em' }}>Profile</h1>
            <div className="flex items-center gap-2">
              {supabaseLoading && <Loader2 size={14} className="animate-spin" style={{ color: '#54625f' }} strokeWidth={2} />}
              <button
                onClick={handleReset}
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: '#17262a', border: '1px solid rgba(255,255,255,.07)' }}
              >
                <Settings size={17} strokeWidth={1.8} style={{ color: '#7d8b8e' }} />
              </button>
            </div>
          </div>

          {/* Avatar + stats */}
          <div className="flex items-center gap-5">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg,#27e07d,#15b866)',
                boxShadow: '0 0 20px rgba(39,224,125,.3)',
              }}
            >
              <span className="font-black text-xl" style={{ color: '#04130b' }}>{initials}</span>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[17px] font-bold truncate" style={{ color: '#e9eff0' }}>{profileName}</p>
              <div className="flex gap-5 mt-1.5">
                {[
                  { value: completedHunts.length, label: 'Missions' },
                  { value: streak,                label: 'Streak'   },
                  { value: interests.length,      label: 'Interests'},
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <p className="text-[18px] font-bold" style={{ color: '#e9eff0' }}>{s.value}</p>
                    <p className="text-[10px] font-medium" style={{ color: '#54625f' }}>{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-6">
          {/* Streak card */}
          {streak > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl p-5 mb-6 flex items-center gap-4"
              style={{
                background: 'linear-gradient(135deg,rgba(39,224,125,.08),rgba(39,224,125,.03))',
                border: '1px solid rgba(39,224,125,.15)',
              }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(39,224,125,.12)' }}
              >
                <Flame size={24} className="text-accent" strokeWidth={2} />
              </div>
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: '#7d8b8e' }}>Current Streak</p>
                <p className="text-accent text-[22px] font-bold">{streak} Mission{streak !== 1 ? 's' : ''} Completed</p>
              </div>
            </motion.div>
          )}

          {/* Plan card */}
          {subStatus && (
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl p-4 mb-6 flex items-center gap-4"
              style={{
                background: subStatus.isTrialActive
                  ? 'linear-gradient(135deg,rgba(34,211,238,.08),rgba(34,211,238,.03))'
                  : subStatus.tier === 'pro'
                  ? 'linear-gradient(135deg,rgba(39,224,125,.08),rgba(39,224,125,.03))'
                  : '#121d20',
                border: `1px solid ${subStatus.isTrialActive ? 'rgba(34,211,238,.15)' : subStatus.tier === 'pro' ? 'rgba(39,224,125,.15)' : 'rgba(255,255,255,.07)'}`,
              }}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: subStatus.isTrialActive ? 'rgba(34,211,238,.12)' : subStatus.tier === 'pro' ? 'rgba(39,224,125,.12)' : 'rgba(255,255,255,.05)' }}
              >
                {subStatus.tier === 'pro'
                  ? <Shield size={20} className="text-accent" strokeWidth={2} />
                  : subStatus.isTrialActive
                  ? <Sparkles size={20} style={{ color: '#22d3ee' }} strokeWidth={2} />
                  : <Zap size={20} style={{ color: '#54625f' }} strokeWidth={2} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#54625f' }}>Current Plan</p>
                <p className="text-[15px] font-bold mt-0.5" style={{ color: '#e9eff0' }}>
                  {subStatus.tier === 'pro' ? 'Pro' : subStatus.isTrialActive ? `Trial — ${subStatus.trialDaysLeft}d left` : 'Free'}
                </p>
              </div>
              {subStatus.tier !== 'pro' && (
                <button
                  onClick={() => router.push('/upgrade')}
                  className="flex items-center gap-1 flex-shrink-0 font-bold text-[12px]"
                  style={{ color: subStatus.isTrialActive ? '#22d3ee' : '#27e07d', background: 'none', border: 0, cursor: 'pointer', padding: 0 }}
                >
                  {subStatus.isTrialActive ? 'Upgrade' : subStatus.hasUsedTrial ? 'Go Pro' : 'Try Free'}
                  <ArrowRight size={12} strokeWidth={2.5} />
                </button>
              )}
            </motion.div>
          )}

          {/* Interests */}
          {interests.length > 0 && (
            <section className="mb-6">
              <h2 className="text-[15px] font-bold mb-3" style={{ color: '#e9eff0' }}>Your Interests</h2>
              <div className="flex flex-wrap gap-2">
                {interests.map((id) => (
                  <span
                    key={id}
                    className="rounded-full px-3 py-1.5 text-[13px] font-medium"
                    style={{ background: '#121d20', border: '1px solid rgba(255,255,255,.07)', color: '#e9eff0' }}
                  >
                    {INTEREST_LABELS[id] ?? id}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Completed missions */}
          <section>
            <h2 className="text-[15px] font-bold mb-4" style={{ color: '#e9eff0' }}>
              Completed {completedHunts.length > 0 && `(${completedHunts.length})`}
            </h2>

            {completedHunts.length === 0 ? (
              <div
                className="rounded-2xl p-8 text-center"
                style={{ background: '#121d20', border: '1px solid rgba(255,255,255,.07)' }}
              >
                <div className="text-4xl mb-3">🔍</div>
                <p className="font-semibold mb-1" style={{ color: '#e9eff0' }}>No completed missions yet</p>
                <p className="text-sm mb-4" style={{ color: '#7d8b8e' }}>Start your first mission to see it here.</p>
                <button
                  onClick={() => router.push('/missions')}
                  className="inline-flex items-center gap-1.5 text-accent font-semibold text-sm"
                >
                  Browse Missions <ArrowRight size={14} strokeWidth={2.5} />
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {completedHunts.map((c, i) => (
                  <motion.div
                    key={c.huntId}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="rounded-2xl p-4 flex items-start gap-3"
                    style={{ background: '#121d20', border: '1px solid rgba(255,255,255,.07)' }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(39,224,125,.1)' }}
                    >
                      <CheckCircle size={20} className="text-accent" strokeWidth={2} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[15px] truncate" style={{ color: '#e9eff0' }}>{c.huntTitle}</p>
                      <p className="text-[12px] text-accent font-medium mt-0.5 truncate">{c.reward.split('+')[0].trim()}</p>
                      <p className="text-[11px] mt-1" style={{ color: '#54625f' }}>
                        {new Date(c.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <Trophy size={18} style={{ color: '#f7931a' }} strokeWidth={1.8} />
                  </motion.div>
                ))}
              </div>
            )}
          </section>

          <p className="text-center text-[11px] mt-8" style={{ color: '#54625f' }}>X-hunt · AI-native experience platform</p>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
