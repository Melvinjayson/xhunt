'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, User, Compass } from 'lucide-react';
import { cn } from '@/lib/cn';

const NAV_ITEMS = [
  { href: '/home', icon: Home, label: 'Home' },
  { href: '/explore', icon: Compass, label: 'Explore' },
  { href: '/profile', icon: User, label: 'Profile' },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0a1020] border-t border-[#1c2a3a]">
      <div className="max-w-[430px] mx-auto flex items-center justify-around px-2 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-1 px-5 py-1.5 rounded-xl transition-all duration-150"
            >
              <Icon
                size={22}
                strokeWidth={active ? 2.2 : 1.8}
                className={cn(
                  'transition-colors duration-150',
                  active ? 'text-accent' : 'text-[#3d5068]'
                )}
              />
              <span
                className={cn(
                  'text-[10px] font-medium tracking-wide transition-colors duration-150',
                  active ? 'text-accent' : 'text-[#3d5068]'
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
