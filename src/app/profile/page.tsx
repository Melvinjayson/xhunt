'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Flame, CheckCircle, Settings, ArrowRight, Trophy, Loader2, Sparkles, Shield, Zap, Star, TrendingUp, Award } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { loadState, clearState } from '@/lib/store';
import type { CompletedHunt } from '@/lib/types';

const BG = '#050816', CARD = '#0A1226', SURFACE = '#07101F';
const ACCENT = '#22FFAA', AI = '#6D5DFD', WARN = '#FFB84D';
const TXT = '#F0F4FF', DIM = '#8B9CC0', FAINT = '#4A5578';
const XGLASS: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.08)' };

const INTEREST_LABELS: Record<string, string> = {
  adventure: '🌍 Adventure', food: '🍴 Food', art: '🎨 Art', tech: '💻 Tech',
  fitness: '💪 Fitness', mindfulness: '🧘 Mindfulness', social: '👥 Social', learning: '📚 Learning',
};

function getInitials(name: string | null): string {
  if (!name) return 'XP';
  const parts = name.trim().split(' ');
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}

function isUUID(id: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id); }

export default function ProfilePage() {
  const router = useRouter();
  const [interests, setInterests]         = useState<string[]>([]);
  const [completedHunts, setCompleted]    = useState<CompletedHunt[]>([]);
  const [streak, setStreak]               = useState(0);
  const [displayName, setDisplayName]     = useState<string | null>(null);
  const [supabaseLoading, setSBLoading]   = useState(false);
  const [mounted, setMounted]             = useState(false);
  const [subStatus, setSub]               = useState<{ tier: string; isTrialActive: boolean; trialDaysLeft: number; hasUsedTrial: boolean; canUseAI: boolean } | null>(null);

  useEffect(() => {
    const state = loadState();
    if (!state.user?.onboardingComplete) { router.replace('/'); return; }
    setInterests(state.user?.interests ?? []);
    setCompleted(state.completedHunts);
    setStreak(state.streak);
    setMounted(true);
    void fetch('/api/subscription/status').then((r) => r.json()).then((d) => setSub(d as typeof subStatus)).catch(() => {});

    void (async () => {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;
      setSBLoading(true);
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const sb = createClient();
        const { data: { user } } = await sb.auth.getUser();
        if (!user) { setSBLoading(false); return; }
        const { data: profile } = await sb.from('user_profiles').select('display_name, interests').eq('id', user.id).single();
        if (profile?.display_name) setDisplayName(profile.display_name);
        if (profile?.interests?.length) setInterests(profile.interests);
        const { data: progress } = await sb.from('mission_progress').select('mission_id, completed_at').eq('user_id', user.id).not('completed_at', 'is', null).order('completed_at', { ascending: false });
        if (!progress?.length) { setSBLoading(false); return; }
        const ids = [...new Set(progress.map((p: { mission_id: string }) => p.mission_id))];
        const { data: missions } = await sb.from('missions').select('id, title, reward').in('id', ids);
        if (missions?.length) {
          const mMap = new Map((missions as { id: string; title: string; reward: string }[]).map((m) => [m.id, m]));
          const sb2: CompletedHunt[] = progress.filter((p: { mission_id: string }) => mMap.has(p.mission_id)).map((p: { mission_id: string; completed_at: string }) => { const m = mMap.get(p.mission_id)!; return { huntId: p.mission_id, huntTitle: m.title, reward: m.reward, completedAt: p.completed_at }; });
          setCompleted((prev) => { const sbIds = new Set(sb2.map((c) => c.huntId)); const local = prev.filter((c) => !sbIds.has(c.huntId) && !isUUID(c.huntId)); return [...sb2, ...local].sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()); });
        }
      } catch { /* silent */ }
      setSBLoading(false);
    })();
  }, [router]);

  if (!mounted) return null;

  const initials   = getInitials(displayName);
  const name       = displayName ?? 'Explorer';
  const mms        = Math.min(1000, 50 + completedHunts.length * 40 + streak * 15);
  const xpBalance  = 100 + completedHunts.length * 250 + streak * 15;
  const tierLabel  = mms >= 700 ? 'Elite Hunter' : mms >= 400 ? 'Pro Hunter' : mms >= 150 ? 'Verified Hunter' : 'Explorer';
  const tierColor  = mms >= 700 ? WARN : mms >= 400 ? AI : mms >= 150 ? ACCENT : FAINT;

  return (
    <div className="consumer-app" style={{ minHeight: '100vh', paddingBottom: 100, background: BG, color: TXT }}>
      <div style={{ maxWidth: 430, margin: '0 auto' }}>

        {/* ── Header ── */}
        <div style={{ padding: '56px 20px 20px', background: `radial-gradient(600px 400px at 50% 0%, rgba(34,255,170,.06), transparent 60%), ${SURFACE}`, borderBottom: '1px solid rgba(255,255,255,.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: TXT, letterSpacing: '-.02em' }}>Profile</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {supabaseLoading && <Loader2 size={14} style={{ color: FAINT, animation: 'spin 1s linear infinite' }} strokeWidth={2} />}
              <button onClick={() => { if (confirm('Reset all your data and start fresh?')) { clearState(); router.replace('/'); } }}
                style={{ width: 38, height: 38, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', cursor: 'pointer' }}>
                <Settings size={17} strokeWidth={1.8} style={{ color: DIM }} />
              </button>
            </div>
          </div>

          {/* Avatar + identity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div style={{ width: 64, height: 64, borderRadius: 20, flexShrink: 0, background: `linear-gradient(135deg, ${ACCENT}20, ${AI}30)`, border: `2px solid ${ACCENT}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 24px ${ACCENT}25` }}>
              <span style={{ fontSize: 22, fontWeight: 900, color: ACCENT }}>{initials}</span>
            </div>
            <div>
              <p style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: TXT }}>{name}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: tierColor, boxShadow: `0 0 6px ${tierColor}` }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: tierColor }}>{tierLabel}</span>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
            {[
              { label: 'MMS', value: mms,                      accent: ACCENT, icon: TrendingUp },
              { label: 'XP',  value: xpBalance.toLocaleString(), accent: AI,    icon: Star      },
              { label: 'Done', value: completedHunts.length,    accent: ACCENT, icon: Award     },
            ].map(({ label, value, accent, icon: Icon }) => (
              <div key={label} style={{ ...XGLASS, borderRadius: 14, padding: '12px 8px', textAlign: 'center' }}>
                <Icon size={13} strokeWidth={2} style={{ color: accent, marginBottom: 4 }} />
                <div style={{ fontSize: 18, fontWeight: 800, color: accent }}>{value}</div>
                <div style={{ fontSize: 10, fontWeight: 600, color: FAINT, textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: '20px 20px' }}>

          {/* Rewards CTA */}
          <motion.a href="/rewards" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 18, marginBottom: 14, background: 'linear-gradient(135deg, rgba(34,255,170,.07), rgba(109,93,253,.07))', border: '1px solid rgba(34,255,170,.18)', textDecoration: 'none' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#22FFAA,#6D5DFD)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18 }}>🏆</div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 700, color: TXT }}>Rewards & Earnings</p>
              <p style={{ margin: 0, fontSize: 12, color: DIM }}>Badges, payouts, Hunter Score progress</p>
            </div>
            <span style={{ fontSize: 18, color: ACCENT }}>›</span>
          </motion.a>

          {/* Streak card */}
          {streak > 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              style={{ borderRadius: 20, padding: '18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14, background: `rgba(255,184,77,.07)`, border: `1px solid rgba(255,184,77,.18)` }}>
              <div style={{ width: 46, height: 46, borderRadius: 14, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `rgba(255,184,77,.12)` }}>
                <Flame size={22} strokeWidth={2} style={{ color: WARN }} />
              </div>
              <div>
                <p style={{ margin: '0 0 2px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em', color: FAINT }}>Daily Streak</p>
                <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: WARN }}>{streak} Day{streak !== 1 ? 's' : ''}</p>
              </div>
            </motion.div>
          )}

          {/* Plan card */}
          {subStatus && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              style={{ borderRadius: 20, padding: '16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12,
                background: subStatus.isTrialActive ? `rgba(109,93,253,.07)` : subStatus.tier === 'pro' ? `rgba(34,255,170,.06)` : CARD,
                border: `1px solid ${subStatus.isTrialActive ? 'rgba(109,93,253,.2)' : subStatus.tier === 'pro' ? 'rgba(34,255,170,.15)' : 'rgba(255,255,255,.07)'}` }}>
              <div style={{ width: 42, height: 42, borderRadius: 13, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: subStatus.isTrialActive ? `rgba(109,93,253,.12)` : subStatus.tier === 'pro' ? `rgba(34,255,170,.1)` : 'rgba(255,255,255,.04)' }}>
                {subStatus.tier === 'pro' ? <Shield size={20} style={{ color: ACCENT }} strokeWidth={2} /> : subStatus.isTrialActive ? <Sparkles size={20} style={{ color: AI }} strokeWidth={2} /> : <Zap size={20} style={{ color: FAINT }} strokeWidth={2} />}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: '0 0 2px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: FAINT }}>Current Plan</p>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: TXT }}>{subStatus.tier === 'pro' ? 'Pro' : subStatus.isTrialActive ? `Trial · ${subStatus.trialDaysLeft}d left` : 'Free'}</p>
              </div>
              {subStatus.tier !== 'pro' && (
                <button onClick={() => router.push('/upgrade')} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: subStatus.isTrialActive ? AI : ACCENT, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  {subStatus.isTrialActive ? 'Upgrade' : subStatus.hasUsedTrial ? 'Go Pro' : 'Try Free'}
                  <ArrowRight size={12} strokeWidth={2.5} />
                </button>
              )}
            </motion.div>
          )}

          {/* Interests */}
          {interests.length > 0 && (
            <section style={{ marginBottom: 20 }}>
              <h2 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: TXT }}>Your Interests</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {interests.map((id) => (
                  <span key={id} style={{ ...XGLASS, borderRadius: 999, padding: '6px 14px', fontSize: 13, fontWeight: 500, color: TXT }}>{INTEREST_LABELS[id] ?? id}</span>
                ))}
              </div>
            </section>
          )}

          {/* Completed missions */}
          <section>
            <h2 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: TXT }}>Completed {completedHunts.length > 0 && `(${completedHunts.length})`}</h2>

            {completedHunts.length === 0 ? (
              <div style={{ ...XGLASS, borderRadius: 20, padding: '32px 20px', textAlign: 'center' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: `rgba(34,255,170,.08)`, border: `1px solid rgba(34,255,170,.15)`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <Trophy size={22} strokeWidth={1.6} style={{ color: ACCENT }} />
                </div>
                <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: TXT }}>No completed missions yet</p>
                <p style={{ margin: '0 0 18px', fontSize: 13, color: DIM }}>Start your first mission to see it here.</p>
                <button onClick={() => router.push('/missions')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: ACCENT, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  Browse Missions <ArrowRight size={14} strokeWidth={2.5} />
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {completedHunts.map((c, i) => (
                  <motion.div key={c.huntId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                    style={{ ...XGLASS, borderRadius: 18, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 12, flexShrink: 0, background: 'rgba(34,255,170,.1)', border: '1px solid rgba(34,255,170,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CheckCircle size={18} strokeWidth={2} style={{ color: ACCENT }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 600, color: TXT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.huntTitle}</p>
                      <p style={{ margin: '0 0 2px', fontSize: 11, fontWeight: 600, color: ACCENT }}>{c.reward.split('+')[0].trim()}</p>
                      <p style={{ margin: 0, fontSize: 11, color: FAINT }}>{new Date(c.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                    <Trophy size={16} style={{ color: WARN }} strokeWidth={1.8} />
                  </motion.div>
                ))}
              </div>
            )}
          </section>

          <p style={{ textAlign: 'center', fontSize: 11, marginTop: 32, color: FAINT }}>X-hunt · AI Mission Operating System</p>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
