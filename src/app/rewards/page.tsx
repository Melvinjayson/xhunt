'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Trophy, Flame, Zap, Star, TrendingUp,
  Award, Gift, Clock, CheckCircle2, ChevronRight,
} from 'lucide-react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Avatar from '@mui/material/Avatar';
import LinearProgress from '@mui/material/LinearProgress';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid2';
import BottomNav from '@/components/BottomNav';
import { loadState } from '@/lib/store';
import type { CompletedHunt, VerificationRecord, Hunt } from '@/lib/types';
import { estimateCashReward } from '@/lib/missionCategories';
import { t } from '@/theme/colors';

const LINE = 'rgba(255,255,255,.07)';

function parseReward(r: string): number {
  return parseFloat(r.replace(/[^0-9.]/g, '')) || 0;
}

function getInitials(name: string | null | undefined): string {
  if (!name) return 'XP';
  const parts = name.trim().split(' ');
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}

function timeAgo(iso: string): string {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 3600)  return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

const TIERS = [
  { name: 'Explorer',        min: 0,    max: 2.9,  color: t.txtFaint, next: 'Verified Hunter' },
  { name: 'Verified Hunter', min: 3.0,  max: 5.9,  color: t.accent,  next: 'Pro Hunter'      },
  { name: 'Pro Hunter',      min: 6.0,  max: 8.4,  color: t.ai,      next: 'Elite Hunter'    },
  { name: 'Elite Hunter',    min: 8.5,  max: 10.0, color: t.warning, next: null              },
];

type BadgeFn = (h: CompletedHunt[], streak: number) => boolean;

const BADGE_CATALOG: { id: string; emoji: string; label: string; desc: string; earned: BadgeFn }[] = [
  { id: 'first_mission',  emoji: '🚀', label: 'First Launch',    desc: 'Complete your first mission',        earned: (h) => h.length >= 1 },
  { id: 'streak_3',       emoji: '🔥', label: '3-Day Streak',    desc: 'Complete missions 3 days in a row',  earned: (_, s) => s >= 3 },
  { id: 'streak_7',       emoji: '⚡', label: 'Week Warrior',    desc: 'Maintain a 7-day streak',            earned: (_, s) => s >= 7 },
  { id: 'missions_5',     emoji: '🎯', label: 'Sharp Shooter',   desc: 'Complete 5 missions',                earned: (h) => h.length >= 5 },
  { id: 'missions_10',    emoji: '💎', label: 'Diamond Hunter',  desc: 'Complete 10 missions',               earned: (h) => h.length >= 10 },
  { id: 'missions_25',    emoji: '👑', label: 'Crown Hunter',    desc: 'Complete 25 missions',               earned: (h) => h.length >= 25 },
  { id: 'earner_100',     emoji: '💰', label: 'First $100',      desc: 'Earn $100+ across missions',         earned: (h) => h.reduce((sum, c) => sum + parseReward(c.reward), 0) >= 100 },
  { id: 'earner_500',     emoji: '🏦', label: 'High Earner',     desc: 'Earn $500+ across missions',         earned: (h) => h.reduce((sum, c) => sum + parseReward(c.reward), 0) >= 500 },
  { id: 'multi_mission',  emoji: '🌍', label: 'Multi-Hunter',    desc: 'Complete 3 or more different missions', earned: (h) => h.length >= 3 },
];

interface SubStatus {
  tier: string; isTrialActive: boolean; trialDaysLeft: number;
  canAccessPremiumMissions: boolean;
}

export default function RewardsPage() {
  const router = useRouter();
  const [completedHunts, setCompleted] = useState<CompletedHunt[]>([]);
  const [streak, setStreak]           = useState(0);
  const [displayName, setName]        = useState<string | null>(null);
  const [hunterScore, setScore]       = useState(0);
  const [subStatus, setSub]           = useState<SubStatus | null>(null);
  const [mounted, setMounted]         = useState(false);
  const [pendingRewards, setPendingRewards] = useState<{ record: VerificationRecord; hunt: Hunt }[]>([]);

  useEffect(() => {
    const state = loadState();
    setCompleted(state.completedHunts ?? []);
    setStreak(state.streak ?? 0);
    setName((state.user as { name?: string })?.name ?? null);
    setScore((state.user as { hunterScore?: number })?.hunterScore ?? 0);
    setMounted(true);
    const vMap = state.verificationStatus ?? {};
    const allHunts = state.hunts ?? [];
    const pendingStatuses = ['submitted', 'ai_reviewing', 'manual_review'];
    const pendingItems = Object.values(vMap)
      .filter(r => pendingStatuses.includes(r.status))
      .map(r => ({ record: r, hunt: allHunts.find(h => h.id === r.huntId) ?? null }))
      .filter((x): x is { record: VerificationRecord; hunt: Hunt } => x.hunt !== null);
    setPendingRewards(pendingItems);
    void fetch('/api/subscription/status')
      .then(r => r.json())
      .then((d: SubStatus) => setSub(d))
      .catch(() => setSub({ tier: 'free', isTrialActive: false, trialDaysLeft: 0, canAccessPremiumMissions: false }));
  }, []);

  if (!mounted) return null;

  const totalEarned   = completedHunts.reduce((s, c) => s + parseReward(c.reward), 0);
  const pendingAmount = pendingRewards.reduce((s, { hunt }) =>
    s + estimateCashReward(hunt.cashReward, hunt.difficulty, hunt.missionType), 0);
  const approvedAmount = (() => {
    const state = loadState();
    const vMap = state.verificationStatus ?? {};
    const allH = state.hunts ?? [];
    return Object.values(vMap)
      .filter(r => r.status === 'approved')
      .reduce((s, r) => {
        const h = allH.find(x => x.id === r.huntId);
        return s + (h ? estimateCashReward(h.cashReward, h.difficulty, h.missionType) : 0);
      }, 0);
  })();
  const thisMonth     = completedHunts.filter(c => {
    const d = new Date(c.completedAt ?? 0);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((s, c) => s + parseReward(c.reward), 0);

  const currentTier   = TIERS.find(t => hunterScore >= t.min && hunterScore <= t.max) ?? TIERS[0];
  const nextTier      = currentTier.next ? TIERS.find(t => t.name === currentTier.next) : null;
  const scoreProgress = nextTier ? ((hunterScore - currentTier.min) / (nextTier.min - currentTier.min)) * 100 : 100;

  const earnedBadges  = BADGE_CATALOG.filter(b => b.earned(completedHunts, streak));
  const lockedBadges  = BADGE_CATALOG.filter(b => !b.earned(completedHunts, streak));

  const totalXP = completedHunts.length * 100;

  return (
    <main className="consumer-app" style={{ background: t.bg, minHeight: '100dvh', paddingBottom: '5.5rem', color: t.txt }}>

      {/* ─── Header ─── */}
      <Box sx={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(5,8,22,.94)', backdropFilter: 'blur(20px)', borderBottom: `1px solid ${LINE}`, p: '12px 16px', display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <IconButton
          onClick={() => router.back()}
          size="small"
          sx={{ width: 36, height: 36, borderRadius: '50%', background: t.card, border: `1px solid ${LINE}` }}
        >
          <ArrowLeft size={16} style={{ color: t.txt }} />
        </IconButton>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>Rewards & Earnings</Typography>
      </Box>

      <Box sx={{ maxWidth: 600, margin: '0 auto', px: 2 }}>

        {/* ─── Profile card ─── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <Box sx={{ my: 2, p: '18px', borderRadius: '20px', background: 'linear-gradient(135deg, rgba(34,255,170,.06) 0%, rgba(109,93,253,.06) 100%)', border: `1px solid rgba(34,255,170,.15)` }}>
            <Stack direction="row" alignItems="center" spacing={1.75}>
              <Avatar
                sx={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: 'linear-gradient(135deg,rgba(34,255,170,1),rgba(109,93,253,1))',
                  fontSize: 20, fontWeight: 900, color: t.bg, flexShrink: 0,
                }}
              >
                {getInitials(displayName)}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: 16, fontWeight: 800 }}>{displayName ?? 'Hunter'}</Typography>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: '4px' }}>
                  <Chip
                    label={currentTier.name}
                    size="small"
                    sx={{
                      fontSize: 11, fontWeight: 700, color: currentTier.color,
                      background: `${currentTier.color}15`, border: `1px solid ${currentTier.color}30`,
                      borderRadius: '6px',
                    }}
                  />
                  {subStatus?.isTrialActive && (
                    <Chip
                      label={`Trial · ${subStatus.trialDaysLeft}d left`}
                      size="small"
                      sx={{
                        fontSize: 11, color: t.ai,
                        background: 'rgba(109,93,253,.1)', border: '1px solid rgba(109,93,253,.2)',
                        borderRadius: '6px',
                      }}
                    />
                  )}
                </Stack>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography sx={{ fontSize: 10, color: t.txtDim }}>Hunter Score</Typography>
                <Typography sx={{ fontSize: 28, fontWeight: 900, color: currentTier.color, lineHeight: 1, mt: '2px' }}>{hunterScore.toFixed(1)}</Typography>
              </Box>
            </Stack>
          </Box>
        </motion.div>

        {/* ─── Wallet ─── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card sx={{ mb: 2, borderRadius: '20px', background: t.surface, border: `1px solid ${LINE}`, overflow: 'hidden' }}>
            <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${LINE}` }}>
              <Typography sx={{ fontSize: 10, fontWeight: 700, color: t.txtDim, textTransform: 'uppercase', letterSpacing: '.08em' }}>Participation Wallet</Typography>
            </Box>
            <Grid container>
              {[
                { label: 'Available',      value: `$${approvedAmount.toFixed(0)}`, color: t.accent,  sub: 'ready to claim' },
                { label: 'Pending',        value: `~$${pendingAmount.toFixed(0)}`,  color: t.warning, sub: 'under review'   },
                { label: 'Lifetime Earned',value: `$${totalEarned.toFixed(0)}`,    color: t.txt,     sub: 'all time'       },
              ].map(({ label, value, color, sub }, i) => (
                <Grid key={label} size={{ xs: 4 }}>
                  <Box sx={{ p: '14px 12px', borderRight: i < 2 ? `1px solid ${LINE}` : 'none', textAlign: 'center' }}>
                    <Typography sx={{ fontSize: 20, fontWeight: 900, color, letterSpacing: '-.03em', lineHeight: 1 }}>{value}</Typography>
                    <Typography sx={{ mt: '3px', fontSize: 9.5, color: t.txtDim, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</Typography>
                    <Typography sx={{ fontSize: 9, color: t.txtDim }}>{sub}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Card>
        </motion.div>

        {/* ─── Earnings summary ─── */}
        <Grid container spacing={1.25} sx={{ mb: 2 }}>
          {[
            { icon: <Trophy size={16} />, value: `$${totalEarned.toFixed(0)}`, label: 'Total Earned', color: t.accent },
            { icon: <TrendingUp size={16} />, value: `$${thisMonth.toFixed(0)}`, label: 'This Month', color: t.warning },
            { icon: <Zap size={16} />, value: totalXP.toLocaleString(), label: 'Total XP', color: t.ai },
          ].map((s, i) => (
            <Grid key={i} size={{ xs: 12, sm: 4 }}>
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                <Card sx={{ p: '14px 12px', borderRadius: '16px', background: t.card, border: `1px solid ${LINE}`, textAlign: 'center' }}>
                  <Box sx={{ color: s.color, mb: '6px', display: 'flex', justifyContent: 'center' }}>{s.icon}</Box>
                  <Typography sx={{ fontSize: 20, fontWeight: 900, color: s.color, letterSpacing: '-.025em', lineHeight: 1 }}>{s.value}</Typography>
                  <Typography sx={{ mt: '4px', fontSize: 10, color: t.txtFaint }}>{s.label}</Typography>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>

        {/* ─── Stats row ─── */}
        <Grid container spacing={1.25} sx={{ mb: 2.5 }}>
          <Grid size={{ xs: 6 }}>
            <Card sx={{ p: '14px 16px', borderRadius: '16px', background: t.card, border: `1px solid ${LINE}` }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ width: 36, height: 36, borderRadius: '12px', background: 'rgba(255,184,77,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Flame size={18} style={{ color: t.warning }} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 22, fontWeight: 900, color: t.warning, lineHeight: 1 }}>{streak} 🔥</Typography>
                  <Typography sx={{ mt: '3px', fontSize: 10, color: t.txtFaint }}>Day streak</Typography>
                </Box>
              </Stack>
            </Card>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <Card sx={{ p: '14px 16px', borderRadius: '16px', background: t.card, border: `1px solid ${LINE}` }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ width: 36, height: 36, borderRadius: '12px', background: 'rgba(34,255,170,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle2 size={18} style={{ color: t.accent }} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 22, fontWeight: 900, color: t.accent, lineHeight: 1 }}>{completedHunts.length}</Typography>
                  <Typography sx={{ mt: '3px', fontSize: 10, color: t.txtFaint }}>Completed</Typography>
                </Box>
              </Stack>
            </Card>
          </Grid>
        </Grid>

        {/* ─── Hunter Score progress ─── */}
        {nextTier && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Box sx={{ mb: 2.5, p: 2, borderRadius: '18px', background: t.surface, border: `1px solid ${LINE}` }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.25 }}>
                <Box>
                  <Typography sx={{ fontSize: 11, color: t.txtFaint, fontWeight: 600 }}>Next tier</Typography>
                  <Typography sx={{ mt: '2px', fontSize: 14, fontWeight: 700, color: nextTier.color }}>{nextTier.name}</Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography sx={{ fontSize: 11, color: t.txtFaint }}>Need score</Typography>
                  <Typography sx={{ mt: '2px', fontSize: 14, fontWeight: 700, color: nextTier.color }}>{nextTier.min}+</Typography>
                </Box>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={Math.min(scoreProgress, 100)}
                sx={{
                  height: 6, borderRadius: 3, mb: '6px',
                  background: 'rgba(255,255,255,0.06)',
                  '& .MuiLinearProgress-bar': {
                    background: `linear-gradient(90deg, ${currentTier.color}, ${nextTier.color})`,
                    borderRadius: 3,
                  },
                }}
              />
              <Typography sx={{ fontSize: 11, color: t.txtFaint }}>
                {hunterScore.toFixed(1)} / {nextTier.min} — complete {nextTier.name === 'Verified Hunter' ? 'more missions' : 'higher-tier missions'} to advance
              </Typography>
            </Box>
          </motion.div>
        )}

        {/* ─── Badges earned ─── */}
        <Box sx={{ mb: 2.5 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, color: 'text.primary' }}>
              <Award size={16} style={{ color: t.accent }} /> Badges
              <Typography component="span" sx={{ fontSize: 12, color: t.txtFaint, fontWeight: 500 }}>({earnedBadges.length}/{BADGE_CATALOG.length})</Typography>
            </Typography>
          </Stack>

          {earnedBadges.length > 0 ? (
            <Grid container spacing={1} sx={{ mb: 1.5 }}>
              {earnedBadges.map((badge, i) => (
                <Grid key={badge.id} size={{ xs: 4 }}>
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
                    <Card sx={{ p: '12px 8px', borderRadius: '14px', background: t.card, border: '1px solid rgba(34,255,170,.15)', textAlign: 'center' }}>
                      <Typography sx={{ fontSize: 26, mb: '6px' }}>{badge.emoji}</Typography>
                      <Typography sx={{ fontSize: 11, fontWeight: 700, color: t.accent, lineHeight: 1.2 }}>{badge.label}</Typography>
                      <Typography sx={{ mt: '3px', fontSize: 9, color: t.txtFaint, lineHeight: 1.3 }}>{badge.desc}</Typography>
                    </Card>
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Card sx={{ p: '20px', borderRadius: '16px', background: t.card, border: `1px solid ${LINE}`, textAlign: 'center', mb: 1.5 }}>
              <Typography sx={{ fontSize: 13, color: t.txtDim }}>Complete missions to earn badges</Typography>
            </Card>
          )}

          {lockedBadges.length > 0 && (
            <Box>
              <Typography sx={{ fontSize: 11, fontWeight: 600, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '.06em', mb: 1 }}>Locked</Typography>
              <Grid container spacing={1}>
                {lockedBadges.slice(0, 6).map(badge => (
                  <Grid key={badge.id} size={{ xs: 4 }}>
                    <Card sx={{ p: '12px 8px', borderRadius: '14px', background: t.surface, border: `1px solid ${LINE}`, textAlign: 'center', opacity: 0.5 }}>
                      <Typography sx={{ fontSize: 22, mb: '6px', filter: 'grayscale(1)' }}>{badge.emoji}</Typography>
                      <Typography sx={{ fontSize: 10, fontWeight: 600, color: t.txtFaint }}>{badge.label}</Typography>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </Box>

        {/* ─── Pending verification ─── */}
        {pendingRewards.length > 0 && (
          <Box sx={{ mb: 2.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, color: 'text.primary' }}>
              <Clock size={16} style={{ color: t.warning }} /> Pending Verification
            </Typography>
            <Card sx={{ borderRadius: '16px', background: t.card, border: `1px solid ${LINE}`, overflow: 'hidden' }}>
              {pendingRewards.map(({ hunt, record }, i) => (
                <Box key={hunt.id}>
                  <Stack direction="row" alignItems="center" spacing={1.5} sx={{ p: '12px 14px' }}>
                    <Box sx={{ width: 34, height: 34, borderRadius: '10px', background: 'rgba(255,184,77,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Clock size={15} style={{ color: t.warning }} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 600, color: t.txt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hunt.title}</Typography>
                      <Typography sx={{ mt: '2px', fontSize: 11, color: t.warning, fontWeight: 600 }}>
                        {record.status === 'ai_reviewing' ? '🤖 AI Reviewing' : record.status === 'manual_review' ? '👁 In Review' : '📬 Submitted'}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                      <Typography sx={{ fontSize: 14, fontWeight: 800, color: t.warning }}>~${estimateCashReward(hunt.cashReward, hunt.difficulty, hunt.missionType)}</Typography>
                      <Typography sx={{ mt: '2px', fontSize: 10, color: t.txtFaint }}>pending</Typography>
                    </Box>
                  </Stack>
                  {i < pendingRewards.length - 1 && <Divider sx={{ borderColor: LINE }} />}
                </Box>
              ))}
            </Card>
          </Box>
        )}

        {/* ─── Recent payouts ─── */}
        {completedHunts.length > 0 && (
          <Box sx={{ mb: 2.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, color: 'text.primary' }}>
              <Clock size={16} style={{ color: t.warning }} /> Recent Payouts
            </Typography>
            <Card sx={{ borderRadius: '16px', background: t.card, border: `1px solid ${LINE}`, overflow: 'hidden' }}>
              {[...completedHunts].reverse().slice(0, 5).map((h, i, arr) => (
                <Box key={`${h.huntId}-${i}`}>
                  <Stack direction="row" alignItems="center" spacing={1.5} sx={{ p: '12px 14px' }}>
                    <Box sx={{ width: 34, height: 34, borderRadius: '10px', background: 'rgba(34,255,170,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <CheckCircle2 size={16} style={{ color: t.accent }} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 600, color: t.txt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {(h as { title?: string }).title ?? `Mission ${i + 1}`}
                      </Typography>
                      <Typography sx={{ mt: '2px', fontSize: 11, color: t.txtFaint }}>{h.completedAt ? timeAgo(h.completedAt) : '—'}</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                      {parseReward(h.reward) > 0 && (
                        <Typography sx={{ fontSize: 14, fontWeight: 800, color: t.accent }}>{h.reward}</Typography>
                      )}
                      <Typography sx={{ mt: '2px', fontSize: 11, color: t.warning }}>+100 XP</Typography>
                    </Box>
                  </Stack>
                  {i < arr.length - 1 && <Divider sx={{ borderColor: LINE }} />}
                </Box>
              ))}
            </Card>
          </Box>
        )}

        {/* ─── Unlock more CTA ─── */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <Stack
            direction="row"
            alignItems="center"
            spacing={1.75}
            sx={{
              mb: 2, p: '20px', borderRadius: '20px',
              background: 'linear-gradient(135deg, rgba(34,255,170,.06), rgba(109,93,253,.06))',
              border: '1px solid rgba(34,255,170,.15)',
            }}
          >
            <Box sx={{ width: 48, height: 48, borderRadius: '14px', background: 'linear-gradient(135deg,rgba(34,255,170,1),rgba(109,93,253,1))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Gift size={22} style={{ color: t.bg }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ mb: '3px', fontSize: 14, fontWeight: 700, color: t.txt }}>Unlock higher-value missions</Typography>
              <Typography sx={{ fontSize: 12, color: t.txtDim }}>Complete more missions to raise your Hunter Score and access premium brand gigs.</Typography>
            </Box>
            <IconButton onClick={() => router.push('/missions')} size="small" sx={{ color: t.accent, flexShrink: 0 }}>
              <ChevronRight size={20} />
            </IconButton>
          </Stack>
        </motion.div>

        {/* ─── Community Exchange CTA ─── */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.40 }}>
          <Button
            onClick={() => router.push('/community')}
            fullWidth
            sx={{
              mb: 1.5, p: '18px 20px', borderRadius: '20px',
              background: `linear-gradient(135deg, ${t.accent}10, ${t.info}0A)`,
              border: `1px solid ${t.accent}28`,
              display: 'flex', alignItems: 'center', gap: '14px', textAlign: 'left',
              justifyContent: 'flex-start', textTransform: 'none',
            }}
          >
            <Box sx={{ width: 46, height: 46, borderRadius: '14px', background: `${t.accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Star size={20} style={{ color: t.accent }} />
            </Box>
            <Box sx={{ flex: 1, textAlign: 'left' }}>
              <Typography sx={{ mb: '3px', fontSize: 14, fontWeight: 700, color: t.txt }}>Community Exchange</Typography>
              <Typography sx={{ fontSize: 12, color: t.txtDim }}>Pool resources with other hunters, join crowd tasks, and earn recognition from the community.</Typography>
            </Box>
            <ChevronRight size={18} style={{ color: t.accent, flexShrink: 0 }} />
          </Button>
        </motion.div>

        {/* ─── Barter Exchange CTA ─── */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}>
          <Button
            onClick={() => router.push('/barter')}
            fullWidth
            sx={{
              mb: 1.5, p: '18px 20px', borderRadius: '20px',
              background: `linear-gradient(135deg, ${t.ai}14, ${t.accent}0A)`,
              border: `1px solid ${t.ai}30`,
              display: 'flex', alignItems: 'center', gap: '14px', textAlign: 'left',
              justifyContent: 'flex-start', textTransform: 'none',
            }}
          >
            <Box sx={{ width: 46, height: 46, borderRadius: '14px', background: `${t.ai}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <TrendingUp size={20} style={{ color: t.ai }} />
            </Box>
            <Box sx={{ flex: 1, textAlign: 'left' }}>
              <Typography sx={{ mb: '3px', fontSize: 14, fontWeight: 700, color: t.txt }}>Barter Exchange</Typography>
              <Typography sx={{ fontSize: 12, color: t.txtDim }}>Trade your points and badges with other hunters for skills, coupons, and recognition.</Typography>
            </Box>
            <ChevronRight size={18} style={{ color: t.ai, flexShrink: 0 }} />
          </Button>
        </motion.div>

        {/* ─── Social enterprise note ─── */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          <Box sx={{ mb: 2, p: 2, borderRadius: '16px', background: t.surface, border: `1px solid ${LINE}` }}>
            <Typography sx={{ mb: '6px', fontSize: 12, fontWeight: 700, color: t.ai, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Star size={12} /> Social Impact Missions
            </Typography>
            <Typography sx={{ fontSize: 12, color: t.txtDim, lineHeight: 1.55 }}>
              Some missions are run by non-profits and civic programs. Completing these earns XP and impact badges but may not include cash payouts. They count toward your Hunter Score.
            </Typography>
          </Box>
        </motion.div>

      </Box>

      <BottomNav />
    </main>
  );
}
