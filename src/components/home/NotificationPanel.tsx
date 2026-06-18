'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Bell, Trophy, CheckCircle, X as XIcon } from 'lucide-react';
import { t } from '@/theme/colors';
import type { NotificationItem } from '@/hooks/useNotifications';

interface Props {
  open: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  markAllRead: () => void;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function NotifIcon({ type }: { type: string }) {
  if (type === 'reward_earned') return <Trophy size={14} strokeWidth={2} style={{ color: t.warning }} />;
  if (type === 'mission_completed') return <CheckCircle size={14} strokeWidth={2} style={{ color: t.accent }} />;
  return <Bell size={14} strokeWidth={2} style={{ color: t.txtDim }} />;
}

function notifIconBg(type: string): string {
  if (type === 'reward_earned') return `${t.warning}18`;
  if (type === 'mission_completed') return `${t.accent}14`;
  return 'rgba(255,255,255,.06)';
}

function notifHref(n: NotificationItem): string {
  if (n.type === 'reward_earned') return '/rewards';
  if (n.type === 'mission_completed') return '/missions';
  return '/home';
}

export function NotificationPanel({ open: _open, onClose, notifications, unreadCount, loading, markAllRead }: Props) {
  const router = useRouter();

  function handleClick(n: NotificationItem) {
    onClose();
    router.push(notifHref(n));
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 40 }}
      />

      {/* Panel — mobile: slide up from bottom; desktop: dropdown */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        style={{
          position: 'absolute', top: 48, right: 0, zIndex: 50,
          width: 340, maxHeight: '70vh',
          background: t.surface, border: `1px solid ${t.borderMid}`,
          borderRadius: 18, overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          boxShadow: `0 16px 48px rgba(0,0,0,.5), 0 0 0 1px ${t.border}`,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: `1px solid ${t.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: t.txt }}>Notifications</span>
            {unreadCount > 0 && (
              <span style={{ fontSize: 10, fontWeight: 800, color: t.bg, background: t.accent, borderRadius: 999, padding: '1px 7px', minWidth: 18, textAlign: 'center' }}>{unreadCount}</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {unreadCount > 0 && (
              <button onClick={markAllRead} style={{ fontSize: 11, fontWeight: 600, color: t.accent, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                Mark all read
              </button>
            )}
            <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,.05)', border: `1px solid ${t.border}`, cursor: 'pointer' }}>
              <XIcon size={13} strokeWidth={2} style={{ color: t.txtDim }} />
            </button>
          </div>
        </div>

        {/* List */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading && notifications.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: t.txtFaint, fontSize: 12 }}>Loading…</div>
          ) : notifications.length === 0 ? (
            <div style={{ padding: '40px 16px', textAlign: 'center' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,.04)', border: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <Bell size={20} strokeWidth={1.5} style={{ color: t.txtFaint }} />
              </div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: t.txtDim }}>You&apos;re all caught up</p>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: t.txtFaint }}>New notifications will appear here</p>
            </div>
          ) : (
            notifications.map((n) => (
              <button key={n.id} onClick={() => handleClick(n)} style={{
                width: '100%', display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '12px 16px', border: 'none', borderBottom: `1px solid ${t.border}`,
                background: n.read ? 'transparent' : `${t.accent}06`,
                cursor: 'pointer', textAlign: 'left',
              }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: notifIconBg(n.type), flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                  <NotifIcon type={n.type} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: '0 0 2px', fontSize: 12.5, fontWeight: n.read ? 500 : 700, color: t.txt, lineHeight: 1.3 }}>{n.title}</p>
                  {n.body && <p style={{ margin: '0 0 3px', fontSize: 11.5, color: t.txtDim, lineHeight: 1.4 }}>{n.body}</p>}
                  <p style={{ margin: 0, fontSize: 10, color: t.txtFaint }}>{timeAgo(n.created_at)}</p>
                </div>
                {!n.read && (
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: t.accent, flexShrink: 0, marginTop: 4 }} />
                )}
              </button>
            ))
          )}
        </div>
      </motion.div>
    </>
  );
}
