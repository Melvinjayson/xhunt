'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Radio, Users, Clock, Play, Calendar, Lock, Zap, ArrowRight } from 'lucide-react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import BottomNav from '@/components/BottomNav';
import { createClient } from '@/lib/supabase/client';
import { t } from '@/theme/colors';

interface LiveSession {
  id: string;
  title: string;
  description: string | null;
  status: 'scheduled' | 'live' | 'ended';
  viewer_count: number;
  is_pro_only: boolean;
  started_at: string | null;
  scheduled_for: string | null;
  created_at: string;
  host: { id: string; display_name: string | null; avatar_url: string | null } | null;
  mission: { id: string; title: string; category: string } | null;
}

function formatScheduled(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just started';
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h`;
}

export default function LivePage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from('live_sessions')
        .select(`
          id, title, description, status, viewer_count, is_pro_only,
          started_at, scheduled_for, created_at,
          host:host_id ( id, display_name, avatar_url ),
          mission:mission_id ( id, title, category )
        `)
        .in('status', ['live', 'scheduled'])
        .order('status', { ascending: false })
        .order('started_at', { ascending: false })
        .limit(30);

      setSessions((data as unknown as LiveSession[]) ?? []);
      setLoading(false);
    }
    void load();
  }, []);

  const live      = sessions.filter((s) => s.status === 'live');
  const scheduled = sessions.filter((s) => s.status === 'scheduled');

  return (
    <div className="consumer-app" style={{ minHeight: '100vh', background: t.bg }}>
      <Box sx={{ maxWidth: 700, mx: 'auto', px: 2, pt: 3, pb: 14 }}>

        {/* Header */}
        <Stack direction="row" spacing={1.5} sx={{ mb: 1, alignItems: 'center' }}>
          <Box sx={{
            width: 36, height: 36, borderRadius: '10px',
            background: 'rgba(255,59,48,.14)', border: '1px solid rgba(255,59,48,.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Radio size={16} color="#ff3b30" strokeWidth={2} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: t.txt, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              Live Sessions
            </Typography>
            <Typography sx={{ fontSize: 12, color: t.txtFaint }}>
              Watch missions happen in real time
            </Typography>
          </Box>
        </Stack>

        {loading ? (
          <Stack spacing={2} sx={{ mt: 3 }}>
            {[0, 1, 2].map((i) => (
              <Box key={i} sx={{
                height: 100, borderRadius: '16px',
                background: `linear-gradient(90deg, ${t.card} 25%, ${t.surface} 50%, ${t.card} 75%)`,
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.4s infinite',
              }} />
            ))}
            <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
          </Stack>
        ) : sessions.length === 0 ? (
          <Stack sx={{ pt: 10, gap: 2, alignItems: 'center' }}>
            <Box sx={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'rgba(255,59,48,.08)', border: '1px solid rgba(255,59,48,.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Radio size={30} color="rgba(255,59,48,.5)" />
            </Box>
            <Typography variant="body2" sx={{ color: t.txtDim, textAlign: 'center' }}>
              No live sessions right now.<br />Check back later or upgrade to Pro to host your own.
            </Typography>
            <Button
              variant="contained"
              size="small"
              startIcon={<Zap size={14} />}
              onClick={() => router.push('/upgrade')}
              sx={{ borderRadius: '20px', px: 3, mt: 1, fontSize: 13 }}
            >
              Go Pro — Host Live
            </Button>
          </Stack>
        ) : (
          <Stack spacing={3} sx={{ mt: 3 }}>

            {/* Live now */}
            {live.length > 0 && (
              <Box>
                <Stack direction="row" spacing={1} sx={{ mb: 1.5, alignItems: 'center' }}>
                  <Box sx={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: '#ff3b30',
                    boxShadow: '0 0 8px rgba(255,59,48,.8)',
                    animation: 'pulse 1.5s ease-in-out infinite',
                  }} />
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#ff3b30', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Live Now
                  </Typography>
                  <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
                </Stack>
                <Stack spacing={1.5}>
                  {live.map((session) => (
                    <SessionCard key={session.id} session={session} onJoin={() => router.push(`/live/${session.id}`)} />
                  ))}
                </Stack>
              </Box>
            )}

            {/* Scheduled */}
            {scheduled.length > 0 && (
              <Box>
                <Stack direction="row" spacing={1} sx={{ mb: 1.5, alignItems: 'center' }}>
                  <Calendar size={14} color={t.txtDim} />
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: t.txtDim, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Coming Up
                  </Typography>
                </Stack>
                <Stack spacing={1.5}>
                  {scheduled.map((session) => (
                    <SessionCard key={session.id} session={session} onJoin={() => router.push(`/live/${session.id}`)} />
                  ))}
                </Stack>
              </Box>
            )}
          </Stack>
        )}
      </Box>
      <BottomNav />
    </div>
  );
}

function SessionCard({ session, onJoin }: { session: LiveSession; onJoin: () => void }) {
  const isLive = session.status === 'live';
  const host = session.host;
  const initials = host?.display_name
    ? host.display_name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Box
        onClick={onJoin}
        sx={{
          background: t.card, border: `1px solid ${isLive ? 'rgba(255,59,48,.25)' : 'rgba(255,255,255,.07)'}`,
          borderRadius: '16px', p: 2, cursor: 'pointer',
          transition: 'border-color 0.15s, background 0.15s',
          '&:hover': {
            borderColor: isLive ? 'rgba(255,59,48,.5)' : 'rgba(255,255,255,.15)',
            background: isLive ? 'rgba(255,59,48,.04)' : `${t.surface}`,
          },
        }}
      >
        <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
          {/* Host avatar */}
          <Box sx={{ position: 'relative', flexShrink: 0 }}>
            <Avatar
              src={host?.avatar_url ?? undefined}
              sx={{ width: 44, height: 44, bgcolor: isLive ? 'rgba(255,59,48,.18)' : `${t.ai}18`, fontWeight: 700, fontSize: 14, color: isLive ? '#ff3b30' : t.ai }}
            >
              {initials}
            </Avatar>
            {isLive && (
              <Box sx={{
                position: 'absolute', bottom: -2, right: -2,
                width: 14, height: 14, borderRadius: '50%',
                background: '#ff3b30', border: `2px solid ${t.card}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Play size={6} color="#fff" fill="#fff" />
              </Box>
            )}
          </Box>

          {/* Info */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} sx={{ mb: 0.5, alignItems: 'center' }}>
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: t.txt, lineHeight: 1.3 }} noWrap>
                {session.title}
              </Typography>
              {session.is_pro_only && <Lock size={11} color={t.warning} />}
            </Stack>
            {session.description && (
              <Typography sx={{ fontSize: 12, color: t.txtDim, lineHeight: 1.5, mb: 0.75 }} noWrap>
                {session.description}
              </Typography>
            )}
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Typography sx={{ fontSize: 11, color: t.txtFaint }}>
                by {host?.display_name ?? 'Unknown'}
              </Typography>
              {session.mission && (
                <Chip
                  label={session.mission.title}
                  size="small"
                  sx={{ height: 16, fontSize: 10, bgcolor: `${t.ai}12`, color: t.ai, border: `1px solid ${t.ai}22` }}
                />
              )}
              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                {isLive ? (
                  <>
                    <Users size={11} color={t.txtFaint} />
                    <Typography sx={{ fontSize: 11, color: t.txtFaint }}>{session.viewer_count}</Typography>
                    <Typography sx={{ fontSize: 11, color: t.txtFaint }}>·</Typography>
                    <Clock size={11} color={t.txtFaint} />
                    <Typography sx={{ fontSize: 11, color: t.txtFaint }}>{timeAgo(session.started_at!)}</Typography>
                  </>
                ) : (
                  <>
                    <Calendar size={11} color={t.txtFaint} />
                    <Typography sx={{ fontSize: 11, color: t.txtFaint }}>
                      {session.scheduled_for ? formatScheduled(session.scheduled_for) : 'TBD'}
                    </Typography>
                  </>
                )}
              </Stack>
            </Stack>
          </Box>

          {/* CTA */}
          <Button
            size="small"
            variant={isLive ? 'contained' : 'outlined'}
            endIcon={<ArrowRight size={12} />}
            onClick={(e) => { e.stopPropagation(); onJoin(); }}
            sx={{
              flexShrink: 0, fontSize: 12, fontWeight: 700,
              borderRadius: '20px', px: 1.5, py: 0.5,
              ...(isLive
                ? { bgcolor: '#ff3b30', '&:hover': { bgcolor: '#e03028' } }
                : {}),
            }}
          >
            {isLive ? 'Watch' : 'Remind'}
          </Button>
        </Stack>
      </Box>
    </motion.div>
  );
}
