'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, User, Compass, Target, Radio } from 'lucide-react';
import { cn } from '@/lib/cn';

const NAV_ITEMS = [
  { href: '/home',     icon: Home,    label: 'Home'     },
  { href: '/missions', icon: Target,  label: 'Missions' },
  { href: '/timeline', icon: Radio,   label: 'Timeline' },
  { href: '/explore',  icon: Compass, label: 'Explore'  },
  { href: '/profile',  icon: User,    label: 'Profile'  },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: 'rgba(10,18,20,.92)',
        backdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(255,255,255,.07)',
      }}
    >
      <div className="max-w-[430px] mx-auto flex items-center justify-around px-1 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-150"
            >
              <Icon
                size={21}
                strokeWidth={active ? 2.2 : 1.7}
                className={cn(
                  'transition-colors duration-150',
                  active ? 'text-accent' : 'text-[#54625f]'
                )}
              />
              <span
                className={cn(
                  'text-[9px] font-semibold tracking-wide transition-colors duration-150',
                  active ? 'text-accent' : 'text-[#54625f]'
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
