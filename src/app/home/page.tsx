'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Zap,
  Star,
  TrendingUp,
  Flame,
  CheckCircle2,
  Clock,
  Award,
  ChevronRight,
  Compass,
  Upload,
  Play,
  Gift,
  Wallet,
  Timer,
  MapPin,
  Users,
  ArrowRight,
} from 'lucide-react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Badge from '@mui/material/Badge';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';

import { useAuth } from '@/lib/auth/context';
import { loadState, loadProfile } from '@/lib/store';
import { createClient } from '@/lib/supabase/client';
import { t } from '@/theme/colors';
import type { Hunt, HuntProgress } from '@/lib/types';

import PageHeader from '@/components/consumer/PageHeader';
import StatTile from '@/components/consumer/StatTile';
import SectionHeader from '@/components/consumer/SectionHeader';
import MissionCard from '@/components/consumer/MissionCard';
import ProgressBar from '@/components/consumer/ProgressBar';
import EmptyState from '@/components/consumer/EmptyState';
import QuickActionGrid from '@/components/consumer/QuickActionGrid';
import type { QuickAction } from '@/components/consumer/QuickActionGrid';
import CopilotFab from '@/components/consumer/CopilotFab';
import Surface from '@/components/consumer/Surface';
import BottomNav from '@/components/BottomNav';
import OnboardingTour from '@/components/OnboardingTour';

// ─── helpers ────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function sumRewards(completedHunts: { reward: string }[]): number {
  return completedHunts.reduce((acc, ch) => {
    const n = parseFloat(ch.reward.replace(/[^0-9.]/g, '')) || 0;
    return acc + n;
  }, 0);
}

// ─── badge catalog ────────────────────────────────────────────────────────────

interface Badge {
  id: string;
  label: string;
  description: string;
  emoji: string;
  earned: boolean;
}

function computeBadges(completedCount: number, streak: number): Badge[] {
  return [
    {
      id: 'first_mission',
      label: 'First Mission',
      description: 'Completed your first mission',
      emoji: '🚀',
      earned: completedCount >= 1,
    },
    {
      id: 'streak_3',
      label: '3-Day Streak',
      description: 'Participated 3 days in a row',
      emoji: '🔥',
      earned: streak >= 3,
    },
    {
      id: 'streak_7',
      label: 'Week Warrior',
      description: 'Participated 7 days in a row',
      emoji: '⚡',
      earned: streak >= 7,
    },
    {
      id: 'missions_5',
      label: 'Veteran Hunter',
      description: 'Completed 5 missions',
      emoji: '🏆',
      earned: completedCount >= 5,
    },
    {
      id: 'missions_10',
      label: 'Elite Hunter',
      description: 'Completed 10 missions',
      emoji: '👑',
      earned: completedCount >= 10,
    },
  ];
}

// ─── types ───────────────────────────────────────────────────────────────────

interface TrustData {
  score: number;
  reliability: number;
  skill: number;
  impact: number;
}

interface RecommendedHunt extends Hunt {
  matchScore?: number;
}

// ─── page ────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { user, isLoaded } = useAuth();
  const router = useRouter();

  // hydrated local state — read once on mount (SSR-safe)
  const [appState] = useState(() => {
    if (typeof window === 'undefined') return null;
    return loadState();
  });
  const [profile] = useState(() => {
    if (typeof window === 'undefined') return null;
    return loadProfile();
  });

  // remote data
  const [recommendations, setRecommendations] = useState<RecommendedHunt[]>([]);
  const [trust, setTrust] = useState<TrustData | null>(null);
  const [inProgressHunts, setInProgressHunts] = useState<
    { hunt: Hunt; progress: HuntProgress }[]
  >([]);
  const [loadingRecs, setLoadingRecs] = useState(true);
  const [loadingTrust, setLoadingTrust] = useState(true);
  const [huntsResolved, setHuntsResolved] = useState(false);

  const [tourDone, setTourDone] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return !!localStorage.getItem('xhunt_tour_done');
  });

  // ── auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      router.replace('/sign-in');
      return;
    }
    if (!user.onboardingComplete) {
      router.replace('/get-started');
    }
  }, [isLoaded, user, router]);

  // ── resolve in-progress hunts ──────────────────────────────────────────────
  useEffect(() => {
    if (!appState) {
      setHuntsResolved(true);
      return;
    }

    const progressEntries = Object.values(appState.progress).filter(
      (p) => !p.completedAt,
    );

    if (progressEntries.length === 0) {
      setHuntsResolved(true);
      return;
    }

    const localHunts = appState.hunts;
    const resolved = progressEntries
      .map((p) => {
        const hunt = localHunts.find((h) => h.id === p.huntId);
        return hunt ? { hunt, progress: p } : null;
      })
      .filter(Boolean) as { hunt: Hunt; progress: HuntProgress }[];

    const missingIds = progressEntries
      .filter((p) => !localHunts.find((h) => h.id === p.huntId))
      .map((p) => p.huntId);

    if (missingIds.length === 0) {
      setInProgressHunts(resolved);
      setHuntsResolved(true);
      return;
    }

    // fetch hunts not in local cache
    const supabase = createClient();
    void Promise.resolve(
      supabase
        .from('missions')
        .select('*')
        .in('id', missingIds)
        .then(({ data }) => {
          const fetched = (data ?? []) as Hunt[];
          const fromRemote = progressEntries
            .filter((p) => missingIds.includes(p.huntId))
            .map((p) => {
              const hunt = fetched.find((h) => h.id === p.huntId);
              return hunt ? { hunt, progress: p } : null;
            })
            .filter(Boolean) as { hunt: Hunt; progress: HuntProgress }[];
          setInProgressHunts([...resolved, ...fromRemote]);
        }),
    )
      .catch(() => {
        setInProgressHunts(resolved);
      })
      .finally(() => setHuntsResolved(true));
  }, [appState]);

  // ── fetch recommendations ──────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    setLoadingRecs(true);
    fetch('/api/recommendations?limit=5')
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => {
        setRecommendations(Array.isArray(data) ? data : (data?.items ?? []));
      })
      .catch(() => setRecommendations([]))
      .finally(() => setLoadingRecs(false));
  }, [user]);

  // ── fetch trust score ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    setLoadingTrust(true);
    fetch('/api/economy/trust')
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => setTrust(data))
      .catch(() => setTrust(null))
      .finally(() => setLoadingTrust(false));
  }, [user]);

  // ── derived values ─────────────────────────────────────────────────────────
  const streak = appState?.streak ?? 0;
  const completedHunts = appState?.completedHunts ?? [];
  const rewardsBalance = sumRewards(completedHunts);
  const verificationStatus = appState?.verificationStatus ?? {};

  const pendingVerificationCount = Object.values(verificationStatus).filter(
    (v) =>
      v.status === 'submitted' ||
      v.status === 'ai_reviewing' ||
      v.status === 'manual_review',
  ).length;

  const reputationScore = trust?.score ?? profile?.impactScore ?? 0;
  const badges = computeBadges(completedHunts.length, streak);
  const earnedBadges = badges.filter((b) => b.earned);

  const firstName = user?.displayName?.split(' ')[0] ?? 'Hunter';
  const initials = getInitials(user?.displayName ?? 'XH');

  const quickActions: QuickAction[] = [
    {
      icon: Compass,
      label: 'Find Opportunities',
      href: '/explore',
      color: t.accent,
      description: 'Discover new opportunities',
    },
    {
      icon: Play,
      label: 'My Progress',
      href: '/missions',
      color: t.ai,
      description: 'Resume your active missions',
    },
    {
      icon: Upload,
      label: 'Submit Proof',
      href: '/missions?tab=active',
      color: t.warning,
      description: 'Upload proof for review',
    },
  ];

  // ── skeleton while auth loads ──────────────────────────────────────────────
  if (!isLoaded) {
    return (
      <div className="consumer-app" style={{ minHeight: '100vh', background: t.bg }}>
        <div className="consumer-app-inner">
          <SkeletonHome />
        </div>
        <BottomNav />
      </div>
    );
  }

  // redirect in flight — render nothing
  if (!user || !user.onboardingComplete) {
    return null;
  }

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="consumer-app" style={{ minHeight: '100vh', background: t.bg }}>
      <div className="consumer-app-inner" style={{ paddingBottom: 32 }}>

        {/* 1. Page Header */}
        <PageHeader
          greeting={getGreeting()}
          title={firstName}
          avatarUrl={user.avatarUrl}
          initials={initials}
          sticky
          borderBottom
          action={
            <Badge
              variant="dot"
              color="error"
              invisible={pendingVerificationCount === 0}
              overlap="circular"
              anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              <IconButton
                aria-label="Notifications"
                onClick={() => router.push('/notifications')}
                sx={{
                  border: '1px solid', borderColor: 'divider',
                  borderRadius: '12px', color: 'text.secondary',
                  width: 38, height: 38,
                }}
              >
                <Bell size={20} />
              </IconButton>
            </Badge>
          }
        />

        <div style={{ padding: '0 16px' }}>

          {/* 2. Participation Wallet — hero card */}
          <section style={{ marginTop: 16 }}>
            <Box
              onClick={() => router.push('/rewards')}
              sx={{
                borderRadius: '20px',
                background: `linear-gradient(135deg, ${t.ai}28 0%, ${t.accent}12 100%)`,
                border: `1px solid ${t.ai}35`,
                p: 2.5,
                cursor: 'pointer',
                transition: 'opacity 0.15s',
                '&:hover': { opacity: 0.9 },
              }}
            >
              <Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: 'center' }}>
                <Wallet size={16} color={t.aiLight} />
                <Typography variant="caption" sx={{ fontWeight: 600, color: t.aiLight, letterSpacing: '0.04em', textTransform: 'uppercase', fontSize: 11 }}>
                  Participation Wallet
                </Typography>
              </Stack>
              <Typography sx={{ fontSize: 38, fontWeight: 800, color: 'text.primary', letterSpacing: '-1px', lineHeight: 1 }}>
                ${rewardsBalance.toFixed(2)}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, display: 'block' }}>
                earned · {completedHunts.length} mission{completedHunts.length !== 1 ? 's' : ''} completed
              </Typography>
              <Grid container spacing={1} sx={{ mt: 2.5 }}>
                {[
                  { label: 'Available', value: `$${Math.max(0, rewardsBalance - rewardsBalance * 0.3).toFixed(0)}`, color: t.accent },
                  { label: 'Pending',   value: `$${(rewardsBalance * 0.3).toFixed(0)}`,                             color: t.warning },
                  { label: 'Score',     value: Math.round(reputationScore),                                          color: t.aiLight },
                  { label: 'Streak',    value: `${streak}d`,                                                         color: t.info },
                ].map(({ label, value, color }) => (
                  <Grid key={label} size={{ xs: 3 }}>
                    <Box sx={{ bgcolor: 'rgba(0,0,0,0.2)', borderRadius: '12px', p: '10px 8px', textAlign: 'center' }}>
                      <Typography sx={{ fontSize: 17, fontWeight: 800, color, lineHeight: 1 }}>{value}</Typography>
                      <Typography variant="caption" sx={{ fontSize: 10, color: 'text.disabled', mt: 0.5, display: 'block' }}>{label}</Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </section>

          {/* 3. Quick Actions */}
          <section style={{ marginTop: 20 }}>
            <QuickActionGrid actions={quickActions} columns={3} />
          </section>

          {/* 4. Featured Opportunity — "Ready for you" hero */}
          <section style={{ marginTop: 20 }}>
            <Stack direction="row" sx={{ mb: 1.25, alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Ready for you
              </Typography>
              <Box
                component="button"
                onClick={() => router.push('/explore')}
                sx={{ background: 'none', border: 0, cursor: 'pointer', fontSize: 11, fontWeight: 600, color: t.accent, p: 0 }}
              >
                See all
              </Box>
            </Stack>
            {loadingRecs ? (
              <SkeletonCards count={1} />
            ) : recommendations.length > 0 ? (
              <MissionCard hunt={recommendations[0]} />
            ) : (
              <Surface variant="card" padding={0}>
                <Box
                  sx={{ p: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                  onClick={() => router.push('/explore')}
                >
                  <Box>
                    <Typography sx={{ fontSize: 15, fontWeight: 700, color: t.txt, mb: 0.5 }}>
                      Ready to participate?
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: t.txtDim }}>
                      Discover opportunities to earn, contribute, and create impact.
                    </Typography>
                  </Box>
                  <ArrowRight size={18} color={t.accent} />
                </Box>
              </Surface>
            )}
          </section>

          {/* 5. Ready for you — recommendation feed */}
          <section style={{ marginTop: 28 }}>
            <SectionHeader title="Ready for you" seeAllHref="/explore" />
            <Stack spacing={1.25} sx={{ mt: 1.25 }}>
              {loadingRecs ? (
                <SkeletonCards count={3} />
              ) : recommendations.length <= 1 ? (
                <EmptyState
                  icon={Compass}
                  title="No opportunities yet"
                  description="Explore missions to find opportunities matching your interests."
                  action={{ label: 'Explore All', href: '/explore' }}
                  compact
                />
              ) : (
                recommendations.slice(1).map((hunt) => (
                  <Surface
                    key={hunt.id}
                    variant="card"
                    padding={0}
                    hover
                    onClick={() => router.push(`/hunt/${hunt.id}`)}
                  >
                    <Box sx={{ p: '14px 16px' }}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography sx={{ fontSize: 20, fontWeight: 800, color: 'primary.main', lineHeight: 1, mb: 0.5 }}>
                            {hunt.reward}
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', mb: 0.75 }} noWrap>
                            {hunt.title}
                          </Typography>
                          <Stack direction="row" spacing={1.5} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
                            {hunt.estimated_time && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Timer size={11} color={t.txtFaint} />
                                <Typography variant="caption" color="text.disabled">{hunt.estimated_time}</Typography>
                              </Box>
                            )}
                            {hunt.location && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <MapPin size={11} color={t.txtFaint} />
                                <Typography variant="caption" color="text.disabled" noWrap sx={{ maxWidth: 120 }}>{hunt.location}</Typography>
                              </Box>
                            )}
                          </Stack>
                        </Box>
                        <Box sx={{ flexShrink: 0 }}>
                          <Chip
                            label={hunt.category ?? hunt.missionType ?? 'Mission'}
                            size="small"
                            sx={{
                              height: 22, fontSize: 10, fontWeight: 700,
                              bgcolor: `${t.accent}14`, color: 'primary.main',
                              border: `1px solid ${t.accent}25`,
                            }}
                          />
                        </Box>
                      </Stack>
                    </Box>
                  </Surface>
                ))
              )}
            </Stack>
          </section>

          {/* 5. Continue where you left off — active opportunities */}
          {(huntsResolved && inProgressHunts.length > 0) && (
            <section style={{ marginTop: 28 }}>
              <SectionHeader
                title="Continue where you left off"
                count={inProgressHunts.length}
                seeAllHref="/missions"
              />
              <Stack spacing={1} sx={{ mt: 1.25 }}>
                {inProgressHunts.slice(0, 3).map(({ hunt, progress }) => {
                  const stepsDone = progress.completedSteps.length;
                  const stepsTotal = hunt.steps.length;
                  const pct = stepsTotal > 0 ? (stepsDone / stepsTotal) * 100 : 0;
                  return (
                    <Surface
                      key={hunt.id}
                      variant="card"
                      padding={0}
                      hover
                      onClick={() => router.push(`/active/${hunt.id}`)}
                    >
                      <Box sx={{ p: '12px 14px' }}>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                          <Box sx={{ width: 36, height: 36, borderRadius: '50%', border: `3px solid ${t.accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative' }}>
                            <svg width="36" height="36" style={{ position: 'absolute', top: -3, left: -3, transform: 'rotate(-90deg)' }}>
                              <circle cx="18" cy="18" r="15" fill="none" stroke={t.accent} strokeWidth="3"
                                strokeDasharray={`${2 * Math.PI * 15}`}
                                strokeDashoffset={`${2 * Math.PI * 15 * (1 - pct / 100)}`}
                                strokeLinecap="round"
                              />
                            </svg>
                            <Typography sx={{ fontSize: 9, fontWeight: 800, color: 'primary.main', zIndex: 1 }}>
                              {Math.round(pct)}%
                            </Typography>
                          </Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', fontSize: 13 }} noWrap>
                              {hunt.title}
                            </Typography>
                            <Typography variant="caption" color="text.disabled">
                              Step {stepsDone}/{stepsTotal} · {hunt.reward}
                            </Typography>
                          </Box>
                          <ArrowRight size={14} color={t.accent} />
                        </Stack>
                      </Box>
                    </Surface>
                  );
                })}
              </Stack>
            </section>
          )}

          {/* 7. Your Reputation — compact side-by-side */}
          <section style={{ marginTop: 28 }}>
            <SectionHeader title="Your Reputation" seeAllHref="/profile" />
            <Grid container spacing={1.5} sx={{ mt: 1.25 }}>
              {/* Streak */}
              <Grid size={{ xs: 6 }}>
                <Box sx={{ bgcolor: `${t.warning}10`, border: `1px solid ${t.warning}25`, borderRadius: '16px', p: 2, textAlign: 'center' }}>
                  <Flame size={22} color={t.warning} />
                  <Typography sx={{ fontSize: 28, fontWeight: 800, color: t.warning, lineHeight: 1.1, mt: 0.5 }}>{streak}</Typography>
                  <Typography variant="caption" color="text.secondary">Day Streak</Typography>
                </Box>
              </Grid>
              {/* Trust Score */}
              <Grid size={{ xs: 6 }}>
                <Box sx={{ bgcolor: `${t.ai}10`, border: `1px solid ${t.ai}25`, borderRadius: '16px', p: 2, textAlign: 'center' }}>
                  <TrendingUp size={22} color={t.aiLight} />
                  <Typography sx={{ fontSize: 28, fontWeight: 800, color: t.aiLight, lineHeight: 1.1, mt: 0.5 }}>
                    {Math.round(reputationScore)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {loadingTrust ? 'Loading…' : (trust ? 'Trust Score' : 'Rep Score')}
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            {/* Dimension bars (compact) */}
            {trust && (
              <Surface variant="card" style={{ marginTop: 12 }}>
                <Stack spacing={1.25}>
                  <ProgressBar value={trust.reliability} color={t.accent} label="Reliability" showPercent />
                  <ProgressBar value={trust.skill} color={t.ai} label="Skill" showPercent />
                  <ProgressBar value={trust.impact} color={t.info} label="Impact" showPercent />
                </Stack>
              </Surface>
            )}
          </section>

          {/* 7. Achievements */}
          {earnedBadges.length > 0 && (
            <section style={{ marginTop: 28, marginBottom: 16 }}>
              <SectionHeader title="Achievements" count={earnedBadges.length} />
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))', gap: 1.25, mt: 1.25 }}>
                {earnedBadges.map((badge) => (
                  <Surface key={badge.id} variant="card" padding={12} style={{ textAlign: 'center' }}>
                    <Typography sx={{ fontSize: 26, lineHeight: 1 }}>{badge.emoji}</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.3, display: 'block', mt: 0.75, fontSize: 11 }}>
                      {badge.label}
                    </Typography>
                  </Surface>
                ))}
              </Box>
            </section>
          )}

        </div>

      </div>

      {!tourDone && (
        <OnboardingTour onDone={() => {
          localStorage.setItem('xhunt_tour_done', '1');
          setTourDone(true);
        }} />
      )}
      <BottomNav />
      <CopilotFab />
    </div>
  );
}

// ─── skeleton helpers ─────────────────────────────────────────────────────────

const shimmerStyle = `
  @keyframes xh-shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
`;

function SkeletonBlock({
  height = 16,
  width = '100%',
  radius = 8,
}: {
  height?: number;
  width?: number | string;
  radius?: number;
}) {
  return (
    <>
      <style>{shimmerStyle}</style>
      <div
        style={{
          height,
          width,
          borderRadius: radius,
          background: t.card,
          backgroundImage: `linear-gradient(90deg, ${t.card} 0%, ${t.panel} 50%, ${t.card} 100%)`,
          backgroundSize: '200% 100%',
          animation: 'xh-shimmer 1.4s ease-in-out infinite',
        }}
      />
    </>
  );
}

function SkeletonCards({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            background: t.card,
            borderRadius: 20,
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <SkeletonBlock height={14} width="60%" />
          <SkeletonBlock height={11} />
          <SkeletonBlock height={11} width="80%" />
          <SkeletonBlock height={4} radius={4} />
        </div>
      ))}
    </>
  );
}

function SkeletonHome() {
  return (
    <div style={{ padding: 16 }}>
      {/* fake header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
        <SkeletonBlock height={44} width={44} radius={22} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <SkeletonBlock height={11} width="40%" />
          <SkeletonBlock height={16} width="55%" />
        </div>
        <SkeletonBlock height={36} width={36} radius={12} />
      </div>
      {/* stat grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
          marginBottom: 32,
        }}
      >
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              background: t.card,
              borderRadius: 16,
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <SkeletonBlock height={11} width="60%" />
            <SkeletonBlock height={24} width="40%" />
          </div>
        ))}
      </div>
      {/* cards */}
      <SkeletonCards count={3} />
    </div>
  );
}

function PulsingDot() {
  return (
    <>
      <style>{`
        @keyframes xh-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
        }
      `}</style>
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: t.accent,
          animation: 'xh-pulse 1.4s ease-in-out infinite',
        }}
      />
    </>
  );
}
