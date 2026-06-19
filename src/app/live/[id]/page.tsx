'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Eye, Play,
  ChevronRight, CheckSquare, Lightbulb,
  Lock,
} from 'lucide-react';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/context';
import { t } from '@/theme/colors';

const T = {
  bg:       '#050816',
  panel:    '#07101F',
  elev:     '#17262a',
  line:     'rgba(255,255,255,.07)',
  line2:    'rgba(255,255,255,.12)',
  txt:      '#e9eff0',
  muted:    '#7d8b8e',
  dim:      '#54625f',
  green:    '#22FFAA',
  red:      '#FF5C7A',
  amber:    '#FFB84D',
  live:     '#ff3b30',
  liveGlow: 'rgba(255,59,48,.18)',
} as const;

interface DbStep {
  id: number;
  type: 'action' | 'reflection' | 'discovery';
  instruction: string;
  success_criteria: string;
}

interface SessionData {
  id: string;
  host_id: string;
  title: string;
  description: string | null;
  status: 'scheduled' | 'live' | 'ended';
  current_step_index: number;
  total_steps: number;
  viewer_count: number;
  is_pro_only: boolean;
  started_at: string | null;
  ended_at: string | null;
  host: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  };
  mission: {
    id: string;
    title: string;
    story_context: string | null;
    steps: DbStep[];
  } | null;
}

const STEP_TYPE_META = {
  action:      { icon: <Play size={14} fill="currentColor" />,        color: '#22FFAA', label: 'Action'      },
  reflection:  { icon: <Lightbulb size={14} />,                        color: '#6D5DFD', label: 'Reflection'  },
  discovery:   { icon: <CheckSquare size={14} />,                      color: '#FFB84D', label: 'Discovery'   },
} as const;

export default function LiveSessionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user: authUser } = useAuth();
  const [session, setSession] = useState<SessionData | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tier, setTier] = useState<string>('free');
  const [hostBusy, setHostBusy] = useState(false);

  const supabase = createClient();

  const loadSession = useCallback(async () => {
    const res = await fetch(`/api/live/${id}`);
    if (!res.ok) { setNotFound(true); setLoading(false); return; }
    const data: SessionData = await res.json();
    setSession(data);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    async function init() {
      const [, subRes] = await Promise.all([
        loadSession(),
        fetch('/api/subscription/status'),
      ]);
      setUserId(authUser?.id ?? null);

      if (subRes.ok) {
        const s = await subRes.json();
        setTier(s.tier ?? 'free');
      }
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Realtime: listen for step advances and status changes
  useEffect(() => {
    const channel = supabase
      .channel(`live-session-${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'live_sessions', filter: `id=eq.${id}` },
        (payload) => {
          setSession(prev => prev ? { ...prev, ...(payload.new as Partial<SessionData>) } : null);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const isHost      = session?.host_id === userId;
  const currentStep = session?.mission?.steps?.[session.current_step_index] ?? null;
  const stepMeta    = currentStep ? (STEP_TYPE_META[currentStep.type] ?? STEP_TYPE_META.action) : null;
  const isLive      = session?.status === 'live';
  const isEnded     = session?.status === 'ended';
  const isLocked    = session?.is_pro_only && tier !== 'pro' && !isHost;

  async function handleNextStep() {
    if (!session || hostBusy) return;
    setHostBusy(true);
    try {
      const res = await fetch(`/api/live/${id}/step`, { method: 'PATCH' });
      if (res.ok) {
        const { current_step_index } = await res.json();
        setSession(prev => prev ? { ...prev, current_step_index } : null);
      }
    } finally {
      setHostBusy(false);
    }
  }

  async function handleEndSession() {
    if (!session || hostBusy) return;
    if (!confirm('End this live session?')) return;
    setHostBusy(true);
    try {
      await fetch(`/api/live/${id}/end`, { method: 'POST' });
      setSession(prev => prev ? { ...prev, status: 'ended', ended_at: new Date().toISOString() } : null);
    } finally {
      setHostBusy(false);
    }
  }

  const progress = session && session.total_steps > 0
    ? ((session.current_step_index + 1) / session.total_steps) * 100
    : 0;

  if (loading) {
    return (
      <Box component="main" sx={{ background: T.bg, minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.4, repeat: Infinity }}
          style={{ width: 12, height: 12, borderRadius: '50%', background: T.live }}
        />
      </Box>
    );
  }

  if (notFound || !session) {
    return (
      <Box component="main" sx={{ background: T.bg, minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
        <Typography sx={{ fontSize: '2rem', mb: 2 }}>📡</Typography>
        <Typography sx={{ fontSize: 16, fontWeight: 700, color: T.txt, mb: 1 }}>Session not found</Typography>
        <Typography sx={{ fontSize: 13, color: T.muted, mb: 2.5 }}>This live session may have ended or doesn&apos;t exist.</Typography>
        <Link href="/timeline" style={{ color: T.green, fontSize: 14, fontWeight: 600 }}>← Back to Timeline</Link>
      </Box>
    );
  }

  // Locked screen for Pro-only sessions
  if (isLocked) {
    return (
      <Box component="main" sx={{ background: T.bg, minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
        <Typography sx={{ fontSize: '2.5rem', mb: 2 }}>🔒</Typography>
        <Typography sx={{ fontSize: 18, fontWeight: 700, color: T.txt, mb: 1 }}>{session.title}</Typography>
        <Typography sx={{ fontSize: 14, color: T.muted, mb: 3, lineHeight: 1.6 }}>
          This is a Pro-only live session hosted by <Box component="span" sx={{ color: T.txt }}>{session.host.display_name}</Box>.<br />
          Upgrade to Pro to watch and participate.
        </Typography>
        <Button
          component={Link}
          href="/upgrade"
          startIcon={<Lock size={16} />}
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 1,
            padding: '12px 24px',
            borderRadius: '14px',
            textDecoration: 'none',
            background: 'linear-gradient(135deg,#22FFAA,#6D5DFD)',
            color: '#050816',
            fontWeight: 700,
            fontSize: 15,
            mb: 1.5,
            textTransform: 'none',
          }}
        >
          Upgrade to Pro
        </Button>
        <br />
        <Link href="/timeline" style={{ color: T.dim, fontSize: 13 }}>← Back to Timeline</Link>
      </Box>
    );
  }

  return (
    <Box component="main" sx={{ background: T.bg, minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(7,13,14,.92)', backdropFilter: 'blur(16px)',
        borderBottom: `1px solid ${T.line}`,
        padding: '12px 16px',
      }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <IconButton onClick={() => router.back()} sx={{ color: T.muted, p: 0.5 }}>
            <ArrowLeft size={20} />
          </IconButton>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: 15, fontWeight: 700, color: T.txt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {session.title}
            </Typography>
            <Typography sx={{ fontSize: 11, color: T.muted }}>
              {session.host.display_name}
            </Typography>
          </Box>
          {/* Status badge */}
          <Stack direction="row" spacing={0.75} sx={{ flexShrink: 0, alignItems: 'center' }}>
            {isLive && (
              <Chip
                label="● LIVE"
                size="small"
                sx={{
                  bgcolor: `${T.live}18`,
                  color: T.live,
                  fontWeight: 800,
                  fontSize: 11,
                  border: `1px solid ${T.live}33`,
                  animation: 'pulse 2s infinite',
                  '@keyframes pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.6 } },
                }}
              />
            )}
            {isEnded && (
              <Chip
                label="ENDED"
                size="small"
                sx={{ bgcolor: 'transparent', color: T.dim, fontWeight: 700, fontSize: 11, border: `1px solid ${T.line}` }}
              />
            )}
            {session.status === 'scheduled' && (
              <Chip
                label="SCHEDULED"
                size="small"
                sx={{ bgcolor: `${T.amber}18`, color: T.amber, fontWeight: 700, fontSize: 11, border: `1px solid ${T.amber}33` }}
              />
            )}
          </Stack>
        </Stack>
      </Box>

      {/* Content */}
      <Stack spacing={2} sx={{ flex: 1, padding: '20px 16px' }}>
        {/* Viewer count + mission */}
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Stack direction="row" spacing={0.75} sx={{ color: T.muted, fontSize: 13, alignItems: 'center' }}>
            <Eye size={15} />
            <Typography sx={{ color: T.muted, fontSize: 13 }}>{session.viewer_count.toLocaleString()} watching</Typography>
          </Stack>
          {session.mission && (
            <Typography sx={{ fontSize: 12, color: T.dim }}>🎯 {session.mission.title}</Typography>
          )}
        </Stack>

        {/* Progress bar */}
        {session.total_steps > 1 && (
          <Box>
            <Stack direction="row" sx={{ mb: 0.75, justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: 12, color: T.muted, fontWeight: 600 }}>
                Step {session.current_step_index + 1} of {session.total_steps}
              </Typography>
              <Typography sx={{ fontSize: 12, color: T.dim }}>{Math.round(progress)}%</Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 4,
                borderRadius: 4,
                bgcolor: T.elev,
                '& .MuiLinearProgress-bar': {
                  borderRadius: 4,
                  bgcolor: isLive ? T.live : T.green,
                  transition: 'width 0.4s ease-out',
                },
              }}
            />
          </Box>
        )}

        {/* Current step card */}
        <AnimatePresence mode="wait">
          {isLive && currentStep ? (
            <motion.div
              key={session.current_step_index}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              style={{ flex: 1 }}
            >
              <Card sx={{ bgcolor: T.panel, border: `1px solid ${T.line2}`, borderRadius: '20px', flex: 1 }}>
                <CardContent sx={{ padding: '20px !important' }}>
                  {stepMeta && (
                    <Chip
                      label={stepMeta.label.toUpperCase()}
                      size="small"
                      icon={<Box sx={{ display: 'flex', alignItems: 'center', color: stepMeta.color }}>{stepMeta.icon}</Box>}
                      sx={{
                        bgcolor: `${stepMeta.color}18`,
                        color: stepMeta.color,
                        fontWeight: 700,
                        fontSize: 11,
                        border: `1px solid ${stepMeta.color}30`,
                        borderRadius: '8px',
                        mb: 2,
                        letterSpacing: '0.04em',
                      }}
                    />
                  )}
                  <Typography sx={{ fontSize: 17, fontWeight: 600, color: T.txt, lineHeight: 1.55, mb: 2 }}>
                    {currentStep.instruction}
                  </Typography>
                  {currentStep.success_criteria && (
                    <Box sx={{ padding: '10px 14px', borderRadius: '12px', bgcolor: T.elev, border: `1px solid ${T.line}` }}>
                      <Typography sx={{ fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: '0.04em', mb: 0.5 }}>SUCCESS CRITERIA</Typography>
                      <Typography sx={{ fontSize: 13, color: T.muted, lineHeight: 1.5 }}>{currentStep.success_criteria}</Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ) : isEnded ? (
            <Card sx={{ bgcolor: T.panel, border: `1px solid ${T.line}`, borderRadius: '20px', textAlign: 'center' }}>
              <CardContent sx={{ padding: '2rem !important' }}>
                <Typography sx={{ fontSize: '2rem', mb: 1.5 }}>🏁</Typography>
                <Typography sx={{ fontSize: 16, fontWeight: 700, color: T.txt, mb: 1 }}>Session ended</Typography>
                <Typography sx={{ fontSize: 13, color: T.muted }}>
                  {session.host.display_name} has wrapped up this live session.
                </Typography>
              </CardContent>
            </Card>
          ) : session.status === 'scheduled' ? (
            <Card sx={{ bgcolor: T.panel, border: `1px solid ${T.line}`, borderRadius: '20px', textAlign: 'center' }}>
              <CardContent sx={{ padding: '2rem !important' }}>
                <Typography sx={{ fontSize: '2rem', mb: 1.5 }}>⏳</Typography>
                <Typography sx={{ fontSize: 16, fontWeight: 700, color: T.txt, mb: 1 }}>Not started yet</Typography>
                <Typography sx={{ fontSize: 13, color: T.muted }}>
                  Stay here — the page updates automatically when the host starts.
                </Typography>
              </CardContent>
            </Card>
          ) : null}
        </AnimatePresence>

        {/* Mission description (if set) */}
        {session.mission?.story_context && (
          <Box sx={{ padding: '14px 16px', borderRadius: '16px', bgcolor: T.elev, border: `1px solid ${T.line}` }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: '0.04em', mb: 0.75 }}>ABOUT THIS MISSION</Typography>
            <Typography sx={{ fontSize: 13, color: T.muted, lineHeight: 1.6 }}>
              {session.mission.story_context}
            </Typography>
          </Box>
        )}
      </Stack>

      {/* Bottom actions */}
      <Box sx={{
        padding: '16px 16px 32px',
        borderTop: `1px solid ${T.line}`,
        background: 'rgba(7,13,14,.95)', backdropFilter: 'blur(12px)',
      }}>
        {/* Host controls */}
        {isHost && isLive && (
          <Stack direction="row" spacing={1.25} sx={{ mb: 1.5 }}>
            <Button
              onClick={handleNextStep}
              disabled={hostBusy || (session.current_step_index + 1 >= session.total_steps)}
              endIcon={<ChevronRight size={16} />}
              sx={{
                flex: 1,
                padding: '12px',
                borderRadius: '12px',
                border: 'none',
                bgcolor: (hostBusy || session.current_step_index + 1 >= session.total_steps) ? T.elev : T.green,
                color: (hostBusy || session.current_step_index + 1 >= session.total_steps) ? T.dim : '#050816',
                fontWeight: 700,
                fontSize: 14,
                textTransform: 'none',
                '&:hover': {
                  bgcolor: (hostBusy || session.current_step_index + 1 >= session.total_steps) ? T.elev : T.green,
                },
                '&.Mui-disabled': { bgcolor: T.elev, color: T.dim },
              }}
            >
              Next Step
            </Button>
            <Button
              onClick={handleEndSession}
              disabled={hostBusy}
              variant="outlined"
              sx={{
                padding: '12px 16px',
                borderRadius: '12px',
                border: `1px solid ${T.red}`,
                color: T.red,
                fontWeight: 600,
                fontSize: 14,
                textTransform: 'none',
                '&:hover': { bgcolor: `${T.red}10`, border: `1px solid ${T.red}` },
              }}
            >
              End
            </Button>
          </Stack>
        )}

        {/* Viewer actions */}
        {!isHost && session.mission && !isEnded && (
          <Button
            component={Link}
            href="/missions"
            startIcon={<Play size={16} fill="#050816" />}
            fullWidth
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              padding: '14px',
              borderRadius: '14px',
              textDecoration: 'none',
              bgcolor: T.green,
              color: '#050816',
              fontWeight: 700,
              fontSize: 15,
              mb: 1.25,
              textTransform: 'none',
              '&:hover': { bgcolor: T.green },
            }}
          >
            Start This Mission
          </Button>
        )}

        <Button
          component={Link}
          href="/timeline"
          fullWidth
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '11px',
            borderRadius: '14px',
            textDecoration: 'none',
            border: `1px solid ${T.line2}`,
            color: T.muted,
            fontWeight: 600,
            fontSize: 13,
            textTransform: 'none',
            '&:hover': { bgcolor: `rgba(255,255,255,0.04)`, border: `1px solid ${T.line2}` },
          }}
        >
          ← Back to Timeline
        </Button>
      </Box>
    </Box>
  );
}
