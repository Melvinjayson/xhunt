'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell, Trophy, Zap, Heart, Users, Radio, CheckCircle2,
  XCircle, Gift, Settings, ArrowRight, RefreshCw,
} from 'lucide-react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import BottomNav from '@/components/BottomNav';
import { t } from '@/theme/colors';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

const TYPE_META: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  mission_start:    { icon: Zap,          color: t.ai,      label: 'Mission' },
  mission_complete: { icon: CheckCircle2, color: t.accent,  label: 'Mission' },
  proof_approved:   { icon: CheckCircle2, color: t.accent,  label: 'Approved' },
  proof_rejected:   { icon: XCircle,      color: t.error,   label: 'Rejected' },
  reward_earned:    { icon: Gift,         color: t.warning,  label: 'Reward' },
  follow:           { icon: Users,        color: t.ai,       label: 'Social' },
  mention:          { icon: Heart,        color: '#a78bfa',  label: 'Mention' },
  community:        { icon: Users,        color: t.accent,   label: 'Community' },
  live_session:     { icon: Radio,        color: t.error,    label: 'Live' },
  system:           { icon: Bell,         color: t.txtFaint, label: 'System' },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json() as { notifications: Notification[]; unread: number };
        setNotifications(data.notifications ?? []);
        setUnread(data.unread ?? 0);
      }
    } catch {
      // silently ignore fetch errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function markRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnread((u) => Math.max(0, u - 1));
    await fetch(`/api/notifications/${id}`, { method: 'PATCH' });
  }

  async function markAllRead() {
    setMarkingAll(true);
    await fetch('/api/notifications/read-all', { method: 'PATCH' });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
    setMarkingAll(false);
  }

  function handleClick(n: Notification) {
    if (!n.read) void markRead(n.id);
    if (n.link) router.push(n.link);
  }

  return (
    <div className="consumer-app" style={{ minHeight: '100vh', background: t.bg }}>
      <Box sx={{ maxWidth: 600, mx: 'auto', px: 2, pt: 3, pb: 14 }}>

        {/* Header */}
        <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 3 }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Bell size={20} color={t.accent} />
            <Typography variant="h6" sx={{ fontWeight: 800, color: t.txt, letterSpacing: '-0.02em' }}>
              Notifications
            </Typography>
            {unread > 0 && (
              <Chip
                label={unread}
                size="small"
                sx={{
                  height: 20, fontSize: 11, fontWeight: 700,
                  bgcolor: `${t.accent}22`, color: t.accent,
                  border: `1px solid ${t.accent}40`,
                }}
              />
            )}
          </Stack>
          <Stack direction="row" spacing={1}>
            <IconButton onClick={() => { setLoading(true); void load(); }} size="small" sx={{ color: t.txtDim }}>
              <RefreshCw size={15} />
            </IconButton>
            {unread > 0 && (
              <Button
                onClick={() => void markAllRead()}
                disabled={markingAll}
                size="small"
                sx={{ fontSize: 11, color: t.txtDim, textTransform: 'none', px: 1.5 }}
              >
                Mark all read
              </Button>
            )}
          </Stack>
        </Stack>

        {loading ? (
          <Stack spacing={1.5}>
            {[0, 1, 2, 3].map((i) => (
              <Box key={i} sx={{
                height: 68, borderRadius: '14px',
                background: `linear-gradient(90deg, ${t.card} 25%, ${t.surface} 50%, ${t.card} 75%)`,
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.4s infinite',
              }} />
            ))}
            <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
          </Stack>
        ) : notifications.length === 0 ? (
          <Stack sx={{ alignItems: "center", justifyContent: "center", pt: 10, gap: 2 }}>
            <Box sx={{
              width: 64, height: 64, borderRadius: '50%',
              background: `${t.txtFaint}10`, border: `1px solid ${t.txtFaint}20`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Bell size={28} color={t.txtFaint} />
            </Box>
            <Typography variant="body2" sx={{ color: t.txtDim, textAlign: 'center' }}>
              No notifications yet.<br />Activity from missions, rewards, and followers will appear here.
            </Typography>
          </Stack>
        ) : (
          <Stack spacing={0} sx={{
            background: t.card, border: `1px solid rgba(255,255,255,.06)`,
            borderRadius: '16px', overflow: 'hidden',
          }}>
            {notifications.map((n, idx) => {
              const meta = TYPE_META[n.type] ?? TYPE_META.system;
              const Icon = meta.icon;
              return (
                <Box key={n.id}>
                  {idx > 0 && <Divider sx={{ borderColor: 'rgba(255,255,255,.04)' }} />}
                  <Box
                    onClick={() => handleClick(n)}
                    sx={{
                      display: 'flex', alignItems: 'flex-start', gap: 2,
                      p: 2, cursor: n.link ? 'pointer' : 'default',
                      background: n.read ? 'transparent' : `${t.ai}06`,
                      transition: 'background 0.15s',
                      '&:hover': n.link ? { background: `${t.ai}10` } : {},
                    }}
                  >
                    {/* Icon */}
                    <Box sx={{
                      width: 36, height: 36, borderRadius: '10px', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: `${meta.color}14`, border: `1px solid ${meta.color}22`,
                    }}>
                      <Icon size={16} color={meta.color} strokeWidth={2} />
                    </Box>

                    {/* Content */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" spacing={1} sx={{ mb: 0.25, alignItems: 'center' }}>
                        {!n.read && (
                          <Box sx={{
                            width: 6, height: 6, borderRadius: '50%',
                            background: t.accent, flexShrink: 0,
                          }} />
                        )}
                        <Typography sx={{
                          fontSize: 13, fontWeight: n.read ? 500 : 700,
                          color: n.read ? t.txtDim : t.txt,
                          lineHeight: 1.4,
                        }}>
                          {n.title}
                        </Typography>
                      </Stack>
                      {n.body && (
                        <Typography sx={{ fontSize: 12, color: t.txtFaint, lineHeight: 1.5, mt: 0.25 }}>
                          {n.body}
                        </Typography>
                      )}
                      <Stack direction="row" spacing={1} sx={{ mt: 0.75, alignItems: 'center' }}>
                        <Chip
                          label={meta.label}
                          size="small"
                          sx={{
                            height: 16, fontSize: 10, fontWeight: 600,
                            bgcolor: `${meta.color}10`, color: meta.color,
                            border: `1px solid ${meta.color}20`,
                          }}
                        />
                        <Typography sx={{ fontSize: 11, color: t.txtFaint }}>
                          {timeAgo(n.created_at)}
                        </Typography>
                      </Stack>
                    </Box>

                    {/* Arrow for clickable */}
                    {n.link && (
                      <ArrowRight size={14} color={t.txtFaint} style={{ flexShrink: 0, marginTop: 2 }} />
                    )}
                  </Box>
                </Box>
              );
            })}
          </Stack>
        )}

        {/* Settings link */}
        {notifications.length > 0 && (
          <Stack direction="row" sx={{ mt: 3, justifyContent: 'center' }}>
            <Button
              startIcon={<Settings size={13} />}
              size="small"
              sx={{ fontSize: 11, color: t.txtFaint, textTransform: 'none' }}
            >
              Notification settings
            </Button>
          </Stack>
        )}
      </Box>
      <BottomNav />
    </div>
  );
}
