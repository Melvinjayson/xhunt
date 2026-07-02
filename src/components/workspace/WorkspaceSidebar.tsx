'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import {
  LayoutDashboard, Layers, Radar, TrendingUp,
  BarChart3, Bot, Cpu,
  Coins, Globe,
  ShieldCheck, Plug, Users,
  CreditCard, Settings,
  ChevronDown, Plus, Sparkles, Zap, Building2,
  Sun, Moon,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { getDefaultConfig, mergeFeatureConfig } from '@/lib/features';
import type { TenantFeatureConfig, NavFlags } from '@/lib/features';
import { t } from '@/theme/colors';

type NavFlag = keyof NavFlags | null;

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  flag: NavFlag;
  minTier?: 'growth' | 'enterprise';
}

// Single priority-ordered nav list. AGENTS.md caps the workspace sidebar at 8
// visible items per tier; because the enterprise tier unlocks every flag, we show
// the top 8 enabled items and fold any remainder into a collapsible "More" section
// (nothing is removed — every page stays reachable). Order = priority.
const MAX_VISIBLE = 8;

const NAV_ITEMS: NavItem[] = [
  { href: '/workspace',                 label: 'Dashboard',       icon: LayoutDashboard, exact: true, flag: null },
  { href: '/workspace/missions',        label: 'Mission Studio',  icon: Layers,          flag: null },
  { href: '/workspace/mission-control', label: 'Mission Control', icon: Radar,           flag: null },
  { href: '/workspace/outcomes',        label: 'Outcomes',        icon: TrendingUp,      flag: 'outcomes' },
  { href: '/workspace/analytics',       label: 'Analytics',       icon: BarChart3,       flag: 'analytics',   minTier: 'growth' },
  { href: '/workspace/agents',          label: 'AI Agents',       icon: Bot,             flag: 'agents',      minTier: 'growth' },
  { href: '/workspace/marketplace',     label: 'Marketplace',     icon: Globe,           flag: 'marketplace', minTier: 'growth' },
  { href: '/workspace/community',       label: 'Community',       icon: Users,           flag: 'community',   minTier: 'growth' },
  { href: '/workspace/intelligence',    label: 'XIL Hub',         icon: Cpu,             flag: 'xilHub',      minTier: 'enterprise' },
  { href: '/workspace/economy',         label: 'Economy',         icon: Coins,           flag: 'economy',     minTier: 'enterprise' },
  { href: '/workspace/governance',      label: 'Governance',      icon: ShieldCheck,     flag: 'governance',  minTier: 'enterprise' },
  { href: '/workspace/integrations',    label: 'Integrations',    icon: Plug,            flag: null },
  { href: '/workspace/billing',         label: 'Billing',         icon: CreditCard,      flag: null },
  { href: '/workspace/settings',        label: 'Settings',        icon: Settings,        flag: null },
];

const PLAN_BADGE: Record<string, { label: string; cls: string; style?: React.CSSProperties }> = {
  enterprise: { label: 'Enterprise', cls: '', style: { background: `${t.ai}26`, color: t.aiLight, borderColor: `${t.ai}4D` } },
  growth:     { label: 'Growth',     cls: 'bg-accent/10 text-accent border-accent/20' },
  starter:    { label: 'Starter',    cls: '', style: { background: t.panel, color: t.txtDim, borderColor: 'rgba(255,255,255,0.08)' } },
};

interface Props {
  orgName: string;
  plan: string;
  userName: string | null;
  userRole: string;
  avatarUrl: string | null;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function WorkspaceSidebar({ orgName, plan, userName, userRole, avatarUrl, isOpen = false, onClose }: Props) {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const badge = PLAN_BADGE[plan] ?? PLAN_BADGE.starter;
  const [config, setConfig] = useState<TenantFeatureConfig>(getDefaultConfig(plan));
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const saved = localStorage.getItem('xhunt-theme') as 'dark' | 'light' | null;
    setTheme(saved ?? 'dark');
  }, []);

  useEffect(() => {
    fetch('/api/workspace/features')
      .then((r) => r.json())
      .then((data: TenantFeatureConfig) => { if (data?.maturity) setConfig(data); })
      .catch(() => { setConfig(mergeFeatureConfig(getDefaultConfig(plan), {})); });
  }, [plan]);

  const [showMore, setShowMore] = useState(false);

  function isNavEnabled(flag: NavFlag): boolean {
    if (flag === null) return true;
    return config.nav[flag] === true;
  }

  const enabledItems = NAV_ITEMS.filter((i) => isNavEnabled(i.flag));
  const primaryItems = enabledItems.slice(0, MAX_VISIBLE);
  const overflowItems = enabledItems.slice(MAX_VISIBLE);

  function renderNavItem({ href, label, icon: Icon, exact }: NavItem) {
    const active = exact ? pathname === href : pathname.startsWith(href);
    return (
      <Link key={href} href={href}
        className={cn(
          'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-100',
          active ? 'bg-accent/10 text-accent' : 'hover:bg-card'
        )}
        style={
          active && config.branding.primaryColor
            ? { backgroundColor: `${config.branding.primaryColor}18`, color: config.branding.primaryColor }
            : (!active ? { color: t.txtDim } : {})
        }
      >
        <Icon size={15} strokeWidth={active ? 2.2 : 1.8}
          className={active ? 'text-accent' : ''}
          style={
            active && config.branding.primaryColor
              ? { color: config.branding.primaryColor }
              : (!active ? { color: t.txtFaint } : {})
          } />
        {label}
        {active && <div className="ml-auto w-1 h-1 rounded-full bg-accent flex-shrink-0"
          style={config.branding.primaryColor ? { backgroundColor: config.branding.primaryColor } : {}} />}
      </Link>
    );
  }

  function toggleTheme() {
    const next: 'dark' | 'light' = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('xhunt-theme', next);
  }

  const initials = (userName ?? orgName ?? 'U').slice(0, 2).toUpperCase();
  const agentCount = config.maturity === 'enterprise' ? '12' : config.maturity === 'growth' ? '6' : '2';

  return (
    <>
      {isOpen && (
        <div className="portal-overlay md:hidden" onClick={onClose} aria-hidden="true" />
      )}
      <aside
        className="portal-sidebar liquid-nav flex flex-col"
        style={{ background: t.surface, borderRight: `1px solid ${t.panel}` }}
        data-open={isOpen ? 'true' : 'false'}
      >
        {/* Org Header */}
        <div className="px-4 py-4" style={{ borderBottom: `1px solid ${t.panel}` }}>
          <div className="flex items-center gap-3 px-2 py-2.5 rounded-xl cursor-pointer transition-colors group hover:bg-card">
            <div className="w-8 h-8 rounded-lg border border-accent/20 flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ background: `linear-gradient(to bottom right, rgba(34,255,170,0.2), rgba(109,93,253,0.2))` }}>
              {config.branding.logoUrl
                ? <img src={config.branding.logoUrl} alt="" className="w-full h-full object-cover" />
                : <Building2 size={15} className="text-accent" strokeWidth={1.8} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold truncate leading-tight" style={{ color: t.txt }}>
                {config.branding.appName ?? orgName}
              </p>
              <p className="text-[10px] mt-0.5 capitalize" style={{ color: t.txtFaint }}>{config.maturity} tier</p>
            </div>
            <ChevronDown size={13} className="flex-shrink-0" style={{ color: t.txtFaint }} />
          </div>
          <div className={cn('mt-2 mx-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold tracking-wide', badge.cls)} style={badge.style}>
            <Sparkles size={9} strokeWidth={2.5} />
            {badge.label}
          </div>
        </div>

        {/* New Mission CTA */}
        <div className="px-4 py-3" style={{ borderBottom: `1px solid ${t.panel}` }}>
          <Link href="/workspace/missions/new">
            <button
              className="flex items-center gap-2 w-full h-9 px-3 bg-accent rounded-xl font-semibold text-[12px] hover:bg-accent-dark transition-colors shadow-[0_4px_16px_rgba(34,255,170,0.25)]"
              style={{ color: t.bg, ...(config.branding.primaryColor ? { backgroundColor: config.branding.primaryColor } : {}) }}
            >
              <Plus size={14} strokeWidth={2.5} />
              New Mission
            </button>
          </Link>
        </div>

        {/* Navigation — top 8 items visible; the rest fold into "More". */}
        <nav className="flex-1 px-3 py-3 overflow-y-auto flex flex-col gap-0.5">
          {primaryItems.map(renderNavItem)}

          {overflowItems.length > 0 && (
            <>
              <button
                onClick={() => setShowMore((v) => !v)}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-100 hover:bg-card"
                style={{ color: t.txtFaint }}
              >
                <ChevronDown size={15} strokeWidth={1.8}
                  style={{ color: t.txtFaint, transform: showMore ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                {showMore ? 'Less' : `More (${overflowItems.length})`}
              </button>
              {showMore && overflowItems.map(renderNavItem)}
            </>
          )}
        </nav>

        {/* AI Status + Theme */}
        <div className="px-4 py-3" style={{ borderTop: `1px solid ${t.panel}` }}>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg flex-1" style={{ background: `${t.ai}14`, border: `1px solid ${t.ai}26` }}>
              <div className="w-1.5 h-1.5 rounded-full breathe flex-shrink-0" style={{ background: t.accent }} />
              <Zap size={12} strokeWidth={1.8} style={{ color: t.aiLight }} />
              <span className="text-[11px] font-medium" style={{ color: t.aiLight }}>{agentCount} Agents Active</span>
            </div>
            <button onClick={toggleTheme} title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 hover:bg-card"
              style={{ color: t.txtFaint }}>
              {theme === 'dark' ? <Sun size={13} strokeWidth={1.8} /> : <Moon size={13} strokeWidth={1.8} />}
            </button>
          </div>
        </div>

        {/* User Profile */}
        <div className="px-3 py-3" style={{ borderTop: `1px solid ${t.panel}` }}>
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl transition-colors group hover:bg-card">
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold overflow-hidden" style={{ background: `linear-gradient(to bottom right, ${t.ai}, ${t.accent})`, color: t.bg }}>
              {avatarUrl
                ? <img src={avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                : initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold truncate leading-tight" style={{ color: t.txt }}>{userName ?? 'Admin'}</p>
              <p className="text-[10px] capitalize" style={{ color: t.txtFaint }}>{userRole.replace('_', ' ')}</p>
            </div>
            <button onClick={() => signOut({ redirectUrl: '/' })} title="Sign out"
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md"
              style={{ color: t.txtFaint }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = t.error; (e.currentTarget as HTMLButtonElement).style.background = `${t.error}14`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = t.txtFaint; (e.currentTarget as HTMLButtonElement).style.background = ''; }}>
              <Settings size={13} strokeWidth={1.8} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
