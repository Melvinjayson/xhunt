'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Target, Gift, User } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/home',     icon: Home,   label: 'Home'     },
  { href: '/explore',  icon: Search, label: 'Explore'  },
  { href: '/missions', icon: Target, label: 'Missions', center: true },
  { href: '/timeline', icon: Gift,   label: 'Rewards'  },
  { href: '/profile',  icon: User,   label: 'Profile'  },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        background: 'rgba(5,8,22,0.88)',
        backdropFilter: 'blur(24px)',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div style={{ maxWidth: 430, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '10px 8px 10px' }}>
        {NAV_ITEMS.map(({ href, icon: Icon, label, center }) => {
          const active = pathname === href || pathname.startsWith(href + '/');

          if (center) {
            return (
              <Link key={href} href={href} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                <div
                  style={{
                    width: 52, height: 52, borderRadius: '50%',
                    background: active ? '#22FFAA' : '#0A1226',
                    border: active ? 'none' : '1px solid rgba(34,255,170,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: active ? '0 0 28px rgba(34,255,170,0.45)' : '0 0 14px rgba(34,255,170,0.12)',
                    marginTop: -18,
                    transition: 'all .2s ease',
                  }}
                >
                  <Icon size={22} strokeWidth={active ? 2.5 : 1.8} style={{ color: active ? '#050816' : '#22FFAA' }} />
                </div>
                <span style={{ fontSize: 9.5, fontWeight: 600, color: active ? '#22FFAA' : '#4A5578', letterSpacing: '.02em' }}>
                  {label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={href}
              href={href}
              style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '2px 10px', borderRadius: 14, position: 'relative' }}
            >
              {active && (
                <div style={{
                  position: 'absolute', top: -4, left: '50%', transform: 'translateX(-50%)',
                  width: 24, height: 2, borderRadius: 2,
                  background: '#22FFAA',
                  boxShadow: '0 0 8px rgba(34,255,170,0.7)',
                }} />
              )}
              <Icon size={20} strokeWidth={active ? 2.2 : 1.7} style={{ color: active ? '#22FFAA' : '#4A5578', transition: 'color .15s' }} />
              <span style={{ fontSize: 9.5, fontWeight: 600, color: active ? '#22FFAA' : '#4A5578', letterSpacing: '.02em' }}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
