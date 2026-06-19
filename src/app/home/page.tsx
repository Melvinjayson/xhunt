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
} from 'lucide-react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Badge from '@mui/material/Badge';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid2';

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
      label: 'Find Mission',
      href: '/explore',
      color: t.accent,
      description: 'Discover new opportunities',
    },
    {
      icon: Play,
      label: 'Continue',
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
    {
      icon: Gift,
      label: 'My Rewards',
      href: '/rewards',
      color: t.info,
      description: 'View earnings and badges',
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

          {/* 2. Participation Overview */}
          <section style={{ marginTop: 24 }}>
            <SectionHeader title="Your Participation" />
            <Grid container spacing={1.5} sx={{ mt: 1.5 }}>
              <Grid size={{ xs: 6, lg: 3 }}>
                <StatTile label="Active Missions" value={inProgressHunts.length} icon={Zap} accent={t.accent} href="/missions" />
              </Grid>
              <Grid size={{ xs: 6, lg: 3 }}>
                <StatTile label="Pending Verification" value={pendingVerificationCount} icon={Clock} accent={t.warning} href="/missions" />
              </Grid>
              <Grid size={{ xs: 6, lg: 3 }}>
                <StatTile label="Rewards Available" value={`$${rewardsBalance.toFixed(0)}`} icon={Star} accent={t.ai} href="/rewards" />
              </Grid>
              <Grid size={{ xs: 6, lg: 3 }}>
                <StatTile label="Reputation Score" value={Math.round(reputationScore)} icon={TrendingUp} accent={t.info} href="/profile" />
              </Grid>
            </Grid>
          </section>

          {/* 3. Continue Participation */}
          <section style={{ marginTop: 32 }}>
            <SectionHeader
              title="Continue Participation"
              count={inProgressHunts.length > 0 ? inProgressHunts.length : undefined}
              seeAllHref="/missions"
            />
            <Stack spacing={1.5} sx={{ mt: 1.5 }}>
              {!huntsResolved ? (
                <SkeletonCards count={2} />
              ) : inProgressHunts.length === 0 ? (
                <EmptyState
                  icon={Zap}
                  title="No missions in progress"
                  description="Start a mission to track your progress here."
                  action={{ label: 'Find Missions', href: '/explore' }}
                  compact
                />
              ) : (
                inProgressHunts.slice(0, 3).map(({ hunt, progress }) => {
                  const vStatus = verificationStatus[hunt.id];
                  const stepsDone = progress.completedSteps.length;
                  const stepsTotal = hunt.steps.length;
                  const nextStep = hunt.steps[progress.currentStepIndex];

                  return (
                    <Surface
                      key={hunt.id}
                      variant="card"
                      padding={0}
                      hover
                      onClick={() => router.push(`/active/${hunt.id}`)}
                    >
                      <Box sx={{ p: 2 }}>
                        {/* title + CTA */}
                        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }} noWrap>
                              {hunt.title}
                            </Typography>
                            {nextStep && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', mt: 0.5 }}>
                                Next: {nextStep.instruction}
                              </Typography>
                            )}
                          </Box>
                          <Stack direction="row" alignItems="center" spacing={0.25} sx={{ color: 'primary.main', flexShrink: 0 }}>
                            <Typography variant="caption" sx={{ fontWeight: 600, color: 'primary.main' }}>Continue</Typography>
                            <ChevronRight size={14} color={t.accent} />
                          </Stack>
                        </Stack>

                        {/* step progress */}
                        <Box sx={{ mt: 1.5 }}>
                          <ProgressBar
                            value={stepsTotal > 0 ? (stepsDone / stepsTotal) * 100 : 0}
                            color={t.accent}
                            height={4}
                            label={`Step ${stepsDone} of ${stepsTotal}`}
                          />
                        </Box>

                        {/* meta row */}
                        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mt: 1.25 }}>
                          {hunt.deadline && (
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                              <Clock size={12} color={t.txtFaint} />
                              <Typography variant="caption" color="text.disabled">
                                {new Date(hunt.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                              </Typography>
                            </Stack>
                          )}
                          <Typography variant="caption" sx={{ fontWeight: 600, color: 'primary.main' }}>
                            {hunt.reward}
                          </Typography>
                          {vStatus && (
                            <Chip label={vStatus.status.replace(/_/g, ' ')} size="small" sx={{ ml: 'auto !important', height: 18, fontSize: 9, fontWeight: 700, color: t.warning, bgcolor: `${t.warning}14`, textTransform: 'capitalize' }} />
                          )}
                        </Stack>
                      </Box>
                    </Surface>
                  );
                })
              )}
            </Stack>
          </section>

          {/* 4. Recommended Opportunities */}
          <section style={{ marginTop: 32 }}>
            <SectionHeader
              title="Recommended for You"
              count={recommendations.length > 0 ? recommendations.length : undefined}
              seeAllHref="/explore"
            />
            <Stack spacing={1.5} sx={{ mt: 1.5 }}>
              {loadingRecs ? (
                <SkeletonCards count={3} />
              ) : recommendations.length === 0 ? (
                <EmptyState
                  icon={Compass}
                  title="No recommendations yet"
                  description="Complete your profile or explore manually to get tailored suggestions."
                  action={{ label: 'Explore All', href: '/explore' }}
                  compact
                />
              ) : (
                recommendations.map((hunt) => (
                  <MissionCard
                    key={hunt.id}
                    hunt={hunt}
                    matchScore={hunt.matchScore}
                    missionStatus="active"
                  />
                ))
              )}
            </Stack>
          </section>

          {/* 5. Rewards Snapshot */}
          <section style={{ marginTop: 32 }}>
            <SectionHeader title="Rewards" seeAllHref="/rewards" />
            <Surface variant="card" style={{ marginTop: 12 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                {/* earned balance */}
                <Box>
                  <Typography variant="caption" color="text.secondary">Earned balance</Typography>
                  <Typography sx={{ fontSize: 28, fontWeight: 700, color: 'primary.main', letterSpacing: '-0.5px', lineHeight: 1.2, mt: 0.5 }}>
                    ${rewardsBalance.toFixed(2)}
                  </Typography>
                  <Typography variant="caption" color="text.disabled">
                    from {completedHunts.length} completed mission{completedHunts.length !== 1 ? 's' : ''}
                  </Typography>
                </Box>

                {/* streak badge */}
                <Stack alignItems="center" spacing={0.5} sx={{ p: '12px 16px', borderRadius: '14px', bgcolor: `${t.warning}18`, border: `1px solid ${t.warning}30`, flexShrink: 0 }}>
                  <Flame size={24} color={t.warning} />
                  <Typography sx={{ fontSize: 22, fontWeight: 700, color: t.warning, lineHeight: 1 }}>{streak}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>day streak</Typography>
                </Stack>
              </Stack>
            </Surface>
          </section>

          {/* 6. Reputation Snapshot */}
          <section style={{ marginTop: 32 }}>
            <SectionHeader title="Reputation" seeAllHref="/profile" />
            <Surface variant="card" style={{ marginTop: 12 }}>
              {loadingTrust ? (
                <div
                  style={{
                    height: 100,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <PulsingDot />
                </div>
              ) : trust === null && !profile ? (
                <EmptyState
                  emoji="📊"
                  title="Reputation building"
                  description="Complete missions to establish your trust score."
                  compact
                />
              ) : (
                <>
                  {/* composite score header */}
                  <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2.5 }}>
                    <Box sx={{ width: 52, height: 52, borderRadius: '50%', bgcolor: `${t.ai}20`, border: `2px solid ${t.ai}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Typography sx={{ fontSize: 16, fontWeight: 700, color: 'secondary.main' }}>
                        {Math.round(reputationScore)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>Trust Score</Typography>
                      <Typography variant="caption" color="text.secondary">{profile?.archetype ?? 'Participant'}</Typography>
                    </Box>
                  </Stack>

                  {/* dimension bars */}
                  <Stack spacing={1.25}>
                    {trust ? (
                      <>
                        <ProgressBar value={trust.reliability} color={t.accent} label="Reliability" showPercent />
                        <ProgressBar value={trust.skill} color={t.ai} label="Skill" showPercent />
                        <ProgressBar value={trust.impact} color={t.info} label="Impact" showPercent />
                      </>
                    ) : (
                      profile?.strengths.slice(0, 3).map((s) => (
                        <ProgressBar
                          key={s.name}
                          value={s.score}
                          color={t.ai}
                          label={s.name}
                          showPercent
                        />
                      ))
                    )}
                  </Stack>
                </>
              )}
            </Surface>
          </section>

          {/* 7. Recent Achievements */}
          <section style={{ marginTop: 32 }}>
            <SectionHeader
              title="Achievements"
              count={earnedBadges.length > 0 ? earnedBadges.length : undefined}
            />
            {earnedBadges.length === 0 ? (
              <div style={{ marginTop: 12 }}>
                <EmptyState
                  icon={Award}
                  title="No badges yet"
                  description="Complete missions and maintain streaks to earn your first badge."
                  compact
                />
              </div>
            ) : (
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 1.5, mt: 1.5 }}>
                {earnedBadges.map((badge) => (
                  <Surface key={badge.id} variant="card" padding={14} style={{ textAlign: 'center' }}>
                    <Typography sx={{ fontSize: 28, lineHeight: 1 }}>{badge.emoji}</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.primary', lineHeight: 1.3, display: 'block', mt: 1 }}>
                      {badge.label}
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary', lineHeight: 1.3, display: 'block', mt: 0.5 }}>
                      {badge.description}
                    </Typography>
                  </Surface>
                ))}
                {badges.filter((b) => !b.earned).map((badge) => (
                  <Surface key={badge.id} variant="card" padding={14} style={{ textAlign: 'center', opacity: 0.35 }}>
                    <Typography sx={{ fontSize: 28, lineHeight: 1, filter: 'grayscale(1)' }}>{badge.emoji}</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.primary', lineHeight: 1.3, display: 'block', mt: 1 }}>
                      {badge.label}
                    </Typography>
                  </Surface>
                ))}
              </Box>
            )}
          </section>

          {/* 8. Quick Actions */}
          <section style={{ marginTop: 32, marginBottom: 16 }}>
            <SectionHeader title="Quick Actions" />
            <div style={{ marginTop: 12 }}>
              <QuickActionGrid actions={quickActions} columns={4} />
            </div>
          </section>

        </div>

        {/* Desktop right rail */}
        <DesktopRail
          streak={streak}
          reputationScore={reputationScore}
          trust={trust}
          quickActions={quickActions}
          inProgressCount={inProgressHunts.length}
        />
      </div>

      <BottomNav />
      <CopilotFab />
    </div>
  );
}

// ─── desktop right rail ───────────────────────────────────────────────────────

interface DesktopRailProps {
  streak: number;
  reputationScore: number;
  trust: TrustData | null;
  quickActions: QuickAction[];
  inProgressCount: number;
}

function DesktopRail({
  streak,
  reputationScore,
  trust,
  quickActions,
  inProgressCount,
}: DesktopRailProps) {
  return (
    <>
      <style>{`
        .xh-desktop-rail { display: none !important; }
        @media (min-width: 1200px) {
          .xh-desktop-rail { display: block !important; }
        }
      `}</style>
      <aside
        className="xh-desktop-rail"
        style={{
          position: 'fixed',
          top: 80,
          right: 0,
          width: 240,
          bottom: 0,
          overflowY: 'auto',
          padding: '0 16px 32px',
        }}
      >
        {/* streak */}
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ bgcolor: `${t.warning}18`, border: `1px solid ${t.warning}30`, borderRadius: '16px', p: 2, mb: 1.75 }}>
          <Flame size={20} color={t.warning} />
          <Box>
            <Typography sx={{ fontSize: 20, fontWeight: 700, color: t.warning, lineHeight: 1 }}>{streak}</Typography>
            <Typography variant="caption" color="text.secondary">day streak</Typography>
          </Box>
        </Stack>

        {/* reputation compact */}
        <Box sx={{ bgcolor: t.card, borderRadius: '16px', p: 2, mb: 1.75, border: '1px solid', borderColor: 'divider' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>Reputation</Typography>
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: 'secondary.main' }}>{Math.round(reputationScore)}</Typography>
          </Stack>
          {trust && (
            <Stack spacing={1}>
              <ProgressBar value={trust.reliability} color={t.accent} label="Reliability" height={3} />
              <ProgressBar value={trust.skill} color={t.ai} label="Skill" height={3} />
              <ProgressBar value={trust.impact} color={t.info} label="Impact" height={3} />
            </Stack>
          )}
        </Box>

        {/* active missions count */}
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ bgcolor: t.card, borderRadius: '16px', p: 2, mb: 1.75, border: '1px solid', borderColor: 'divider' }}>
          <CheckCircle2 size={18} color={t.accent} />
          <Box>
            <Typography sx={{ fontSize: 20, fontWeight: 700, color: 'text.primary', lineHeight: 1 }}>{inProgressCount}</Typography>
            <Typography variant="caption" color="text.secondary">active missions</Typography>
          </Box>
        </Stack>

        {/* quick actions */}
        <Box sx={{ bgcolor: t.card, borderRadius: '16px', p: 2, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', mb: 1.25 }}>Quick Actions</Typography>
          <Stack spacing={0.75}>
            {quickActions.map((action) => (
              <Box
                key={action.label}
                component="a"
                href={action.href}
                sx={{ display: 'flex', alignItems: 'center', gap: 1.25, p: '8px 10px', borderRadius: '10px', bgcolor: 'background.paper', textDecoration: 'none', color: 'text.primary', '&:hover': { bgcolor: t.panel } }}
              >
                <action.icon size={15} color={action.color ?? t.accent} />
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.primary' }}>{action.label}</Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      </aside>
    </>
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
