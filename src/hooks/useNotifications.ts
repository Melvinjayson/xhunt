'use client';
import { useState, useEffect, useCallback } from 'react';

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const d = await res.json() as { notifications: NotificationItem[]; unread_count: number };
        setNotifications(d.notifications ?? []);
        setUnreadCount(d.unread_count ?? 0);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const markAllRead = useCallback(async () => {
    await fetch('/api/notifications/read', { method: 'PATCH' });
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  return { notifications, unreadCount, loading, markAllRead };
}
