'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Compass, Target, MessageSquare, User, Users } from 'lucide-react';
import { useTotalUnread } from '@/hooks/useMessages';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

const NAV_ITEMS = [
  { href: '/home',     icon: Home,          label: 'Home'     },
  { href: '/explore',  icon: Compass,       label: 'Explore'  },
  { href: '/missions', icon: Target,        label: 'Missions', center: true },
  { href: '/messages', icon: MessageSquare, label: 'Messages', badge: true },
  { href: '/profile',  icon: User,          label: 'Profile'  },
];

const DESKTOP_EXTRA: { href: string; icon: typeof Users; label: string; center?: boolean; badge?: boolean }[] = [
  { href: '/people', icon: Users, label: 'People' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);
  const totalUnread = useTotalUnread(userId);

  return (
    <>
      {/* Desktop padding injection */}
      <style>{`
        @media (min-width: 768px) {
          .consumer-app { padding-left: 72px !important; padding-bottom: 24px !important; }
        }
      `}</style>

      {/* ─── Mobile bottom bar ─── */}
      <nav className="md:hidden liquid-nav" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        borderTop: '1px solid rgba(255,255,255,0.07)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}>
        <div style={{ maxWidth: 500, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '10px 8px 10px' }}>
          {NAV_ITEMS.map(({ href, icon: Icon, label, center, badge }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            const unread = badge && totalUnread > 0 ? totalUnread : 0;
            if (center) return (
              <Link key={href} href={href} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: active ? '#22FFAA' : '#0A1226',
                  border: active ? 'none' : '1px solid rgba(34,255,170,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: active ? '0 0 28px rgba(34,255,170,0.45)' : '0 0 14px rgba(34,255,170,0.12)',
                  marginTop: -18, transition: 'all .2s',
                }}>
                  <Icon size={22} strokeWidth={active ? 2.5 : 1.8} style={{ color: active ? '#050816' : '#22FFAA' }} />
                </div>
                <span style={{ fontSize: 9.5, fontWeight: 600, color: active ? '#22FFAA' : '#4A5578', letterSpacing: '.02em' }}>{label}</span>
              </Link>
            );
            return (
              <Link key={href} href={href} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '2px 10px', borderRadius: 14, position: 'relative' }}>
                {active && <div style={{ position: 'absolute', top: -4, left: '50%', transform: 'translateX(-50%)', width: 24, height: 2, borderRadius: 2, background: '#22FFAA', boxShadow: '0 0 8px rgba(34,255,170,0.7)' }} />}
                <div style={{ position: 'relative' }}>
                  <Icon size={20} strokeWidth={active ? 2.2 : 1.7} style={{ color: active ? '#22FFAA' : '#4A5578', transition: 'color .15s' }} />
                  {unread > 0 && (
                    <div style={{
                      position: 'absolute', top: -5, right: -6,
                      width: 15, height: 15, borderRadius: '50%',
                      background: '#22FFAA', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 8, fontWeight: 800, color: '#050816', border: '2px solid #050816',
                    }}>
                      {unread > 9 ? '9+' : unread}
                    </div>
                  )}
                </div>
                <span style={{ fontSize: 9.5, fontWeight: 600, color: active ? '#22FFAA' : '#4A5578', letterSpacing: '.02em' }}>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ─── Desktop left sidebar ─── */}
      <nav className="hidden md:flex liquid-nav" style={{
        position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 50,
        width: 68, flexDirection: 'column',
        borderRight: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '4px 0 24px rgba(0,0,0,0.35), inset -1px 0 0 rgba(255,255,255,0.06)',
      }}>
        {/* Logo */}
        <Link href="/home" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 64, borderBottom: '1px solid rgba(255,255,255,.06)', textDecoration: 'none', flexShrink: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.png" alt="X-Hunt" style={{ width: 28, height: 28, objectFit: 'contain' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <span style={{ fontSize: 18, fontWeight: 900, color: '#22FFAA', display: 'none' }} aria-hidden>X</span>
        </Link>

        {/* Nav items */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '12px 0' }}>
          {[...NAV_ITEMS, ...DESKTOP_EXTRA].map(({ href, icon: Icon, label, center, badge }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            const unread = badge && totalUnread > 0 ? totalUnread : 0;
            return (
              <Link key={href} href={href} title={label} style={{
                textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                width: 52, padding: '10px 0', borderRadius: 14, position: 'relative',
                background: active ? (center ? '#22FFAA' : 'rgba(34,255,170,.08)') : 'transparent',
                border: active && !center ? '1px solid rgba(34,255,170,.2)' : '1px solid transparent',
                transition: 'all .15s',
              }}>
                <div style={{ position: 'relative' }}>
                  <Icon size={center ? 20 : 18} strokeWidth={active ? 2.4 : 1.7}
                    style={{ color: active ? (center ? '#050816' : '#22FFAA') : '#4A5578', transition: 'color .15s' }} />
                  {unread > 0 && (
                    <div style={{
                      position: 'absolute', top: -4, right: -6,
                      width: 14, height: 14, borderRadius: '50%',
                      background: '#22FFAA', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 7.5, fontWeight: 800, color: '#050816', border: '2px solid #050816',
                    }}>
                      {unread > 9 ? '9+' : unread}
                    </div>
                  )}
                </div>
                <span style={{ fontSize: 8.5, fontWeight: 600, color: active ? (center ? '#050816' : '#22FFAA') : '#4A5578', letterSpacing: '.02em', lineHeight: 1 }}>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
