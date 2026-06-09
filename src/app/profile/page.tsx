'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Flame, CheckCircle, Settings, ArrowRight, Trophy, Loader2 } from 'lucide-react';
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

    // Enrich from Supabase if available — fire and forget
    void (async () => {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;
      setSupabaseLoading(true);
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const sb = createClient();
        const { data: { user } } = await sb.auth.getUser();
        if (!user) { setSupabaseLoading(false); return; }

        // Load user profile
        const { data: profile } = await sb
          .from('user_profiles')
          .select('display_name, interests')
          .eq('id', user.id)
          .single();

        if (profile?.display_name) setDisplayName(profile.display_name);
        if (profile?.interests?.length) setInterests(profile.interests);

        // Load completed missions from Supabase
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
            // Keep localStorage entries for mock hunts (non-UUID), use Supabase for UUID missions
            const sbIds = new Set(sbCompletions.map((c) => c.huntId));
            const localOnly = prev.filter((c) => !sbIds.has(c.huntId) && !isUUID(c.huntId));
            return [...sbCompletions, ...localOnly].sort(
              (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
            );
          });
        }
      } catch { /* silent — UI already has localStorage data */ }
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
    <div className="min-h-screen bg-[#080c14] pb-24">
      <div className="max-w-[430px] mx-auto">
        {/* Header */}
        <div className="bg-[#0f1824] px-5 pt-14 pb-6 border-b border-[#1c2a3a]">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-[22px] font-bold text-[#e8f0fe]">Profile</h1>
            <div className="flex items-center gap-2">
              {supabaseLoading && <Loader2 size={14} className="text-[#3d5068] animate-spin" strokeWidth={2} />}
              <button onClick={handleReset}
                className="w-9 h-9 bg-[#162030] rounded-full flex items-center justify-center border border-[#1c2a3a]">
                <Settings size={17} strokeWidth={1.8} className="text-[#7a8fa8]" />
              </button>
            </div>
          </div>

          {/* Avatar + stats */}
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-gradient-to-br from-accent to-[#00b359] rounded-2xl flex items-center justify-center flex-shrink-0 shadow-[0_0_20px_rgba(0,230,118,0.3)]">
              <span className="text-[#060a0e] font-black text-xl">{initials}</span>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[17px] font-bold text-[#e8f0fe] truncate">{profileName}</p>
              <div className="flex gap-5 mt-1.5">
                <div className="text-center">
                  <p className="text-[18px] font-bold text-[#e8f0fe]">{completedHunts.length}</p>
                  <p className="text-[10px] text-[#3d5068] font-medium">Hunts</p>
                </div>
                <div className="text-center">
                  <p className="text-[18px] font-bold text-[#e8f0fe]">{streak}</p>
                  <p className="text-[10px] text-[#3d5068] font-medium">Streak</p>
                </div>
                <div className="text-center">
                  <p className="text-[18px] font-bold text-[#e8f0fe]">{interests.length}</p>
                  <p className="text-[10px] text-[#3d5068] font-medium">Interests</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-6">
          {/* Streak card */}
          {streak > 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-[#002918] to-[#001a12] border border-[#004d2a] rounded-2xl p-5 mb-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-accent/15 rounded-xl flex items-center justify-center">
                <Flame size={24} className="text-accent" strokeWidth={2} />
              </div>
              <div>
                <p className="text-[#7a8fa8] text-[12px] font-semibold uppercase tracking-wider">Current Streak</p>
                <p className="text-accent text-[22px] font-bold">{streak} Hunt{streak !== 1 ? 's' : ''} Completed</p>
              </div>
            </motion.div>
          )}

          {/* Interests */}
          {interests.length > 0 && (
            <section className="mb-6">
              <h2 className="text-[15px] font-bold text-[#e8f0fe] mb-3">Your Interests</h2>
              <div className="flex flex-wrap gap-2">
                {interests.map((id) => (
                  <span key={id} className="bg-[#111927] border border-[#1c2a3a] rounded-full px-3 py-1.5 text-[13px] font-medium text-[#e8f0fe]">
                    {INTEREST_LABELS[id] ?? id}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Completed hunts */}
          <section>
            <h2 className="text-[15px] font-bold text-[#e8f0fe] mb-4">
              Completed {completedHunts.length > 0 && `(${completedHunts.length})`}
            </h2>

            {completedHunts.length === 0 ? (
              <div className="bg-[#111927] rounded-2xl border border-[#1c2a3a] p-8 text-center">
                <div className="text-4xl mb-3">🔍</div>
                <p className="font-semibold text-[#e8f0fe] mb-1">No completed hunts yet</p>
                <p className="text-[#7a8fa8] text-sm mb-4">Start your first hunt to see it here.</p>
                <button onClick={() => router.push('/home')}
                  className="inline-flex items-center gap-1.5 text-accent font-semibold text-sm">
                  Explore Hunts <ArrowRight size={14} strokeWidth={2.5} />
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {completedHunts.map((c, i) => (
                  <motion.div key={c.huntId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="bg-[#111927] rounded-2xl border border-[#1c2a3a] p-4 flex items-start gap-3">
                    <div className="w-10 h-10 bg-[#002918] rounded-xl flex items-center justify-center flex-shrink-0">
                      <CheckCircle size={20} className="text-accent" strokeWidth={2} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[15px] text-[#e8f0fe] truncate">{c.huntTitle}</p>
                      <p className="text-[12px] text-accent font-medium mt-0.5 truncate">{c.reward.split('+')[0].trim()}</p>
                      <p className="text-[11px] text-[#3d5068] mt-1">
                        {new Date(c.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="text-xl"><Trophy size={18} className="text-[#fbbf24]" strokeWidth={1.8} /></div>
                  </motion.div>
                ))}
              </div>
            )}
          </section>

          <p className="text-center text-[11px] text-[#3d5068] mt-8">X-hunt · AI-native experience platform</p>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
