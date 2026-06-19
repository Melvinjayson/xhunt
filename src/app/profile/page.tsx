'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Flame, CheckCircle, Settings, ArrowRight, Trophy, Loader2, Sparkles,
  Shield, Zap, Star, TrendingUp, Brain, Globe, Copy, Check, ChevronRight,
  Users, BarChart2, Clock, Link2,
} from 'lucide-react';
import Link from 'next/link';
import { loadState, clearState, loadProfile } from '@/lib/store';
import { useAuth } from '@/lib/auth/context';
import type { CompletedHunt, ImpactProfile } from '@/lib/types';
import { t } from '@/theme/colors';
import Surface from '@/components/consumer/Surface';
import ProgressBar from '@/components/consumer/ProgressBar';

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
  Beginner:     { color: t.txtFaint, bg: `${t.txtFaint}18` },
  Intermediate: { color: t.accent,   bg: `${t.accent}18`  },
  Advanced:     { color: t.warning,  bg: `${t.warning}18` },
};

const ARCHETYPE_COLORS: Record<string, string> = {
  Explorer: t.accent, Builder: t.ai, Innovator: t.aiLight,
  Mentor: t.warning, Creator: t.error, Analyst: t.info, Activist: t.accent,
};

const INTEREST_LABELS: Record<string, string> = {
  adventure: '🌍 Adventure', food: '🍴 Food', art: '🎨 Art', tech: '💻 Tech',
  fitness: '💪 Fitness', mindfulness: '🧘 Mindfulness', social: '👥 Social', learning: '📚 Learning',
};

function getInitials(name: string | null): string {
  if (!name) return 'XP';
  const p = name.trim().split(' ');
  return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}

function isUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

function timeAgo(iso: string): string {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 3600)  return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

/* ── Token-styled chip ──────────────────────────────────────────────────── */
function Tag({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 10px',
        borderRadius: 100,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.02em',
        color,
        background: `${color}14`,
        border: `1px solid ${color}28`,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}

/* ── Token-styled progress bar (inline, no animation) ───────────────────── */
function SkillBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        style={{
          height: '100%',
          borderRadius: 3,
          background: `linear-gradient(90deg, ${color}60, ${color})`,
        }}
      />
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────────────────── */
export default function ProfilePage() {
  const router = useRouter();
  const { user: authUser, isLoaded } = useAuth();
  const [interests, setInterests]       = useState<string[]>([]);
  const [completedHunts, setCompleted]  = useState<CompletedHunt[]>([]);
  const [streak, setStreak]             = useState(0);
  const [displayName, setName]          = useState<string | null>(null);
  const [loading, setLoading]           = useState(false);
  const [mounted, setMounted]           = useState(false);
  const [subStatus, setSub]             = useState<{
    tier: string; isTrialActive: boolean; trialDaysLeft: number;
    hasUsedTrial: boolean; canUseAI: boolean;
  } | null>(null);
  const [impactProfile, setProfile]     = useState<ImpactProfile | null>(null);
  const [skills, setSkills]             = useState<SkillData[]>([]);
  const [categories, setCategories]     = useState<CategoryData[]>([]);
  const [copied, setCopied]             = useState(false);
  const [completionRate, setCompletionRate]     = useState(0);
  const [verificationRate, setVerificationRate] = useState(0);
  const [trustScore, setTrustScore]             = useState(0);

  useEffect(() => {
    const state = loadState();
    if (!state.user?.onboardingComplete) { router.replace('/get-started'); return; }
    setInterests(state.user?.interests ?? []);
    setCompleted(state.completedHunts);
    setStreak(state.streak);
    setMounted(true);
    setProfile(loadProfile());

    const completedCount = state.completedHunts.length;
    const totalStarted   = Object.keys(state.progress).length;
    const vMap           = state.verificationStatus ?? {};
    const submittedCount = Object.values(vMap).length;
    const approvedCount  = Object.values(vMap).filter(v => v.status === 'approved').length;
    const cr = Math.round((completedCount / Math.max(totalStarted, 1)) * 100);
    const vr = Math.round((approvedCount  / Math.max(submittedCount, 1)) * 100);
    setCompletionRate(cr);
    setVerificationRate(vr);
    setTrustScore(Math.round((cr * 0.5) + (vr * 0.3) + (((loadProfile()?.impactScore) ?? 0) * 0.2)));

    void fetch('/api/subscription/status')
      .then((r) => r.json())
      .then((d) => setSub(d as typeof subStatus))
      .catch(() => {});

    void (async () => {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !authUser) return;
      setLoading(true);
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const sb = createClient();

        const { data: profile } = await sb
          .from('user_profiles')
          .select('display_name, interests')
          .eq('id', authUser.id)
          .single();
        if (profile?.display_name) setName(profile.display_name);
        if (profile?.interests?.length) setInterests(profile.interests);

        const { data: progress } = await sb
          .from('mission_progress')
          .select('mission_id, completed_at')
          .eq('user_id', authUser.id)
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
              return [...merged, ...local].sort(
                (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
              );
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
  }, [router, authUser, isLoaded]);

  if (!mounted) return null;

  const initials    = getInitials(displayName);
  const name        = displayName ?? 'Explorer';
  const mms         = Math.min(1000, 50 + completedHunts.length * 40 + streak * 15);
  const tierLabel   = mms >= 700 ? 'Elite Hunter' : mms >= 400 ? 'Pro Hunter' : mms >= 150 ? 'Verified Hunter' : 'Explorer';
  const tierColor   = mms >= 700 ? t.warning : mms >= 400 ? t.ai : mms >= 150 ? t.accent : t.txtFaint;
  const impactScore = completedHunts.length * 12 + streak * 5 + categories.length * 8;
  const aColor      = ARCHETYPE_COLORS[impactProfile?.archetype ?? ''] ?? t.accent;

  function copyLink() {
    void navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="consumer-app" style={{ minHeight: '100vh', paddingBottom: 100, color: t.txt }}>
      <div className="consumer-app-inner">

        {/* ── Hero ── */}
        <div
          style={{
            padding: '56px 20px 24px',
            background: `radial-gradient(600px 500px at 50% -40px, ${t.accent}08 0%, ${t.ai}06 40%, transparent 70%), ${t.surface}`,
            borderBottom: `1px solid ${t.border}`,
          }}
        >
          {/* Title bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: t.txt, letterSpacing: '-0.02em' }}>
              Impact Portfolio
            </h1>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {loading && <Loader2 size={14} color={t.txtFaint} style={{ animation: 'spin 1s linear infinite' }} />}
              <button
                onClick={copyLink}
                title="Copy portfolio link"
                style={{
                  width: 38, height: 38, borderRadius: 12, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `${t.accent}10`, border: `1px solid ${t.accent}25`,
                }}
              >
                {copied
                  ? <Check size={15} color={t.accent} />
                  : <Copy size={15} color={t.accent} />}
              </button>
              <button
                onClick={() => {
                  if (confirm('Reset all data and start fresh?')) {
                    clearState();
                    router.replace('/');
                  }
                }}
                style={{
                  width: 38, height: 38, borderRadius: 12, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(255,255,255,0.04)', border: `1px solid ${t.border}`,
                }}
              >
                <Settings size={16} color={t.txtDim} />
              </button>
            </div>
          </div>

          {/* Avatar + name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div
                style={{
                  width: 68, height: 68, borderRadius: 22,
                  background: `linear-gradient(135deg, ${t.accent}22, ${t.ai}30)`,
                  border: `2px solid ${t.accent}40`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 0 28px ${t.accent}20`,
                }}
              >
                <span style={{ fontSize: 24, fontWeight: 900, color: t.accent }}>{initials}</span>
              </div>
              {/* Online dot */}
              <div
                style={{
                  position: 'absolute', bottom: -4, right: -4,
                  width: 20, height: 20, borderRadius: '50%',
                  background: t.card, border: `2px solid ${t.bg}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: tierColor, boxShadow: `0 0 8px ${tierColor}` }} />
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 800, color: t.txt, letterSpacing: '-0.02em' }}>{name}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <Tag label={tierLabel} color={tierColor} />
                {impactProfile?.archetype && (
                  <Tag label={impactProfile.archetype} color={aColor} />
                )}
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4" style={{ gap: 8 }}>
            {[
              { label: 'MMS',      value: mms,                   color: t.accent,  Icon: TrendingUp },
              { label: 'Missions', value: completedHunts.length, color: t.accent,  Icon: Trophy     },
              { label: 'Skills',   value: skills.length,         color: t.ai,      Icon: Brain      },
              { label: 'Impact',   value: impactScore,           color: t.warning, Icon: Star       },
            ].map(({ label, value, color, Icon }) => (
              <div
                key={label}
                style={{
                  borderRadius: 14, padding: '11px 6px', textAlign: 'center',
                  background: t.card, border: `1px solid ${t.border}`,
                }}
              >
                <Icon size={12} color={color} style={{ marginBottom: 4 }} />
                <div style={{ fontSize: 17, fontWeight: 800, color, lineHeight: 1 }}>{value.toLocaleString()}</div>
                <div style={{ fontSize: 9.5, fontWeight: 600, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 3 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:flex lg:gap-8 lg:items-start" style={{ padding: '20px' }}>

          {/* Left column */}
          <div className="lg:flex-1 lg:min-w-0">

          {/* ── Participation Passport Metrics ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: 10, marginBottom: 20 }}>
            {[
              { label: 'Completion Rate', value: `${completionRate}%`,   color: t.accent  },
              { label: 'Verification',    value: `${verificationRate}%`, color: t.ai      },
              { label: 'Trust Score',     value: String(trustScore),     color: t.warning },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                style={{
                  padding: 12, borderRadius: 14, textAlign: 'center',
                  background: t.surface, border: `1px solid ${t.border}`,
                }}
              >
                <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color, letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</p>
                <p style={{ margin: '4px 0 0', fontSize: 9.5, color: t.txtFaint, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
              </div>
            ))}
          </div>

          {/* ── Skills Intelligence ── */}
          {skills.length > 0 && (
            <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: t.txt }}>Skills</h2>
                <span
                  style={{
                    fontSize: 10, fontWeight: 700, color: t.txtFaint, letterSpacing: '0.07em',
                    textTransform: 'uppercase', background: 'rgba(255,255,255,0.04)',
                    border: `1px solid ${t.border}`, borderRadius: 999, padding: '3px 10px',
                  }}
                >
                  AI Inferred
                </span>
              </div>
              <Surface variant="card">
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {skills.slice(0, 6).map((s, i) => {
                    const cfg = LEVEL_CFG[s.level] ?? LEVEL_CFG.Beginner;
                    return (
                      <motion.div key={s.name} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 12.5, fontWeight: 600, color: t.txtDim }}>{s.name}</span>
                            <span
                              style={{
                                fontSize: 9, fontWeight: 800, color: cfg.color,
                                background: cfg.bg, borderRadius: 999, padding: '1px 7px',
                                textTransform: 'uppercase', letterSpacing: '0.06em',
                              }}
                            >
                              {s.level}
                            </span>
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 800, color: cfg.color }}>{s.confidence}%</span>
                        </div>
                        <SkillBar value={s.confidence} color={cfg.color} />
                        {s.evidence.length > 0 && (
                          <p style={{ margin: '4px 0 0', fontSize: 10, color: t.txtFaint }}>
                            via {s.evidence.slice(0, 2).join(' · ')}
                          </p>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </Surface>
            </motion.section>
          )}

          {/* ── Impact Areas ── */}
          {categories.length > 0 && (
            <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} style={{ marginBottom: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: t.txt }}>Impact Areas</h2>
                <Globe size={13} color={t.txtFaint} />
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {categories.map((cat) => (
                  <div
                    key={cat.catId}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      borderRadius: 999, padding: '6px 13px',
                      background: `${cat.color}10`, border: `1px solid ${cat.color}28`,
                    }}
                  >
                    <span style={{ fontSize: 13 }}>{cat.emoji}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: cat.color }}>{cat.label}</span>
                    <span
                      style={{
                        fontSize: 9.5, fontWeight: 700, color: cat.color,
                        background: `${cat.color}18`, borderRadius: 999, padding: '0 5px',
                      }}
                    >
                      {cat.count}
                    </span>
                  </div>
                ))}
              </div>
            </motion.section>
          )}

          {/* ── Impact DNA ── */}
          {impactProfile && (
            <section style={{ marginBottom: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: t.txt }}>Impact DNA</h2>
                <span
                  style={{
                    fontSize: 10, fontWeight: 700, color: t.txtFaint, letterSpacing: '0.07em',
                    textTransform: 'uppercase', background: 'rgba(255,255,255,0.04)',
                    border: `1px solid ${t.border}`, borderRadius: 999, padding: '3px 10px',
                  }}
                >
                  AI Profile
                </span>
              </div>

              {/* Archetype card */}
              <div
                style={{
                  borderRadius: 20, padding: '14px 16px', marginBottom: 10,
                  background: `linear-gradient(135deg, ${aColor}08, ${t.ai}06)`,
                  border: `1px solid ${aColor}18`,
                  display: 'flex', alignItems: 'center', gap: 14,
                }}
              >
                <div
                  style={{
                    width: 46, height: 46, borderRadius: 14, flexShrink: 0,
                    background: `${aColor}18`, border: `1.5px solid ${aColor}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Brain size={21} color={aColor} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 1px', fontSize: 10, fontWeight: 700, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Archetype</p>
                  <p style={{ margin: '0 0 3px', fontSize: 18, fontWeight: 900, color: aColor, letterSpacing: '-0.02em' }}>{impactProfile.archetype}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: 10, color: t.txtFaint }}>Impact Score</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: aColor }}>{impactProfile.impactScore}</span>
                    <span style={{ fontSize: 10, color: t.txtFaint }}>/ 100</span>
                  </div>
                </div>
              </div>

              {/* Strengths */}
              {impactProfile.strengths.length > 0 && (
                <Surface variant="card" style={{ marginBottom: 10 }}>
                  <div style={{ padding: '14px 16px' }}>
                    <p style={{ margin: '0 0 12px', fontSize: 10, fontWeight: 700, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Top Strengths</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {impactProfile.strengths.slice(0, 4).map((s) => (
                        <div key={s.name}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                            <span style={{ fontSize: 11, color: t.txtDim, fontWeight: 600 }}>{s.name}</span>
                            <span style={{ fontSize: 11, color: aColor, fontWeight: 800 }}>{s.score}%</span>
                          </div>
                          <SkillBar value={s.score} color={aColor} />
                        </div>
                      ))}
                    </div>
                  </div>
                </Surface>
              )}

              {/* Causes + Availability */}
              <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 10 }}>
                {impactProfile.causes.length > 0 && (
                  <Surface variant="inset">
                    <div style={{ padding: '12px 14px' }}>
                      <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Causes</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {impactProfile.causes.map((c) => (
                          <Tag key={c} label={c} color={t.accent} />
                        ))}
                      </div>
                    </div>
                  </Surface>
                )}
                <Surface variant="inset">
                  <div style={{ padding: '12px 14px' }}>
                    <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Availability</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Sparkles size={11} color={t.accent} />
                      <span style={{ fontSize: 11, color: t.txt, fontWeight: 600 }}>{impactProfile.availability}</span>
                    </div>
                    <p style={{ margin: '5px 0 0', fontSize: 9.5, color: t.txtFaint }}>per week</p>
                  </div>
                </Surface>
              </div>
            </section>
          )}

          {/* ── Interests ── */}
          {interests.length > 0 && (
            <section style={{ marginBottom: 22 }}>
              <h2 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: t.txt }}>Interests</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {interests.map((id) => (
                  <span
                    key={id}
                    style={{
                      borderRadius: 999, padding: '6px 14px', fontSize: 13, fontWeight: 500,
                      color: t.txt, background: t.card, border: `1px solid ${t.border}`,
                    }}
                  >
                    {INTEREST_LABELS[id] ?? id}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* ── Streak ── */}
          {streak > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              style={{
                borderRadius: 20, padding: '16px 18px', marginBottom: 16,
                display: 'flex', alignItems: 'center', gap: 14,
                background: `${t.warning}08`, border: `1px solid ${t.warning}20`,
              }}
            >
              <div
                style={{
                  width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `${t.warning}12`,
                }}
              >
                <Flame size={22} color={t.warning} />
              </div>
              <div>
                <p style={{ margin: '0 0 1px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: t.txtFaint }}>Daily Streak</p>
                <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: t.warning }}>{streak} Day{streak !== 1 ? 's' : ''}</p>
              </div>
            </motion.div>
          )}

          {/* ── Plan card ── */}
          {subStatus && (
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              style={{
                borderRadius: 20, padding: '14px 16px', marginBottom: 16,
                display: 'flex', alignItems: 'center', gap: 12,
                background: subStatus.isTrialActive ? `${t.ai}08` : subStatus.tier === 'pro' ? `${t.accent}06` : t.card,
                border: `1px solid ${subStatus.isTrialActive ? `${t.ai}28` : subStatus.tier === 'pro' ? `${t.accent}20` : t.border}`,
              }}
            >
              <div
                style={{
                  width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: subStatus.isTrialActive ? `${t.ai}14` : subStatus.tier === 'pro' ? `${t.accent}10` : 'rgba(255,255,255,0.04)',
                }}
              >
                {subStatus.tier === 'pro'
                  ? <Shield size={19} color={t.accent} />
                  : subStatus.isTrialActive
                  ? <Sparkles size={19} color={t.ai} />
                  : <Zap size={19} color={t.txtFaint} />}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: '0 0 1px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: t.txtFaint }}>Current Plan</p>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: t.txt }}>
                  {subStatus.tier === 'pro' ? 'Pro' : subStatus.isTrialActive ? `Trial · ${subStatus.trialDaysLeft}d left` : 'Free'}
                </p>
              </div>
              {subStatus.tier !== 'pro' && (
                <button
                  onClick={() => router.push('/upgrade')}
                  style={{
                    fontSize: 12, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer',
                    color: subStatus.isTrialActive ? t.ai : t.accent,
                    display: 'flex', alignItems: 'center', gap: 3, padding: 0, flexShrink: 0,
                  }}
                >
                  {subStatus.isTrialActive ? 'Upgrade' : subStatus.hasUsedTrial ? 'Go Pro' : 'Try Free'}
                  <ArrowRight size={12} />
                </button>
              )}
            </motion.div>
          )}

          {/* ── Rewards CTA ── */}
          <a
            href="/rewards"
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 16px', borderRadius: 18, marginBottom: 14,
              background: `linear-gradient(135deg, ${t.accent}08, ${t.ai}06)`,
              border: `1px solid ${t.accent}20`, textDecoration: 'none',
            }}
          >
            <div
              style={{
                width: 40, height: 40, borderRadius: 12, flexShrink: 0, fontSize: 18,
                background: `linear-gradient(135deg, ${t.accent}, ${t.ai})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              🏆
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 700, color: t.txt }}>Rewards & Earnings</p>
              <p style={{ margin: 0, fontSize: 12, color: t.txtDim }}>Badges, payouts, Hunter Score progress</p>
            </div>
            <ArrowRight size={16} color={t.accent} />
          </a>

          {/* ── More links ── */}
          <Surface variant="card" style={{ marginBottom: 20 }}>
            <div style={{ padding: '4px 0' }}>
              {[
                { label: 'People', icon: <Users size={16} />, href: '/people', color: t.info },
                { label: 'Activity Timeline', icon: <BarChart2 size={16} />, href: '/timeline', color: t.ai },
                { label: 'Community', icon: <Globe size={16} />, href: '/community', color: t.accent },
                { label: 'Settings', icon: <Settings size={16} />, href: '/upgrade', color: t.txtDim },
              ].map(({ label, icon, href, color }, i) => (
                <Link
                  key={href}
                  href={href}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '13px 16px',
                    borderBottom: i < 3 ? `1px solid ${t.border}` : 'none',
                    textDecoration: 'none',
                  }}
                >
                  <div
                    style={{
                      width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: `${color}12`, color,
                    }}
                  >
                    {icon}
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 500, color: t.txt, flex: 1 }}>{label}</span>
                  <ChevronRight size={16} color={t.txtFaint} />
                </Link>
              ))}
            </div>
          </Surface>

          </div>{/* end left column */}

          {/* Right column — mission timeline (stacks below on mobile, sidebar on desktop) */}
          <div className="lg:w-80 lg:flex-shrink-0" style={{ marginTop: 0 }}>
          <div className="lg:sticky" style={{ top: 80 }}>

          {/* ── Mission Timeline ── */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: t.txt }}>
                Mission History {completedHunts.length > 0 && `(${completedHunts.length})`}
              </h2>
              {completedHunts.length > 0 && (
                <Link href="/missions" style={{ fontSize: 11, fontWeight: 600, color: t.accent, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
                  Browse More <ArrowRight size={11} />
                </Link>
              )}
            </div>

            {completedHunts.length === 0 ? (
              <Surface variant="card">
                <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                  <div
                    style={{
                      width: 48, height: 48, borderRadius: '50%',
                      background: `${t.accent}08`, border: `1px solid ${t.accent}18`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      margin: '0 auto 14px',
                    }}
                  >
                    <Trophy size={22} color={t.accent} />
                  </div>
                  <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: t.txt }}>No completed missions yet</p>
                  <p style={{ margin: '0 0 18px', fontSize: 13, color: t.txtDim }}>Complete missions to build your impact portfolio.</p>
                  <button
                    onClick={() => router.push('/missions')}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      fontSize: 13, fontWeight: 700, color: t.accent,
                      background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    }}
                  >
                    Browse Missions <ArrowRight size={14} />
                  </button>
                </div>
              </Surface>
            ) : (
              <div style={{ position: 'relative' }}>
                {/* Timeline track */}
                <div
                  style={{
                    position: 'absolute', left: 19, top: 8, bottom: 8,
                    width: 2, background: 'rgba(255,255,255,0.05)', borderRadius: 1,
                  }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {completedHunts.map((c, i) => (
                    <motion.div
                      key={c.huntId}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}
                    >
                      {/* Node */}
                      <div
                        style={{
                          width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                          background: t.card, border: `2px solid ${t.accent}40`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          zIndex: 1, marginTop: 11,
                        }}
                      >
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.accent, boxShadow: `0 0 6px ${t.accent}80` }} />
                      </div>
                      {/* Card */}
                      <Surface variant="card" style={{ flex: 1 }}>
                        <div style={{ padding: '13px 15px' }}>
                          <p style={{ margin: '0 0 3px', fontSize: 13.5, fontWeight: 600, color: t.txt, lineHeight: 1.3 }}>{c.huntTitle}</p>
                          <p style={{ margin: '0 0 8px', fontSize: 11.5, fontWeight: 600, color: t.accent }}>{c.reward.split('+')[0].trim()}</p>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <p style={{ margin: 0, fontSize: 10.5, color: t.txtFaint }}>
                              {new Date(c.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <CheckCircle size={11} color={t.accent} />
                              <span style={{ fontSize: 10, fontWeight: 700, color: t.accent }}>Completed</span>
                            </div>
                          </div>
                        </div>
                      </Surface>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <p style={{ textAlign: 'center', fontSize: 11, marginTop: 32, color: t.txtFaint }}>
            X-Hunt · AI-Powered Outcome Intelligence
          </p>
          </div>{/* end sticky */}
          </div>{/* end right column */}
        </div>{/* end flex wrapper */}
      </div>
    </div>
  );
}
