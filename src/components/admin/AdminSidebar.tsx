'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Target, Users, BarChart3, Settings, LogOut,
  UserSquare2, Gift, ShieldCheck, Bot, TrendingUp, Network
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { createClient } from '@/lib/supabase/client';

const NAV_GROUPS = [
  {
    label: 'Operate',
    items: [
      { href: '/admin', icon: LayoutDashboard, label: 'Overview', exact: true },
      { href: '/admin/missions', icon: Target, label: 'Missions', exact: false },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { href: '/admin/agents', icon: Bot, label: 'AI Agents', exact: false },
      { href: '/admin/outcomes', icon: TrendingUp, label: 'Outcomes', exact: false },
      { href: '/admin/knowledge-graph', icon: Network, label: 'Knowledge Graph', exact: false },
      { href: '/admin/analytics', icon: BarChart3, label: 'Analytics', exact: false },
      { href: '/admin/governance', icon: ShieldCheck, label: 'Governance', exact: false },
    ],
  },
  {
    label: 'Configure',
    items: [
      { href: '/admin/audience', icon: UserSquare2, label: 'Audience', exact: false },
      { href: '/admin/rewards', icon: Gift, label: 'Rewards', exact: false },
      { href: '/admin/users', icon: Users, label: 'Users', exact: false },
      { href: '/admin/settings', icon: Settings, label: 'Settings', exact: false },
    ],
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/auth/login');
  }

  return (
    <aside className="w-60 flex-shrink-0 bg-[#0a1020] border-r border-[#1c2a3a] flex flex-col min-h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-[#1c2a3a]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center shadow-[0_0_12px_rgba(0,230,118,0.35)]">
            <span className="text-[#060a0e] font-black text-base">X</span>
          </div>
          <div>
            <span className="text-[15px] font-bold text-[#e8f0fe]">hunt</span>
            <span className="ml-1.5 text-[10px] font-semibold text-[#3d5068] uppercase tracking-wider">Admin</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-4 overflow-y-auto">
        {NAV_GROUPS.map(({ label: groupLabel, items }) => (
          <div key={groupLabel}>
            <p className="px-3 mb-1 text-[10px] font-bold text-[#3d5068] uppercase tracking-widest">{groupLabel}</p>
            <div className="flex flex-col gap-0.5">
              {items.map(({ href, icon: Icon, label, exact }) => {
                const active = exact ? pathname === href : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150',
                      active
                        ? 'bg-accent/10 text-accent border border-accent/20'
                        : 'text-[#7a8fa8] hover:text-[#e8f0fe] hover:bg-[#111927]'
                    )}
                  >
                    <Icon size={16} strokeWidth={active ? 2.2 : 1.8} />
                    {label}
                    {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-[#1c2a3a]">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-[13px] font-medium text-[#7a8fa8] hover:text-[#ff5252] hover:bg-[#2a0a0a] transition-all duration-150"
        >
          <LogOut size={16} strokeWidth={1.8} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
