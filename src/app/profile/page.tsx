'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Flame, CheckCircle, Settings, ArrowRight, Trophy, Loader2, Sparkles,
  Shield, Zap, Star, TrendingUp, Brain, Globe, Copy, Check, Pencil, X as XIcon,
} from 'lucide-react';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import { LIQUID_GLASS_STYLE } from '@/components/LiquidGlass';
import { loadState, clearState, loadProfile } from '@/lib/store';
import { t } from '@/theme/colors';
import type { CompletedHunt, ImpactProfile } from '@/lib/types';

const XGLASS: React.CSSProperties = LIQUID_GLASS_STYLE;

/* ── Types ──────────────────────────────────────────────────────────────── */
interface SkillData {
  name: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  confidence: number;
  evidence: string[];
}
interface CategoryData {
  catId: string;
  count: number;
  label: string;
  emoji: string;
  color: string;
}

/* ── Constants ──────────────────────────────────────────────────────────── */
const LEVEL_CFG = {
  Beginner:     { color: t.txtFaint, bg: 'rgba(74,85,120,.15)'   },
  Intermediate: { color: t.accent,   bg: 'rgba(34,255,170,.12)'  },
  Advanced:     { color: t.warning,  bg: 'rgba(255,184,77,.12)'  },
};

const ARCHETYPE_COLORS: Record<string, string> = {
  Explorer: t.accent, Builder: t.ai, Innovator: t.aiLight,
  Mentor: t.warning, Creator: t.error, Analyst: t.info, Activist: t.accent,
};

const INTEREST_LABELS: Record<string, string> = {
  adventure: '🌍 Adventure', food: '🍴 Food', art: '🎨 Art', tech: '💻 Tech',
  fitness: '💪 Fitness', mindfulness: '🧘 Mindfulness', social: '👥 Social', learning: '📚 Learning',
};

const GOAL_LABELS: Record<string, string> = {
  career_growth: '📈 Career Growth', networking: '🤝 Networking', skill_building: '🛠 Skill Building',
  community: '🏘 Community Impact', earning: '💰 Earning', recognition: '🏆 Recognition',
  volunteering: '❤️ Volunteering', entrepreneurship: '🚀 Entrepreneurship',
};

function getInitials(name: string | null) {
  if (!name) return 'XP';
  const p = name.trim().split(' ');
  return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}

function isUUID(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/* ── EditProfileSheet ───────────────────────────────────────────────────── */
interface EditSheetProps {
  open: boolean;
  onClose: () => void;
  initialName: string;
  initialInterests: string[];
  initialGoals: string[];
  onSaved: (name: string, interests: string[], goals: string[]) => void;
}

function EditProfileSheet({ open, onClose, initialName, initialInterests, initialGoals, onSaved }: EditSheetProps) {
  const [name, setName] = useState(initialName);
  const [interests, setInterests] = useState<string[]>(initialInterests);
  const [goals, setGoals] = useState<string[]>(initialGoals);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(initialName);
      setInterests(initialInterests);
      setGoals(initialGoals);
      setError(null);
    }
  }, [open, initialName, initialInterests, initialGoals]);

  function toggleInterest(id: string) {
    setInterests(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }
  function toggleGoal(id: string) {
    setGoals(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: name.trim(), interests, goals }),
      });
      const data = await res.json() as { profile?: { display_name: string; interests: string[]; goals: string[] }; error?: string };
      if (!res.ok) { setError(data.error ?? 'Failed to save'); setSaving(false); return; }
      onSaved(data.profile?.display_name ?? name.trim(), data.profile?.interests ?? interests, data.profile?.goals ?? goals);
      onClose();
    } catch {
      setError('Network error — please try again');
    }
    setSaving(false);
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(5,8,22,.7)', zIndex: 40, backdropFilter: 'blur(4px)' }}
          />
          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
              background: t.surface, borderTop: `1px solid ${t.borderMid}`,
              borderRadius: '24px 24px 0 0', padding: '0 0 40px',
              maxHeight: '90dvh', overflowY: 'auto',
            }}
          >
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: t.border }} />
            </div>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px 20px' }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: t.txt }}>Edit Profile</h2>
              <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,.05)', border: `1px solid ${t.border}`, cursor: 'pointer' }}>
                <XIcon size={16} strokeWidth={2} style={{ color: t.txtDim }} />
              </button>
            </div>

            <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Display name */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>Display Name</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  maxLength={80}
                  placeholder="Your name"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '12px 14px', borderRadius: 14, fontSize: 15, fontWeight: 500,
                    background: t.card, border: `1px solid ${t.borderMid}`, color: t.txt,
                    outline: 'none',
                  }}
                />
              </div>

              {/* Interests */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>Interests</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {Object.entries(INTEREST_LABELS).map(([id, label]) => {
                    const active = interests.includes(id);
                    return (
                      <button key={id} onClick={() => toggleInterest(id)} style={{
                        padding: '7px 14px', borderRadius: 999, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                        background: active ? `${t.accent}18` : 'rgba(255,255,255,.04)',
                        border: `1px solid ${active ? `${t.accent}40` : t.border}`,
                        color: active ? t.accent : t.txtDim,
                        transition: 'all .15s',
                      }}>{label}</button>
                    );
                  })}
                </div>
              </div>

              {/* Goals */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>Goals</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {Object.entries(GOAL_LABELS).map(([id, label]) => {
                    const active = goals.includes(id);
                    return (
                      <button key={id} onClick={() => toggleGoal(id)} style={{
                        padding: '7px 14px', borderRadius: 999, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                        background: active ? `${t.ai}18` : 'rgba(255,255,255,.04)',
                        border: `1px solid ${active ? `${t.ai}40` : t.border}`,
                        color: active ? t.aiLight : t.txtDim,
                        transition: 'all .15s',
                      }}>{label}</button>
                    );
                  })}
                </div>
              </div>

              {error && (
                <p style={{ margin: 0, fontSize: 12, color: t.error, background: `${t.error}10`, border: `1px solid ${t.error}25`, borderRadius: 10, padding: '8px 12px' }}>{error}</p>
              )}

              {/* Save */}
              <button
                onClick={() => void handleSave()}
                disabled={saving || !name.trim()}
                style={{
                  width: '100%', padding: '14px', borderRadius: 16, fontSize: 15, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
                  background: saving ? 'rgba(34,255,170,.15)' : `linear-gradient(135deg, ${t.accent}, ${t.accentDark})`,
                  border: 'none', color: saving ? t.accent : t.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  opacity: !name.trim() ? 0.5 : 1,
                }}
              >
                {saving && <Loader2 size={15} strokeWidth={2} style={{ animation: 'spin 1s linear infinite' }} />}
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ── Page ───────────────────────────────────────────────────────────────── */
export default function ProfilePage() {
  const router = useRouter();
  const [interests, setInterests]       = useState<string[]>([]);
  const [goals, setGoals]               = useState<string[]>([]);
  const [completedHunts, setCompleted]  = useState<CompletedHunt[]>([]);
  const [streak, setStreak]             = useState(0);
  const [displayName, setName]          = useState<string | null>(null);
  const [loading, setLoading]           = useState(false);
  const [mounted, setMounted]           = useState(false);
  const [subStatus, setSub]             = useState<{ tier: string; isTrialActive: boolean; trialDaysLeft: number; hasUsedTrial: boolean; canUseAI: boolean } | null>(null);
  const [impactProfile, setProfile]     = useState<ImpactProfile | null>(null);
  const [skills, setSkills]             = useState<SkillData[]>([]);
  const [categories, setCategories]     = useState<CategoryData[]>([]);
  const [copied, setCopied]             = useState(false);
  const [showEdit, setShowEdit]         = useState(false);

  useEffect(() => {
    const state = loadState();
    if (!state.user?.onboardingComplete) { router.replace('/get-started'); return; }
    setInterests(state.user?.interests ?? []);
    setCompleted(state.completedHunts);
    setStreak(state.streak);
    setMounted(true);
    setProfile(loadProfile());
    void fetch('/api/subscription/status').then((r) => r.json()).then((d) => setSub(d as typeof subStatus)).catch(() => {});

    void (async () => {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;
      setLoading(true);
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const sb = createClient();
        const { data: { user } } = await sb.auth.getUser();
        if (!user) { setLoading(false); return; }

        const { data: profile } = await sb.from('user_profiles').select('display_name, interests, goals').eq('id', user.id).single();
        if (profile?.display_name) setName(profile.display_name);
        if (profile?.interests?.length) setInterests(profile.interests);
        if (profile?.goals?.length) setGoals(profile.goals);

        const { data: progress } = await sb
          .from('mission_progress')
          .select('mission_id, completed_at')
          .eq('user_id', user.id)
          .not('completed_at', 'is', null)
          .order('completed_at', { ascending: false });

        if (progress?.length) {
          const ids = [...new Set(progress.map((p: { mission_id: string }) => p.mission_id))];
          const { data: missions } = await sb.from('missions').select('id, title, reward').in('id', ids);
          if (missions?.length) {
            const mMap = new Map((missions as { id: string; title: string; reward: string }[]).map((m) => [m.id, m]));
            const merged: CompletedHunt[] = progress
              .filter((p: { mission_id: string }) => mMap.has(p.mission_id))
              .map((p: { mission_id: string; completed_at: string }) => {
                const m = mMap.get(p.mission_id)!;
                return { huntId: p.mission_id, huntTitle: m.title, reward: m.reward, completedAt: p.completed_at };
              });
            setCompleted((prev) => {
              const sbIds = new Set(merged.map((c) => c.huntId));
              const local = prev.filter((c) => !sbIds.has(c.huntId) && !isUUID(c.huntId));
              return [...merged, ...local].sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
            });
          }
        }

        const skillsRes = await fetch('/api/skills/infer');
        if (skillsRes.ok) {
          const data = await skillsRes.json() as { skills: SkillData[]; topCategories: CategoryData[] };
          setSkills(data.skills ?? []);
          setCategories(data.topCategories ?? []);
        }
      } catch { /* silent */ }
      setLoading(false);
    })();
  }, [router]);

  if (!mounted) return null;

  const initials   = getInitials(displayName);
  const name       = displayName ?? 'Explorer';
  const mms        = Math.min(1000, 50 + completedHunts.length * 40 + streak * 15);
  const tierLabel  = mms >= 700 ? 'Elite Hunter' : mms >= 400 ? 'Pro Hunter' : mms >= 150 ? 'Verified Hunter' : 'Explorer';
  const tierColor  = mms >= 700 ? t.warning : mms >= 400 ? t.ai : mms >= 150 ? t.accent : t.txtFaint;
  const impactScore = completedHunts.length * 12 + streak * 5 + categories.length * 8;
  const aColor = ARCHETYPE_COLORS[impactProfile?.archetype ?? ''] ?? t.accent;

  function copyLink() {
    void navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="consumer-app" style={{ minHeight: '100vh', paddingBottom: 100, background: t.bg, color: t.txt }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>

        {/* ── Hero ── */}
        <div style={{
          padding: '56px 20px 24px',
          background: `radial-gradient(600px 500px at 50% -40px, rgba(34,255,170,.06) 0%, rgba(109,93,253,.04) 40%, transparent 70%), ${t.surface}`,
          borderBottom: `1px solid rgba(255,255,255,.07)`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: t.txt, letterSpacing: '-.02em' }}>Impact Portfolio</h1>
            <div style={{ display: 'flex', gap: 8 }}>
              {loading && <Loader2 size={14} style={{ color: t.txtFaint, animation: 'spin 1s linear infinite', marginTop: 3 }} strokeWidth={2} />}
              <button onClick={copyLink} title="Copy portfolio link"
                style={{ width: 38, height: 38, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${t.accent}12`, border: `1px solid ${t.accent}2E`, cursor: 'pointer' }}>
                {copied
                  ? <Check size={15} strokeWidth={2.5} style={{ color: t.accent }} />
                  : <Copy size={15} strokeWidth={1.8} style={{ color: t.accent }} />}
              </button>
              <button onClick={() => setShowEdit(true)} title="Edit profile"
                style={{ width: 38, height: 38, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,.04)', border: `1px solid ${t.border}`, cursor: 'pointer' }}>
                <Pencil size={15} strokeWidth={1.8} style={{ color: t.txtDim }} />
              </button>
              <button
                onClick={() => { if (confirm('Reset all data and start fresh?')) { clearState(); router.replace('/'); } }}
                style={{ width: 38, height: 38, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,.04)', border: `1px solid ${t.border}`, cursor: 'pointer' }}>
                <Settings size={16} strokeWidth={1.8} style={{ color: t.txtDim }} />
              </button>
            </div>
          </div>

          {/* Avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ width: 68, height: 68, borderRadius: 22, background: `linear-gradient(135deg, ${t.accent}22, ${t.ai}30)`, border: `2px solid ${t.accent}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 28px ${t.accent}20` }}>
                <span style={{ fontSize: 24, fontWeight: 900, color: t.accent }}>{initials}</span>
              </div>
              <div style={{ position: 'absolute', bottom: -4, right: -4, width: 20, height: 20, borderRadius: '50%', background: t.card, border: `2px solid ${t.bg}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: tierColor, boxShadow: `0 0 8px ${tierColor}` }} />
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, color: t.txt, letterSpacing: '-.02em' }}>{name}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: tierColor, background: `${tierColor}14`, border: `1px solid ${tierColor}28`, borderRadius: 999, padding: '2px 10px' }}>{tierLabel}</span>
                {impactProfile?.archetype && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: aColor, background: `${aColor}12`, border: `1px solid ${aColor}22`, borderRadius: 999, padding: '2px 10px' }}>{impactProfile.archetype}</span>
                )}
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {[
              { label: 'MMS',      value: mms,                   accent: t.accent,  icon: TrendingUp },
              { label: 'Missions', value: completedHunts.length, accent: t.accent,  icon: Trophy     },
              { label: 'Skills',   value: skills.length,         accent: t.ai,      icon: Brain      },
              { label: 'Impact',   value: impactScore,           accent: t.warning, icon: Star       },
            ].map(({ label, value, accent, icon: Icon }) => (
              <div key={label} className="liquid-glass" style={{ ...XGLASS, borderRadius: 14, padding: '11px 6px', textAlign: 'center' }}>
                <Icon size={12} strokeWidth={2} style={{ color: accent, marginBottom: 4 }} />
                <div style={{ fontSize: 17, fontWeight: 800, color: accent, lineHeight: 1 }}>{value.toLocaleString()}</div>
                <div style={{ fontSize: 9.5, fontWeight: 600, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 3 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: '20px' }}>

          {/* ── Skills Intelligence ── */}
          {skills.length > 0 && (
            <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: t.txt }}>Skills</h2>
                <span style={{ fontSize: 10, fontWeight: 700, color: t.txtFaint, background: 'rgba(255,255,255,.04)', border: `1px solid ${t.border}`, borderRadius: 999, padding: '3px 10px', textTransform: 'uppercase', letterSpacing: '.07em' }}>AI Inferred</span>
              </div>
              <div className="liquid-glass" style={{ ...XGLASS, borderRadius: 20, padding: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                  {skills.slice(0, 6).map((s, i) => {
                    const cfg = LEVEL_CFG[s.level] ?? LEVEL_CFG.Beginner;
                    return (
                      <motion.div key={s.name} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 12.5, fontWeight: 600, color: t.txtDim }}>{s.name}</span>
                            <span style={{ fontSize: 9, fontWeight: 800, color: cfg.color, background: cfg.bg, borderRadius: 999, padding: '1px 7px', textTransform: 'uppercase', letterSpacing: '.06em' }}>{s.level}</span>
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 800, color: cfg.color }}>{s.confidence}%</span>
                        </div>
                        <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,.05)', overflow: 'hidden' }}>
                          <motion.div
                            initial={{ width: 0 }} animate={{ width: `${s.confidence}%` }}
                            transition={{ duration: 0.7, delay: 0.2 + i * 0.06 }}
                            style={{ height: '100%', borderRadius: 3, background: `linear-gradient(90deg, ${cfg.color}70, ${cfg.color})` }}
                          />
                        </div>
                        {s.evidence.length > 0 && (
                          <p style={{ margin: '4px 0 0', fontSize: 10, color: t.txtFaint }}>via {s.evidence.slice(0, 2).join(' · ')}</p>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </motion.section>
          )}

          {/* ── Impact Areas / SDG Categories ── */}
          {categories.length > 0 && (
            <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} style={{ marginBottom: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: t.txt }}>Impact Areas</h2>
                <Globe size={13} strokeWidth={2} style={{ color: t.txtFaint }} />
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {categories.map((cat) => (
                  <div key={cat.catId} style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 999, padding: '6px 13px', background: `${cat.color}0F`, border: `1px solid ${cat.color}25` }}>
                    <span style={{ fontSize: 13 }}>{cat.emoji}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: cat.color }}>{cat.label}</span>
                    <span style={{ fontSize: 9.5, fontWeight: 700, color: cat.color, background: `${cat.color}18`, borderRadius: 999, padding: '0 5px' }}>{cat.count}</span>
                  </div>
                ))}
              </div>
            </motion.section>
          )}

          {/* ── Rewards CTA ── */}
          <motion.a href="/rewards" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 18, marginBottom: 14, background: `linear-gradient(135deg, ${t.accent}12, ${t.ai}12)`, border: `1px solid ${t.accent}2E`, textDecoration: 'none' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: `linear-gradient(135deg,${t.accent},${t.ai})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18 }}>🏆</div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 700, color: t.txt }}>Rewards & Earnings</p>
              <p style={{ margin: 0, fontSize: 12, color: t.txtDim }}>Badges, payouts, Hunter Score progress</p>
            </div>
            <ArrowRight size={16} strokeWidth={2} style={{ color: t.accent, flexShrink: 0 }} />
          </motion.a>

          {/* ── Streak ── */}
          {streak > 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              style={{ borderRadius: 20, padding: '16px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14, background: `${t.warning}12`, border: `1px solid ${t.warning}2E` }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${t.warning}1E` }}>
                <Flame size={22} strokeWidth={2} style={{ color: t.warning }} />
              </div>
              <div>
                <p style={{ margin: '0 0 1px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: t.txtFaint }}>Daily Streak</p>
                <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: t.warning }}>{streak} Day{streak !== 1 ? 's' : ''}</p>
              </div>
            </motion.div>
          )}

          {/* ── Plan Card ── */}
          {subStatus && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              style={{ borderRadius: 20, padding: '14px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12,
                background: subStatus.isTrialActive ? `${t.ai}12` : subStatus.tier === 'pro' ? `${t.accent}0F` : t.card,
                border: `1px solid ${subStatus.isTrialActive ? `${t.ai}33` : subStatus.tier === 'pro' ? `${t.accent}26` : t.border}` }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: subStatus.isTrialActive ? `${t.ai}1E` : subStatus.tier === 'pro' ? `${t.accent}1A` : 'rgba(255,255,255,.04)' }}>
                {subStatus.tier === 'pro' ? <Shield size={19} style={{ color: t.accent }} strokeWidth={2} /> : subStatus.isTrialActive ? <Sparkles size={19} style={{ color: t.ai }} strokeWidth={2} /> : <Zap size={19} style={{ color: t.txtFaint }} strokeWidth={2} />}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: '0 0 1px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: t.txtFaint }}>Current Plan</p>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: t.txt }}>{subStatus.tier === 'pro' ? 'Pro' : subStatus.isTrialActive ? `Trial · ${subStatus.trialDaysLeft}d left` : 'Free'}</p>
              </div>
              {subStatus.tier !== 'pro' && (
                <button onClick={() => router.push('/upgrade')} style={{ fontSize: 12, fontWeight: 700, color: subStatus.isTrialActive ? t.ai : t.accent, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, padding: 0, flexShrink: 0 }}>
                  {subStatus.isTrialActive ? 'Upgrade' : subStatus.hasUsedTrial ? 'Go Pro' : 'Try Free'} <ArrowRight size={12} strokeWidth={2.5} />
                </button>
              )}
            </motion.div>
          )}

          {/* ── Impact DNA ── */}
          {impactProfile && (
            <section style={{ marginBottom: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: t.txt }}>Impact DNA</h2>
                <span style={{ fontSize: 10, fontWeight: 700, color: t.txtFaint, background: 'rgba(255,255,255,.04)', border: `1px solid ${t.border}`, borderRadius: 999, padding: '3px 10px', textTransform: 'uppercase', letterSpacing: '.07em' }}>AI Profile</span>
              </div>

              <div style={{ borderRadius: 20, padding: '14px 16px', background: `linear-gradient(135deg, ${aColor}0D, ${t.ai}0A)`, border: `1px solid ${aColor}26`, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 46, height: 46, borderRadius: 14, background: `${aColor}1E`, border: `1.5px solid ${aColor}4D`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Brain size={21} strokeWidth={1.5} style={{ color: aColor }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 1px', fontSize: 10, fontWeight: 700, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '.08em' }}>Archetype</p>
                  <p style={{ margin: '0 0 3px', fontSize: 18, fontWeight: 900, color: aColor, letterSpacing: '-.02em' }}>{impactProfile.archetype}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: 10, color: t.txtFaint }}>Impact Score</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: aColor }}>{impactProfile.impactScore}</span>
                    <span style={{ fontSize: 10, color: t.txtFaint }}>/ 100</span>
                  </div>
                </div>
              </div>

              {impactProfile.strengths.length > 0 && (
                <div className="liquid-glass" style={{ ...XGLASS, borderRadius: 18, padding: '14px 16px', marginBottom: 10 }}>
                  <p style={{ margin: '0 0 12px', fontSize: 10, fontWeight: 700, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '.08em' }}>Top Strengths</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                    {impactProfile.strengths.slice(0, 4).map((s) => (
                      <div key={s.name}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 11, color: t.txtDim, fontWeight: 600 }}>{s.name}</span>
                          <span style={{ fontSize: 11, color: aColor, fontWeight: 800 }}>{s.score}%</span>
                        </div>
                        <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,.05)', overflow: 'hidden' }}>
                          <motion.div
                            initial={{ width: 0 }} animate={{ width: `${s.score}%` }}
                            transition={{ duration: 0.7, ease: 'easeOut' }}
                            style={{ height: '100%', borderRadius: 3, background: `linear-gradient(90deg, ${aColor}CC, ${aColor})` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {impactProfile.causes.length > 0 && (
                  <div className="liquid-glass" style={{ ...XGLASS, borderRadius: 16, padding: '12px 14px' }}>
                    <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '.08em' }}>Causes</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {impactProfile.causes.map((c) => (
                        <span key={c} style={{ fontSize: 9.5, fontWeight: 700, color: t.accent, background: `${t.accent}1A`, border: `1px solid ${t.accent}33`, borderRadius: 999, padding: '2px 8px' }}>{c}</span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="liquid-glass" style={{ ...XGLASS, borderRadius: 16, padding: '12px 14px' }}>
                  <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '.08em' }}>Availability</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Sparkles size={11} style={{ color: t.accent }} strokeWidth={2} />
                    <span style={{ fontSize: 11, color: t.txt, fontWeight: 600 }}>{impactProfile.availability}</span>
                  </div>
                  <p style={{ margin: '5px 0 0', fontSize: 9.5, color: t.txtFaint }}>per week</p>
                </div>
              </div>
            </section>
          )}

          {/* ── Interests ── */}
          {interests.length > 0 && (
            <section style={{ marginBottom: 22 }}>
              <h2 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: t.txt }}>Interests</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {interests.map((id) => (
                  <span key={id} style={{ ...XGLASS, borderRadius: 999, padding: '6px 14px', fontSize: 13, fontWeight: 500, color: t.txt }}>{INTEREST_LABELS[id] ?? id}</span>
                ))}
              </div>
            </section>
          )}

          {/* ── Goals ── */}
          {goals.length > 0 && (
            <section style={{ marginBottom: 22 }}>
              <h2 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: t.txt }}>Goals</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {goals.map((id) => (
                  <span key={id} style={{ borderRadius: 999, padding: '6px 14px', fontSize: 13, fontWeight: 500, color: t.aiLight, background: `${t.ai}12`, border: `1px solid ${t.ai}22` }}>{GOAL_LABELS[id] ?? id}</span>
                ))}
              </div>
            </section>
          )}

          {/* ── Mission Timeline ── */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: t.txt }}>
                Mission History {completedHunts.length > 0 && `(${completedHunts.length})`}
              </h2>
              {completedHunts.length > 0 && (
                <Link href="/missions" style={{ fontSize: 11, fontWeight: 600, color: t.accent, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
                  Browse More <ArrowRight size={11} strokeWidth={2.5} />
                </Link>
              )}
            </div>

            {completedHunts.length === 0 ? (
              <div className="liquid-glass" style={{ ...XGLASS, borderRadius: 20, padding: '32px 20px', textAlign: 'center' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: `${t.accent}14`, border: `1px solid ${t.accent}26`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <Trophy size={22} strokeWidth={1.6} style={{ color: t.accent }} />
                </div>
                <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: t.txt }}>No completed missions yet</p>
                <p style={{ margin: '0 0 18px', fontSize: 13, color: t.txtDim }}>Complete missions to build your impact portfolio.</p>
                <button onClick={() => router.push('/missions')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: t.accent, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  Browse Missions <ArrowRight size={14} strokeWidth={2.5} />
                </button>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: 19, top: 8, bottom: 8, width: 2, background: 'rgba(255,255,255,.05)', borderRadius: 1 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {completedHunts.map((c, i) => (
                    <motion.div key={c.huntId} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                      style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, background: t.card, border: `2px solid ${t.accent}59`, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1, marginTop: 11 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.accent, boxShadow: `0 0 6px ${t.accent}CC` }} />
                      </div>
                      <div className="liquid-glass" style={{ flex: 1, ...XGLASS, borderRadius: 18, padding: '13px 15px' }}>
                        <p style={{ margin: '0 0 3px', fontSize: 13.5, fontWeight: 600, color: t.txt, lineHeight: 1.3 }}>{c.huntTitle}</p>
                        <p style={{ margin: '0 0 8px', fontSize: 11.5, fontWeight: 600, color: t.accent }}>{c.reward.split('+')[0].trim()}</p>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <p style={{ margin: 0, fontSize: 10.5, color: t.txtFaint }}>
                            {new Date(c.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <CheckCircle size={11} strokeWidth={2} style={{ color: t.accent }} />
                            <span style={{ fontSize: 10, fontWeight: 700, color: t.accent }}>Completed</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <p style={{ textAlign: 'center', fontSize: 11, marginTop: 32, color: t.txtFaint }}>XHunt · AI-Powered Outcome Intelligence</p>
        </div>
      </div>
      <BottomNav />

      <EditProfileSheet
        open={showEdit}
        onClose={() => setShowEdit(false)}
        initialName={displayName ?? ''}
        initialInterests={interests}
        initialGoals={goals}
        onSaved={(newName, newInterests, newGoals) => {
          if (newName) setName(newName);
          setInterests(newInterests);
          setGoals(newGoals);
        }}
      />
    </div>
  );
}
