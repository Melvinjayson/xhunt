'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Flame, CheckCircle, ArrowRight, Trophy, Loader2, Sparkles,
  Shield, Zap, TrendingUp, Brain, Copy, Check,
  Settings,
} from 'lucide-react';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Avatar from '@mui/material/Avatar';
import LinearProgress from '@mui/material/LinearProgress';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import { loadState, clearState, loadProfile } from '@/lib/store';
import { useAuth } from '@/lib/auth/context';
import type { CompletedHunt, ImpactProfile } from '@/lib/types';
import { t } from '@/theme/colors';
import Surface from '@/components/consumer/Surface';
import ProgressBar from '@/components/consumer/ProgressBar';
import BottomNav from '@/components/BottomNav';

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
    <Chip
      label={label}
      size="small"
      sx={{
        height: 22,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.02em',
        color,
        background: `${color}14`,
        border: `1px solid ${color}28`,
        borderRadius: '100px',
        '& .MuiChip-label': { px: '10px' },
      }}
    />
  );
}

/* ── Token-styled progress bar (inline, no animation) ───────────────────── */
function SkillBar({ value, color }: { value: number; color: string }) {
  return (
    <Box sx={{ height: 5, borderRadius: '3px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
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
    </Box>
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
    <div className="consumer-app" style={{ minHeight: '100vh', paddingBottom: 'max(100px, calc(72px + env(safe-area-inset-bottom, 0px)))', color: t.txt }}>
      <BottomNav />

        {/* ── Hero — full-width, outside consumer-app-inner ── */}
        <Box
          sx={{
            padding: '72px 20px 32px',
            background: `linear-gradient(180deg, ${t.accent}14 0%, ${t.ai}0a 35%, ${t.surface} 100%)`,
            borderBottom: `1px solid ${t.border}`,
          }}
        >
          {/* Title bar */}
          <Stack direction="row" sx={{ mb: 2.5, alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: t.txt, letterSpacing: '-0.02em' }}>
                Participation Passport
              </Typography>
              <Typography sx={{ fontSize: 11, color: t.txtFaint, lineHeight: 1.4 }}>
                Your verified record of contributions &amp; impact
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              {loading && <Loader2 size={14} color={t.txtFaint} style={{ animation: 'spin 1s linear infinite' }} />}
              <IconButton
                onClick={copyLink}
                title="Copy portfolio link"
                size="small"
                sx={{
                  width: 38, height: 38, borderRadius: '12px',
                  background: `${t.accent}10`, border: `1px solid ${t.accent}25`,
                }}
              >
                {copied
                  ? <Check size={15} color={t.accent} />
                  : <Copy size={15} color={t.accent} />}
              </IconButton>
              <IconButton
                onClick={() => {
                  if (confirm('Reset all data and start fresh?')) {
                    clearState();
                    router.replace('/');
                  }
                }}
                size="small"
                sx={{
                  width: 38, height: 38, borderRadius: '12px',
                  background: 'rgba(255,255,255,0.04)', border: `1px solid ${t.border}`,
                }}
              >
                <Settings size={16} color={t.txtDim} />
              </IconButton>
            </Stack>
          </Stack>

          {/* Avatar + name */}
          <Stack direction="row" spacing={2} sx={{ mb: 2.5, alignItems: 'center' }}>
            <Box sx={{ position: 'relative', flexShrink: 0 }}>
              <Avatar
                sx={{
                  width: 68, height: 68, borderRadius: '22px',
                  background: `linear-gradient(135deg, ${t.accent}22, ${t.ai}30)`,
                  border: `2px solid ${t.accent}40`,
                  boxShadow: `0 0 28px ${t.accent}20`,
                  fontSize: 24, fontWeight: 900, color: t.accent,
                }}
              >
                {initials}
              </Avatar>
              {/* Online dot */}
              <Box
                sx={{
                  position: 'absolute', bottom: -4, right: -4,
                  width: 20, height: 20, borderRadius: '50%',
                  background: t.card, border: `2px solid ${t.bg}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: tierColor, boxShadow: `0 0 8px ${tierColor}` }} />
              </Box>
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ mb: '6px', fontSize: 20, fontWeight: 800, color: t.txt, letterSpacing: '-0.02em' }}>{name}</Typography>
              <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
                <Tag label={tierLabel} color={tierColor} />
                {impactProfile?.archetype && (
                  <Tag label={impactProfile.archetype} color={aColor} />
                )}
              </Stack>
            </Box>
          </Stack>

          {/* Stats row */}
          <Grid container spacing={1}>
            {[
              { label: 'XP Score',    value: mms,                   color: t.accent,  Icon: TrendingUp },
              { label: 'Completed',   value: completedHunts.length, color: t.accent,  Icon: Trophy     },
              { label: 'Trust Score', value: trustScore,            color: t.ai,      Icon: Shield     },
              { label: 'Streak',      value: streak,                color: t.warning, Icon: Flame      },
            ].map(({ label, value, color, Icon }) => (
              <Grid key={label} size={{ xs: 6, sm: 3 }}>
                <Box
                  sx={{
                    borderRadius: '14px', padding: '11px 6px', textAlign: 'center',
                    background: t.card, border: `1px solid ${t.border}`,
                    transition: 'border-color 0.15s ease',
                    '&:hover': { borderColor: `${color}40` },
                  }}
                >
                  <Icon size={12} color={color} style={{ marginBottom: 4 }} />
                  <Typography sx={{ fontSize: 17, fontWeight: 800, color, lineHeight: 1 }}>{value.toLocaleString()}</Typography>
                  <Typography sx={{ fontSize: 9.5, fontWeight: 600, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '0.06em', mt: '3px' }}>{label}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>

      <Box sx={{ display: { xs: 'block', lg: 'flex' }, gap: 3, alignItems: 'flex-start', px: 2.5, py: 2.5 }}>

          {/* Left column */}
          <Box className="lg:flex-1 lg:min-w-0">

          {/* ── Skills Intelligence ── */}
          {skills.length > 0 && (
            <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 22 }}>
              <Stack direction="row" sx={{ mb: 1.5, alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: t.txt }}>Skills</Typography>
                <Chip
                  label="AI Inferred"
                  size="small"
                  sx={{
                    fontSize: 10, fontWeight: 700, color: t.txtFaint,
                    background: 'rgba(255,255,255,0.04)', border: `1px solid ${t.border}`,
                    letterSpacing: '0.07em',
                  }}
                />
              </Stack>
              <Surface variant="card">
                <Stack spacing={1.75} sx={{ p: 2 }}>
                  {skills.slice(0, 6).map((s, i) => {
                    const cfg = LEVEL_CFG[s.level] ?? LEVEL_CFG.Beginner;
                    return (
                      <motion.div key={s.name} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
                        <Stack direction="row" sx={{ mb: '6px', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                            <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: t.txtDim }}>{s.name}</Typography>
                            <Chip
                              label={s.level}
                              size="small"
                              sx={{
                                fontSize: 9, fontWeight: 800, color: cfg.color,
                                background: cfg.bg, borderRadius: '999px', height: 18,
                                textTransform: 'uppercase', letterSpacing: '0.06em',
                                '& .MuiChip-label': { px: '7px' },
                              }}
                            />
                          </Stack>
                          <Typography sx={{ fontSize: 11, fontWeight: 800, color: cfg.color }}>{s.confidence}%</Typography>
                        </Stack>
                        <SkillBar value={s.confidence} color={cfg.color} />
                        {s.evidence.length > 0 && (
                          <Typography sx={{ mt: '4px', fontSize: 10, color: t.txtFaint }}>
                            via {s.evidence.slice(0, 2).join(' · ')}
                          </Typography>
                        )}
                      </motion.div>
                    );
                  })}
                </Stack>
              </Surface>
            </motion.section>
          )}

          {/* ── Impact DNA ── */}
          {impactProfile && (
            <section style={{ marginBottom: 22 }}>
              <Stack direction="row" sx={{ mb: 1.5, alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: t.txt }}>Impact DNA</Typography>
                <Chip
                  label="AI Profile"
                  size="small"
                  sx={{
                    fontSize: 10, fontWeight: 700, color: t.txtFaint,
                    background: 'rgba(255,255,255,0.04)', border: `1px solid ${t.border}`,
                    letterSpacing: '0.07em',
                  }}
                />
              </Stack>

              {/* Archetype card */}
              <Stack
                direction="row"
                spacing={1.75}
                sx={{
                  borderRadius: '20px', padding: '14px 16px', mb: 1.25,
                  background: `linear-gradient(135deg, ${aColor}08, ${t.ai}06)`,
                  border: `1px solid ${aColor}18`,
                  alignItems: 'center',
                }}
              >
                <Box
                  sx={{
                    width: 46, height: 46, borderRadius: '14px', flexShrink: 0,
                    background: `${aColor}18`, border: `1.5px solid ${aColor}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Brain size={21} color={aColor} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontSize: 10, fontWeight: 700, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Archetype</Typography>
                  <Typography sx={{ fontSize: 18, fontWeight: 900, color: aColor, letterSpacing: '-0.02em', mb: '3px' }}>{impactProfile.archetype}</Typography>
                  <Stack direction="row" spacing={0.625} sx={{ alignItems: 'center' }}>
                    <Typography sx={{ fontSize: 10, color: t.txtFaint }}>Impact Score</Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 800, color: aColor }}>{impactProfile.impactScore}</Typography>
                    <Typography sx={{ fontSize: 10, color: t.txtFaint }}>/ 100</Typography>
                  </Stack>
                </Box>
              </Stack>

              {/* Strengths */}
              {impactProfile.strengths.length > 0 && (
                <Surface variant="card" style={{ marginBottom: 10 }}>
                  <Box sx={{ p: '14px 16px' }}>
                    <Typography sx={{ mb: 1.5, fontSize: 10, fontWeight: 700, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Top Strengths</Typography>
                    <Stack spacing={1.25}>
                      {impactProfile.strengths.slice(0, 4).map((s) => (
                        <Box key={s.name}>
                          <Stack direction="row" sx={{ mb: '5px', justifyContent: 'space-between' }}>
                            <Typography sx={{ fontSize: 11, color: t.txtDim, fontWeight: 600 }}>{s.name}</Typography>
                            <Typography sx={{ fontSize: 11, color: aColor, fontWeight: 800 }}>{s.score}%</Typography>
                          </Stack>
                          <SkillBar value={s.score} color={aColor} />
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                </Surface>
              )}

              {/* Causes + Availability */}
              <Grid container spacing={1.25}>
                {impactProfile.causes.length > 0 && (
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Surface variant="inset">
                      <Box sx={{ p: '12px 14px' }}>
                        <Typography sx={{ mb: 1, fontSize: 10, fontWeight: 700, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Causes</Typography>
                        <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
                          {impactProfile.causes.map((c) => (
                            <Tag key={c} label={c} color={t.accent} />
                          ))}
                        </Stack>
                      </Box>
                    </Surface>
                  </Grid>
                )}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Surface variant="inset">
                    <Box sx={{ p: '12px 14px' }}>
                      <Typography sx={{ mb: 1, fontSize: 10, fontWeight: 700, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Availability</Typography>
                      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                        <Sparkles size={11} color={t.accent} />
                        <Typography sx={{ fontSize: 11, color: t.txt, fontWeight: 600 }}>{impactProfile.availability}</Typography>
                      </Stack>
                      <Typography sx={{ mt: '5px', fontSize: 9.5, color: t.txtFaint }}>per week</Typography>
                    </Box>
                  </Surface>
                </Grid>
              </Grid>
            </section>
          )}

          {/* ── Streak ── */}
          {streak > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              style={{ marginBottom: 16 }}
            >
              <Stack
                direction="row"
                spacing={1.75}
                sx={{
                  borderRadius: '20px', padding: '16px 18px',
                  background: `${t.warning}08`, border: `1px solid ${t.warning}20`,
                  alignItems: 'center',
                }}
              >
                <Box
                  sx={{
                    width: 44, height: 44, borderRadius: '14px', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: `${t.warning}12`,
                  }}
                >
                  <Flame size={22} color={t.warning} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: t.txtFaint }}>Daily Streak</Typography>
                  <Typography sx={{ fontSize: 20, fontWeight: 800, color: t.warning }}>{streak} Day{streak !== 1 ? 's' : ''}</Typography>
                </Box>
              </Stack>
            </motion.div>
          )}

          {/* ── Plan card ── */}
          {subStatus && (
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              style={{ marginBottom: 16 }}
            >
              <Stack
                direction="row"
                spacing={1.5}
                sx={{
                  borderRadius: '20px', padding: '14px 16px',
                  background: subStatus.isTrialActive ? `${t.ai}08` : subStatus.tier === 'pro' ? `${t.accent}06` : t.card,
                  border: `1px solid ${subStatus.isTrialActive ? `${t.ai}28` : subStatus.tier === 'pro' ? `${t.accent}20` : t.border}`,
                  alignItems: 'center',
                }}
              >
                <Box
                  sx={{
                    width: 40, height: 40, borderRadius: '12px', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: subStatus.isTrialActive ? `${t.ai}14` : subStatus.tier === 'pro' ? `${t.accent}10` : 'rgba(255,255,255,0.04)',
                  }}
                >
                  {subStatus.tier === 'pro'
                    ? <Shield size={19} color={t.accent} />
                    : subStatus.isTrialActive
                    ? <Sparkles size={19} color={t.ai} />
                    : <Zap size={19} color={t.txtFaint} />}
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: t.txtFaint }}>Current Plan</Typography>
                  <Typography sx={{ fontSize: 14, fontWeight: 700, color: t.txt }}>
                    {subStatus.tier === 'pro' ? 'Pro' : subStatus.isTrialActive ? `Trial · ${subStatus.trialDaysLeft}d left` : 'Free'}
                  </Typography>
                </Box>
                {subStatus.tier !== 'pro' && (
                  <Button
                    onClick={() => router.push('/upgrade')}
                    size="small"
                    sx={{
                      fontSize: 12, fontWeight: 700, color: subStatus.isTrialActive ? t.ai : t.accent,
                      background: 'none', border: 'none', flexShrink: 0, minWidth: 0,
                      p: 0, gap: '3px',
                    }}
                    endIcon={<ArrowRight size={12} />}
                  >
                    {subStatus.isTrialActive ? 'Upgrade' : subStatus.hasUsedTrial ? 'Go Pro' : 'Try Free'}
                  </Button>
                )}
              </Stack>
            </motion.div>
          )}

          </Box>{/* end left column */}

          {/* Right column — mission timeline (stacks below on mobile, sidebar on desktop) */}
          <div className="lg:w-80 lg:flex-shrink-0" style={{ marginTop: 0 }}>
          <div className="lg:sticky" style={{ top: 80 }}>

          {/* ── Mission Timeline ── */}
          <section>
            <Stack direction="row" sx={{ mb: 1.75, alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: t.txt }}>
                Participation Record {completedHunts.length > 0 && `(${completedHunts.length})`}
              </Typography>
              {completedHunts.length > 0 && (
                <Link href="/missions" style={{ fontSize: 11, fontWeight: 600, color: t.accent, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
                  Browse More <ArrowRight size={11} />
                </Link>
              )}
            </Stack>

            {completedHunts.length === 0 ? (
              <Surface variant="card">
                <Box sx={{ p: '32px 20px', textAlign: 'center' }}>
                  <Box
                    sx={{
                      width: 48, height: 48, borderRadius: '50%',
                      background: `${t.accent}08`, border: `1px solid ${t.accent}18`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      margin: '0 auto 14px',
                    }}
                  >
                    <Trophy size={22} color={t.accent} />
                  </Box>
                  <Typography sx={{ mb: '4px', fontSize: 15, fontWeight: 700, color: t.txt }}>No completed missions yet</Typography>
                  <Typography sx={{ mb: '18px', fontSize: 13, color: t.txtDim }}>Complete missions to build your impact portfolio.</Typography>
                  <Button
                    onClick={() => router.push('/missions')}
                    size="small"
                    endIcon={<ArrowRight size={14} />}
                    sx={{
                      fontSize: 13, fontWeight: 700, color: t.accent,
                      background: 'none', border: 'none', p: 0, minWidth: 0,
                    }}
                  >
                    Browse Missions
                  </Button>
                </Box>
              </Surface>
            ) : (
              <Box sx={{ position: 'relative' }}>
                {/* Timeline track */}
                <Box
                  sx={{
                    position: 'absolute', left: 19, top: 8, bottom: 8,
                    width: 2, background: 'rgba(255,255,255,0.05)', borderRadius: '1px',
                  }}
                />
                <Stack spacing={1.25}>
                  {completedHunts.map((c, i) => (
                    <motion.div
                      key={c.huntId}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}
                    >
                      {/* Node */}
                      <Box
                        sx={{
                          width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                          background: t.card, border: `2px solid ${t.accent}40`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          zIndex: 1, mt: '11px',
                        }}
                      >
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: t.accent, boxShadow: `0 0 6px ${t.accent}80` }} />
                      </Box>
                      {/* Card */}
                      <Surface variant="card" style={{ flex: 1 }}>
                        <Box sx={{ p: '13px 15px' }}>
                          <Typography sx={{ mb: '3px', fontSize: 13.5, fontWeight: 600, color: t.txt, lineHeight: 1.3 }}>{c.huntTitle}</Typography>
                          <Typography sx={{ mb: 1, fontSize: 11.5, fontWeight: 600, color: t.accent }}>{c.reward.split('+')[0].trim()}</Typography>
                          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography sx={{ fontSize: 10.5, color: t.txtFaint }}>
                              {new Date(c.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </Typography>
                            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                              <CheckCircle size={11} color={t.accent} />
                              <Typography sx={{ fontSize: 10, fontWeight: 700, color: t.accent }}>Completed</Typography>
                            </Stack>
                          </Stack>
                        </Box>
                      </Surface>
                    </motion.div>
                  ))}
                </Stack>
              </Box>
            )}
          </section>

          <Typography sx={{ textAlign: 'center', fontSize: 11, mt: 4, color: t.txtFaint }}>
            X-Hunt · AI-Powered Outcome Intelligence
          </Typography>
          </div>{/* end sticky */}
          </div>{/* end right column */}
      </Box>{/* end flex wrapper */}
    </div>
  );
}
