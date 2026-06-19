'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Settings, Building2, Users, Shield, Palette, Bell,
  Save, Check, AlertCircle, Key, Loader2,
  Trash2, UserPlus, Mail, ShieldCheck, RefreshCw,
  Server, Lock, Unlock, ChevronRight, Sliders,
  Sun, Moon, Upload, Sparkles,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/context';
import { cn } from '@/lib/cn';
import { t } from '@/theme/colors';
import ThemeToggle from '@/components/ThemeToggle';
import type { DbTenant, DbUserProfile } from '@/lib/supabase/types';
import type { TenantFeatureConfig, MaturityTier, NavFlags, FeatureToggles } from '@/lib/features';
import { MATURITY_DEFAULTS, getDefaultConfig, mergeFeatureConfig } from '@/lib/features';

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg', className)} style={{ background: t.panel }} />;
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="relative w-9 h-5 rounded-full transition-all flex-shrink-0"
      style={{
        background: on ? t.accent : t.panel,
        border: on ? 'none' : `1px solid #162440`,
      }}
    >
      <span className="absolute top-0.5 w-4 h-4 rounded-full transition-all" style={{
        right: on ? '0.125rem' : undefined,
        left: on ? undefined : '0.125rem',
        background: on ? '#060a0e' : t.txtFaint,
      }} />
    </button>
  );
}

interface SsoConfig {
  id: string;
  tenant_id: string;
  provider_type: string;
  display_name: string;
  is_enabled: boolean;
  is_default: boolean;
  config: Record<string, string>;
  last_tested_at: string | null;
  login_count: number;
}

const SSO_PROVIDERS = [
  { id: 'microsoft_entra', label: 'Microsoft Entra ID', icon: '🔷', protocol: 'oidc' },
  { id: 'google_workspace', label: 'Google Workspace',  icon: '🔵', protocol: 'oidc' },
  { id: 'okta',            label: 'Okta',               icon: '🔶', protocol: 'saml' },
  { id: 'saml',            label: 'Generic SAML 2.0',   icon: '🔒', protocol: 'saml' },
  { id: 'oidc',            label: 'Generic OIDC',       icon: '🔑', protocol: 'oidc' },
] as const;

const TABS = [
  { id: 'organization',   label: 'Organization',  icon: Building2 },
  { id: 'features',       label: 'Features',      icon: Sliders   },
  { id: 'users',          label: 'Users & Roles', icon: Users     },
  { id: 'security',       label: 'Security',      icon: Shield    },
  { id: 'branding',       label: 'Branding',      icon: Palette   },
  { id: 'notifications',  label: 'Notifications', icon: Bell      },
] as const;

type Tab = (typeof TABS)[number]['id'];

const ROLE_OPTIONS = [
  { value: 'tenant_admin',    label: 'Admin',       desc: 'Full workspace access' },
  { value: 'mission_creator', label: 'Creator',     desc: 'Create and manage missions' },
  { value: 'analyst',         label: 'Analyst',     desc: 'View analytics and reports' },
  { value: 'participant',     label: 'Participant', desc: 'Access and complete missions' },
];

const MATURITY_OPTIONS: { value: MaturityTier; label: string; desc: string; color: string }[] = [
  { value: 'starter',    label: 'Starter',    desc: 'Core mission tools. Best for new teams getting started.', color: t.txtDim  },
  { value: 'growth',     label: 'Growth',     desc: 'Analytics, AI agents, audience engagement + marketplace.', color: t.accent },
  { value: 'enterprise', label: 'Enterprise', desc: 'Full platform: XIL, Economy Protocol, governance + API access.', color: t.ai },
];

const NAV_FEATURE_LABELS: Record<keyof NavFlags, string> = {
  outcomes:      'Outcomes',
  analytics:     'Analytics',
  agents:        'AI Agents',
  knowledgeGraph:'Knowledge Graph',
  xilHub:        'XIL Hub',
  economy:       'Economy Protocol',
  audience:      'Audience',
  rewards:       'Rewards',
  marketplace:   'Marketplace',
  governance:    'Governance',
  community:     'Community Exchange',
  developers:    'Developer Portal',
};

const FEATURE_LABELS: Record<keyof FeatureToggles, { label: string; desc: string; tier: MaturityTier }> = {
  advancedAnalytics: { label: 'Advanced Analytics',    desc: 'Cohort analysis, funnels and custom reports',            tier: 'growth' },
  customAgents:      { label: 'Custom AI Agents',      desc: 'Build and configure domain-specific agents',             tier: 'growth' },
  marketplace:       { label: 'Marketplace Access',    desc: 'List and discover missions in the marketplace',          tier: 'growth' },
  knowledgeGraph:    { label: 'Knowledge Graph',        desc: 'AI-powered knowledge network and discovery',             tier: 'enterprise' },
  xilIntelligence:   { label: 'XIL Intelligence',      desc: 'Full XIL orchestration and constitutional AI',           tier: 'enterprise' },
  economyProtocol:   { label: 'Economy Protocol',      desc: 'Token-based rewards, trust scores and value exchange',   tier: 'enterprise' },
  governance:        { label: 'Governance Module',     desc: 'Constitutional AI oversight and audit trail',            tier: 'enterprise' },
  apiAccess:         { label: 'API Access',            desc: 'Programmatic access via REST API and webhooks',          tier: 'enterprise' },
  whiteLabel:        { label: 'White Label',           desc: 'Custom branding, logo, colors and domain',               tier: 'enterprise' },
  sso:               { label: 'Single Sign-On',        desc: 'SAML 2.0 / OIDC enterprise identity provider',          tier: 'enterprise' },
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('organization');
  const [tenant, setTenant] = useState<DbTenant | null>(null);
  const [users, setUsers] = useState<DbUserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [ssoEnabled, setSsoEnabled] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('participant');
  const [currentUserId, setCurrentUserId] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [ssoConfigs, setSsoConfigs] = useState<SsoConfig[]>([]);
  const [ssoSaving, setSsoSaving] = useState(false);
  const [ssoTesting, setSsoTesting] = useState<string | null>(null);
  const [activeSsoProvider, setActiveSsoProvider] = useState<string>('microsoft_entra');
  const [ssoForm, setSsoForm] = useState({ displayName: '', entityId: '', ssoUrl: '', certificate: '', clientId: '', issuerUrl: '' });

  // Feature config
  const [featureConfig, setFeatureConfig] = useState<TenantFeatureConfig | null>(null);
  const [featureSaving, setFeatureSaving] = useState(false);
  const [featureSaved, setFeatureSaved] = useState(false);

  // Branding
  const [logoUploading, setLogoUploading] = useState(false);
  const [primaryColor, setPrimaryColor] = useState<string>(t.accent);
  const [accentColor, setAccentColor] = useState<string>(t.ai);
  const [appName, setAppName] = useState('');
  const [brandSaved, setBrandSaved] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const { user, isLoaded } = useAuth();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      try {
        if (!isLoaded || !user) return;
        setCurrentUserId(user.id);

        const { data: profile } = await supabase
          .from('user_profiles').select('tenant_id').eq('id', user.id).single();
        if (!profile?.tenant_id) { setLoading(false); return; }
        setTenantId(profile.tenant_id);

        const [tenantRes, usersRes, ssoRes] = await Promise.all([
          supabase.from('tenants').select('*').eq('id', profile.tenant_id).single(),
          supabase.from('user_profiles').select('*').eq('tenant_id', profile.tenant_id).order('created_at', { ascending: true }),
          supabase.from('sso_configs').select('*').eq('tenant_id', profile.tenant_id),
        ]);

        if (tenantRes.data) {
          setTenant(tenantRes.data);
          setOrgName(tenantRes.data.name);
          setOrgSlug(tenantRes.data.slug);
        }
        setUsers(usersRes.data ?? []);
        if (ssoRes.data && ssoRes.data.length > 0) {
          setSsoConfigs(ssoRes.data as SsoConfig[]);
          setSsoEnabled(ssoRes.data.some((c: SsoConfig) => c.is_enabled));
        }

        // Load feature config
        const featRes = await fetch('/api/workspace/features');
        if (featRes.ok) {
          const cfg = await featRes.json() as TenantFeatureConfig;
          setFeatureConfig(cfg);
          if (cfg.branding.primaryColor) setPrimaryColor(cfg.branding.primaryColor);
          if (cfg.branding.accentColor) setAccentColor(cfg.branding.accentColor);
          if (cfg.branding.appName) setAppName(cfg.branding.appName);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveOrg() {
    if (!tenant) return;
    setSaving(true);
    await supabase.from('tenants').update({ name: orgName.trim(), slug: orgSlug.trim() }).eq('id', tenant.id);
    setTenant((prev) => prev ? { ...prev, name: orgName, slug: orgSlug } : prev);
    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 2500);
  }

  async function saveFeatureConfig() {
    if (!featureConfig) return;
    setFeatureSaving(true);
    try {
      await fetch('/api/workspace/features', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(featureConfig),
      });
      setFeatureSaved(true);
      setTimeout(() => setFeatureSaved(false), 2500);
    } finally {
      setFeatureSaving(false);
    }
  }

  function applyMaturityPreset(tier: MaturityTier) {
    const base = getDefaultConfig(tenant?.plan ?? 'starter');
    const preset = MATURITY_DEFAULTS[tier];
    setFeatureConfig((prev) => mergeFeatureConfig(prev ?? base, { maturity: tier, nav: preset.nav, features: preset.features }));
  }

  function toggleNavFlag(flag: keyof NavFlags) {
    setFeatureConfig((prev) => {
      if (!prev) return prev;
      return { ...prev, nav: { ...prev.nav, [flag]: !prev.nav[flag] } };
    });
  }

  function toggleFeatureFlag(flag: keyof FeatureToggles) {
    setFeatureConfig((prev) => {
      if (!prev) return prev;
      return { ...prev, features: { ...prev.features, [flag]: !prev.features[flag] } };
    });
  }

  async function saveBranding() {
    if (!featureConfig) return;
    setLogoUploading(true);
    try {
      const updated: TenantFeatureConfig = {
        ...featureConfig,
        branding: {
          ...featureConfig.branding,
          primaryColor: primaryColor || null,
          accentColor: accentColor || null,
          appName: appName.trim() || null,
        },
      };
      await fetch('/api/workspace/features', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branding: updated.branding }),
      });
      setFeatureConfig(updated);
      // Apply colors immediately
      document.documentElement.style.setProperty('--color-accent', primaryColor);
      document.documentElement.style.setProperty('--color-ai', accentColor);
      setBrandSaved(true);
      setTimeout(() => setBrandSaved(false), 2500);
    } finally {
      setLogoUploading(false);
    }
  }

  async function handleLogoUpload(e: { target: { files: FileList | null } }) {
    const file = e.target.files?.[0];
    if (!file || !tenantId) return;
    setLogoUploading(true);
    try {
      const ext = file.name.split('.').pop() ?? 'png';
      const path = `logos/${tenantId}/logo.${ext}`;
      const { error } = await supabase.storage.from('branding').upload(path, file, { upsert: true });
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('branding').getPublicUrl(path);
        await fetch('/api/workspace/features', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ branding: { ...featureConfig?.branding, logoUrl: publicUrl } }),
        });
        setFeatureConfig((prev) => prev ? { ...prev, branding: { ...prev.branding, logoUrl: publicUrl } } : prev);
      }
    } finally {
      setLogoUploading(false);
    }
  }

  async function saveSsoConfig() {
    if (!tenantId) return;
    setSsoSaving(true);
    const isSaml = ['saml', 'microsoft_entra', 'okta'].includes(activeSsoProvider);
    const config = isSaml
      ? { entity_id: ssoForm.entityId, sso_url: ssoForm.ssoUrl, certificate: ssoForm.certificate }
      : { client_id: ssoForm.clientId, issuer_url: ssoForm.issuerUrl };
    const { data, error } = await supabase.from('sso_configs').upsert({
      tenant_id: tenantId,
      provider_type: activeSsoProvider,
      display_name: ssoForm.displayName || activeSsoProvider.replace(/_/g, ' '),
      is_enabled: true,
      config,
    }, { onConflict: 'tenant_id,provider_type' }).select();
    if (!error && data) {
      setSsoConfigs((prev) => [...prev.filter((c) => c.provider_type !== activeSsoProvider), data[0] as SsoConfig]);
      setSsoEnabled(true);
    }
    setSsoSaving(false);
  }

  async function testSsoConfig(configId: string) {
    setSsoTesting(configId);
    await new Promise((r) => setTimeout(r, 1500));
    setSsoTesting(null);
  }

  async function toggleSsoConfig(configId: string, enabled: boolean) {
    await supabase.from('sso_configs').update({ is_enabled: enabled }).eq('id', configId);
    setSsoConfigs((prev) => prev.map((c) => c.id === configId ? { ...c, is_enabled: enabled } : c));
  }

  async function updateUserRole(userId: string, role: string) {
    await supabase.from('user_profiles').update({ role: role as DbUserProfile['role'] }).eq('id', userId);
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: role as DbUserProfile['role'] } : u));
  }

  const ROLE_LABEL: Record<string, string> = { platform_admin: 'Platform Admin', tenant_admin: 'Admin', mission_creator: 'Creator', analyst: 'Analyst', participant: 'Participant' };
  const ROLE_COLOR: Record<string, string> = {
    platform_admin:  t.error,
    tenant_admin:    t.ai,
    mission_creator: t.warning,
    analyst:         t.accent,
    participant:     t.txtDim,
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-6 gap-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-9 rounded-xl" />)}
        </div>
        <Skeleton className="h-[400px] rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: `${t.txtDim}1A`, border: `1px solid ${t.txtDim}33` }}>
          <Settings size={18} strokeWidth={1.8} style={{ color: t.txtDim }} />
        </div>
        <div>
          <h1 className="text-[22px] font-bold" style={{ color: t.txt }}>Organization Settings</h1>
          <p className="text-[12px]" style={{ color: t.txtFaint }}>{tenant?.name} · {tenant?.plan} plan</p>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex items-center gap-1 rounded-xl p-1 overflow-x-auto"
        style={{ background: t.card, border: `1px solid ${t.panel}` }}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-semibold whitespace-nowrap transition-all"
            style={{
              background: activeTab === id ? t.panel : 'transparent',
              color: activeTab === id ? t.txt : t.txtFaint,
            }}
          >
            <Icon size={13} strokeWidth={activeTab === id ? 2.2 : 1.8} />
            {label}
          </button>
        ))}
      </div>

      {/* Organization */}
      {activeTab === 'organization' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="rounded-2xl p-6 space-y-5" style={{ background: t.card, border: `1px solid ${t.panel}` }}>
            <p className="text-[13px] font-bold" style={{ color: t.txt }}>Organization Profile</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: t.txtFaint }}>Organization Name</label>
                <input value={orgName} onChange={(e: { target: { value: string } }) => setOrgName(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl text-[13px] focus:outline-none"
                  style={{ background: t.surface, border: `1px solid ${t.panel}`, color: t.txt }} />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: t.txtFaint }}>Workspace Slug</label>
                <input value={orgSlug} onChange={(e: { target: { value: string } }) => setOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className="w-full h-9 px-3 rounded-xl text-[13px] focus:outline-none"
                  style={{ background: t.surface, border: `1px solid ${t.panel}`, color: t.txt }} />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: t.txtFaint }}>Plan</label>
              <div className="flex items-center gap-2">
                <span className="h-9 px-3 rounded-xl text-[13px] flex items-center capitalize"
                  style={{ background: t.surface, border: `1px solid ${t.panel}`, color: t.txtDim }}>{tenant?.plan}</span>
                <span className="text-[11px]" style={{ color: t.txtFaint }}>→ Upgrade in Billing</span>
              </div>
            </div>
            <div className="flex justify-end">
              <button onClick={saveOrg} disabled={saving}
                className="flex items-center gap-2 h-9 px-4 bg-accent rounded-xl font-semibold text-[13px] disabled:opacity-50"
                style={{ color: '#060a0e' }}>
                {saved ? <><Check size={14} strokeWidth={2.5} />Saved</> : <><Save size={13} strokeWidth={2} />{saving ? 'Saving…' : 'Save Changes'}</>}
              </button>
            </div>
          </div>
          <div className="rounded-2xl p-5" style={{ background: t.card, border: `1px solid ${t.error}33` }}>
            <p className="text-[13px] font-bold mb-2" style={{ color: t.error }}>Danger Zone</p>
            <p className="text-[12px] mb-3" style={{ color: t.txtFaint }}>Permanently delete your organization and all data. This cannot be undone.</p>
            <button className="flex items-center gap-2 h-8 px-3 rounded-xl text-[12px] font-semibold transition-colors"
              style={{ background: `${t.error}1A`, border: `1px solid ${t.error}33`, color: t.error }}>
              <Trash2 size={12} strokeWidth={2} />Delete Organization
            </button>
          </div>
        </motion.div>
      )}

      {/* Features & Adaptive UI */}
      {activeTab === 'features' && featureConfig && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
          {/* Maturity Tier */}
          <div className="rounded-2xl p-5 space-y-4" style={{ background: t.card, border: `1px solid ${t.panel}` }}>
            <div>
              <p className="text-[13px] font-bold" style={{ color: t.txt }}>Workspace Maturity</p>
              <p className="text-[11px] mt-0.5" style={{ color: t.txtFaint }}>Controls which features and nav items are shown. Lower tiers hide advanced features to reduce complexity.</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {MATURITY_OPTIONS.map(({ value, label, desc, color }) => (
                <button
                  key={value}
                  onClick={() => applyMaturityPreset(value)}
                  className="text-left p-4 rounded-xl border transition-all"
                  style={featureConfig.maturity === value
                    ? { borderColor: color, color, background: `${color}14` }
                    : { borderColor: '#162440', background: t.surface }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={12} strokeWidth={2.5} style={{ color: featureConfig.maturity === value ? color : t.txtFaint }} />
                    <span className="text-[12px] font-bold" style={{ color: featureConfig.maturity === value ? color : t.txt }}>{label}</span>
                    {featureConfig.maturity === value && <Check size={11} className="ml-auto" strokeWidth={2.5} style={{ color }} />}
                  </div>
                  <p className="text-[10px] leading-relaxed" style={{ color: t.txtFaint }}>{desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Appearance */}
          <div className="rounded-2xl p-5" style={{ background: t.card, border: `1px solid ${t.panel}` }}>
            <p className="text-[13px] font-bold mb-4" style={{ color: t.txt }}>Appearance</p>
            <div className="flex items-center justify-between py-2" style={{ borderBottom: `1px solid ${t.panel}` }}>
              <div>
                <p className="text-[13px] font-medium" style={{ color: t.txt }}>Color Theme</p>
                <p className="text-[11px] mt-0.5" style={{ color: t.txtFaint }}>Switch between dark and light interface mode</p>
              </div>
              <ThemeToggle onChange={(th) => setFeatureConfig((prev) => prev ? { ...prev, theme: th } : prev)} />
            </div>
          </div>

          {/* Nav Visibility */}
          <div className="rounded-2xl p-5 space-y-3" style={{ background: t.card, border: `1px solid ${t.panel}` }}>
            <div>
              <p className="text-[13px] font-bold" style={{ color: t.txt }}>Navigation Visibility</p>
              <p className="text-[11px] mt-0.5" style={{ color: t.txtFaint }}>Show or hide sections in the sidebar. Core sections (Dashboard, Mission Control, Studio) are always visible.</p>
            </div>
            <div className="space-y-1">
              {(Object.keys(NAV_FEATURE_LABELS) as (keyof NavFlags)[]).map((flag) => {
                const on = featureConfig.nav[flag];
                return (
                  <div key={flag} className="flex items-center justify-between py-2" style={{ borderBottom: `1px solid ${t.panel}` }}>
                    <span className="text-[13px]" style={{ color: t.txt }}>{NAV_FEATURE_LABELS[flag]}</span>
                    <Toggle on={on} onToggle={() => toggleNavFlag(flag)} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Feature Toggles */}
          <div className="rounded-2xl p-5 space-y-3" style={{ background: t.card, border: `1px solid ${t.panel}` }}>
            <div>
              <p className="text-[13px] font-bold" style={{ color: t.txt }}>Feature Configuration</p>
              <p className="text-[11px] mt-0.5" style={{ color: t.txtFaint }}>Activate or deactivate platform capabilities. Features above your plan tier are locked.</p>
            </div>
            {(Object.keys(FEATURE_LABELS) as (keyof FeatureToggles)[]).map((flag) => {
              const { label, desc, tier } = FEATURE_LABELS[flag];
              const planOrder: MaturityTier[] = ['starter', 'growth', 'enterprise'];
              const currentPlan = (tenant?.plan ?? 'starter') as MaturityTier;
              const isLocked = planOrder.indexOf(tier) > planOrder.indexOf(currentPlan);
              const on = featureConfig.features[flag];
              return (
                <div key={flag} className={cn('flex items-center justify-between py-2.5', isLocked && 'opacity-50')}
                  style={{ borderBottom: `1px solid ${t.panel}` }}>
                  <div className="flex-1 mr-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium" style={{ color: t.txt }}>{label}</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border uppercase tracking-wide"
                        style={tier === 'enterprise'
                          ? { color: t.aiLight, background: `${t.ai}1A`, borderColor: `${t.ai}33` }
                          : { color: t.accent, background: `${t.accent}1A`, borderColor: `${t.accent}33` }
                        }>{tier}</span>
                      {isLocked && <Lock size={10} strokeWidth={2} style={{ color: t.txtFaint }} />}
                    </div>
                    <p className="text-[11px] mt-0.5" style={{ color: t.txtFaint }}>{desc}</p>
                  </div>
                  <Toggle on={on && !isLocked} onToggle={() => !isLocked && toggleFeatureFlag(flag)} />
                </div>
              );
            })}
          </div>

          <div className="flex justify-end">
            <button onClick={saveFeatureConfig} disabled={featureSaving}
              className="flex items-center gap-2 h-9 px-5 bg-accent rounded-xl font-semibold text-[13px] disabled:opacity-50"
              style={{ color: '#060a0e' }}>
              {featureSaved ? <><Check size={14} strokeWidth={2.5} />Saved</> : <>{featureSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} strokeWidth={2} />}{featureSaving ? 'Saving…' : 'Save Configuration'}</>}
            </button>
          </div>
        </motion.div>
      )}

      {/* Users & Roles */}
      {activeTab === 'users' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="rounded-2xl p-5" style={{ background: t.card, border: `1px solid ${t.panel}` }}>
            <p className="text-[13px] font-bold mb-4" style={{ color: t.txt }}>Invite Team Member</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: t.txtFaint }}>Email Address</label>
                <div className="relative">
                  <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2" strokeWidth={2} style={{ color: t.txtFaint }} />
                  <input value={inviteEmail} onChange={(e: { target: { value: string } }) => setInviteEmail(e.target.value)}
                    placeholder="colleague@company.com"
                    className="w-full h-9 pl-8 pr-3 rounded-xl text-[13px] focus:outline-none"
                    style={{ background: t.surface, border: `1px solid ${t.panel}`, color: t.txt }} />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: t.txtFaint }}>Role</label>
                <select value={inviteRole} onChange={(e: { target: { value: string } }) => setInviteRole(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl text-[13px] focus:outline-none"
                  style={{ background: t.surface, border: `1px solid ${t.panel}`, color: t.txt }}>
                  {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            </div>
            <button className="mt-3 flex items-center gap-2 h-8 px-4 rounded-xl text-[12px] font-semibold hover:bg-accent/15 transition-colors bg-accent/10 border border-accent/20 text-accent">
              <UserPlus size={12} strokeWidth={2.5} />Send Invitation
            </button>
          </div>
          <div className="rounded-2xl overflow-hidden" style={{ background: t.card, border: `1px solid ${t.panel}` }}>
            <div className="grid px-5 py-3" style={{ gridTemplateColumns: '2fr 1fr 1fr 80px', background: t.surface, borderBottom: `1px solid ${t.panel}` }}>
              {['Member', 'Role', 'Status', 'Actions'].map((h) => (
                <p key={h} className="text-[10px] font-bold uppercase tracking-wider" style={{ color: t.txtFaint }}>{h}</p>
              ))}
            </div>
            <div className="divide-y" style={{ borderColor: t.panel }}>
              {users.map((u) => {
                const ini = (u.display_name ?? 'U').slice(0, 2).toUpperCase();
                return (
                  <div key={u.id} className="grid px-5 py-3.5 items-center" style={{ gridTemplateColumns: '2fr 1fr 1fr 80px' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                        style={{ background: `linear-gradient(135deg, ${t.ai}, ${t.accent})`, color: '#060a0e' }}>
                        {ini}
                      </div>
                      <div>
                        <p className="text-[13px] font-medium" style={{ color: t.txt }}>{u.display_name ?? 'Anonymous'}</p>
                        <p className="text-[10px]" style={{ color: t.txtFaint }}>{u.id === currentUserId ? 'You' : 'Member'}</p>
                      </div>
                    </div>
                    <select value={u.role} onChange={(e: { target: { value: string } }) => updateUserRole(u.id, e.target.value)}
                      disabled={u.id === currentUserId}
                      className="h-7 px-2 rounded-lg text-[11px] font-bold bg-transparent border border-transparent focus:outline-none transition-colors capitalize"
                      style={{ color: ROLE_COLOR[u.role] ?? t.txtDim }}>
                      {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full w-fit capitalize"
                      style={{
                        color: u.subscription_tier === 'pro' ? t.accent : t.txtFaint,
                        background: u.subscription_tier === 'pro' ? `${t.accent}1A` : `${t.txtFaint}1A`,
                      }}>{u.subscription_tier}</span>
                    <button disabled={u.id === currentUserId} className="transition-colors p-1 disabled:opacity-30"
                      style={{ color: t.txtFaint }}
                      onMouseEnter={e => (e.currentTarget.style.color = t.error)}
                      onMouseLeave={e => (e.currentTarget.style.color = t.txtFaint)}>
                      <Trash2 size={13} strokeWidth={1.8} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* Security */}
      {activeTab === 'security' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="rounded-2xl p-5 flex items-center justify-between" style={{ background: t.card, border: `1px solid ${t.panel}` }}>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <ShieldCheck size={14} strokeWidth={2} style={{ color: t.accent }} />
                <p className="text-[13px] font-bold" style={{ color: t.txt }}>Multi-Factor Authentication</p>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: `${t.accent}1A`, border: `1px solid ${t.accent}33`, color: t.accent }}>Recommended</span>
              </div>
              <p className="text-[12px]" style={{ color: t.txtFaint }}>Require MFA for all workspace members on next login.</p>
            </div>
            <button onClick={() => setMfaEnabled(!mfaEnabled)}
              className="relative w-10 h-6 rounded-full transition-all flex-shrink-0"
              style={{ background: mfaEnabled ? t.accent : t.panel, border: mfaEnabled ? 'none' : `1px solid #162440` }}>
              <span className="absolute top-1 w-4 h-4 rounded-full transition-all" style={{
                right: mfaEnabled ? '0.25rem' : undefined,
                left: mfaEnabled ? undefined : '0.25rem',
                background: mfaEnabled ? '#060a0e' : t.txtFaint,
              }} />
            </button>
          </div>
          <div className="rounded-2xl overflow-hidden" style={{ background: t.card, border: `1px solid ${t.panel}` }}>
            <div className="p-5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <Key size={14} strokeWidth={2} style={{ color: t.ai }} />
                  <p className="text-[13px] font-bold" style={{ color: t.txt }}>Single Sign-On (SSO)</p>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: `${t.ai}1A`, border: `1px solid ${t.ai}33`, color: t.aiLight }}>Enterprise</span>
                </div>
                <p className="text-[12px]" style={{ color: t.txtFaint }}>Configure SAML 2.0 or OIDC for your identity provider.</p>
              </div>
              <button onClick={() => setSsoEnabled(!ssoEnabled)}
                className="relative w-10 h-6 rounded-full transition-all flex-shrink-0"
                style={{ background: ssoEnabled ? t.ai : t.panel, border: ssoEnabled ? 'none' : `1px solid #162440` }}>
                <span className="absolute top-1 w-4 h-4 rounded-full transition-all" style={{
                  right: ssoEnabled ? '0.25rem' : undefined,
                  left: ssoEnabled ? undefined : '0.25rem',
                  background: ssoEnabled ? 'white' : t.txtFaint,
                }} />
              </button>
            </div>
            {ssoEnabled && (
              <div className="p-5 space-y-5" style={{ borderTop: `1px solid ${t.panel}` }}>
                {ssoConfigs.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: t.txtFaint }}>Configured Providers</p>
                    {ssoConfigs.map((cfg) => {
                      const meta = SSO_PROVIDERS.find((p) => p.id === cfg.provider_type);
                      return (
                        <div key={cfg.id} className="flex items-center justify-between p-3 rounded-xl"
                          style={{ background: t.surface, border: '1px solid rgba(255,255,255,0.06)' }}>
                          <div className="flex items-center gap-3">
                            <span className="text-base">{meta?.icon ?? '🔒'}</span>
                            <div>
                              <p className="text-[13px] font-semibold" style={{ color: t.txt }}>{cfg.display_name}</p>
                              <p className="text-[10px]" style={{ color: t.txtFaint }}>
                                {cfg.login_count} logins · {cfg.last_tested_at ? `Tested ${new Date(cfg.last_tested_at).toLocaleDateString()}` : 'Not tested'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => testSsoConfig(cfg.id)} disabled={ssoTesting === cfg.id}
                              className="flex items-center gap-1.5 h-7 px-3 rounded-lg text-[11px] font-semibold"
                              style={{ background: `${t.ai}1A`, color: t.ai, border: `1px solid ${t.ai}33` }}>
                              {ssoTesting === cfg.id ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} strokeWidth={2} />}
                              Test
                            </button>
                            <button onClick={() => toggleSsoConfig(cfg.id, !cfg.is_enabled)}
                              className="relative w-8 h-5 rounded-full transition-all"
                              style={{ background: cfg.is_enabled ? t.ai : t.panel, border: cfg.is_enabled ? 'none' : `1px solid #162440` }}>
                              <span className="absolute top-0.5 w-3.5 h-3.5 rounded-full transition-all" style={{
                                right: cfg.is_enabled ? '0.125rem' : undefined,
                                left: cfg.is_enabled ? undefined : '0.125rem',
                                background: cfg.is_enabled ? 'white' : t.txtFaint,
                              }} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="space-y-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: t.txtFaint }}>Add Identity Provider</p>
                  <div className="grid grid-cols-5 gap-2">
                    {SSO_PROVIDERS.map((p) => (
                      <button key={p.id} onClick={() => setActiveSsoProvider(p.id)}
                        className="flex flex-col items-center gap-1.5 p-3 rounded-xl text-center transition-all border"
                        style={activeSsoProvider === p.id
                          ? { background: `${t.ai}1A`, borderColor: `${t.ai}4D` }
                          : { background: t.surface, borderColor: 'rgba(255,255,255,0.06)' }}>
                        <span className="text-xl">{p.icon}</span>
                        <span className="text-[10px] font-semibold leading-tight"
                          style={{ color: activeSsoProvider === p.id ? t.aiLight : t.txtDim }}>
                          {p.label}
                        </span>
                      </button>
                    ))}
                  </div>
                  {['saml', 'microsoft_entra', 'okta'].includes(activeSsoProvider) ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: t.txtFaint }}>Display Name</label>
                        <input value={ssoForm.displayName} onChange={(e: { target: { value: string } }) => setSsoForm((f) => ({ ...f, displayName: e.target.value }))}
                          placeholder="e.g. Acme Corp Entra ID"
                          className="w-full h-9 px-3 rounded-xl text-[13px] focus:outline-none"
                          style={{ background: t.surface, border: `1px solid ${t.panel}`, color: t.txt }} />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: t.txtFaint }}>Entity ID / Issuer</label>
                        <input value={ssoForm.entityId} onChange={(e: { target: { value: string } }) => setSsoForm((f) => ({ ...f, entityId: e.target.value }))}
                          placeholder="https://sts.windows.net/..."
                          className="w-full h-9 px-3 rounded-xl text-[13px] focus:outline-none"
                          style={{ background: t.surface, border: `1px solid ${t.panel}`, color: t.txt }} />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: t.txtFaint }}>SSO URL</label>
                        <input value={ssoForm.ssoUrl} onChange={(e: { target: { value: string } }) => setSsoForm((f) => ({ ...f, ssoUrl: e.target.value }))}
                          placeholder="https://login.microsoftonline.com/..."
                          className="w-full h-9 px-3 rounded-xl text-[13px] focus:outline-none"
                          style={{ background: t.surface, border: `1px solid ${t.panel}`, color: t.txt }} />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: t.txtFaint }}>X.509 Certificate</label>
                        <textarea value={ssoForm.certificate} onChange={(e: { target: { value: string } }) => setSsoForm((f) => ({ ...f, certificate: e.target.value }))}
                          placeholder="-----BEGIN CERTIFICATE-----&#10;MII...&#10;-----END CERTIFICATE-----"
                          rows={3}
                          className="w-full px-3 py-2 rounded-xl text-[12px] font-mono focus:outline-none resize-none"
                          style={{ background: t.surface, border: `1px solid ${t.panel}`, color: t.txt }} />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: t.txtFaint }}>Display Name</label>
                        <input value={ssoForm.displayName} onChange={(e: { target: { value: string } }) => setSsoForm((f) => ({ ...f, displayName: e.target.value }))}
                          placeholder="e.g. Acme Google Workspace"
                          className="w-full h-9 px-3 rounded-xl text-[13px] focus:outline-none"
                          style={{ background: t.surface, border: `1px solid ${t.panel}`, color: t.txt }} />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: t.txtFaint }}>Client ID</label>
                        <input value={ssoForm.clientId} onChange={(e: { target: { value: string } }) => setSsoForm((f) => ({ ...f, clientId: e.target.value }))}
                          placeholder="your-app-client-id"
                          className="w-full h-9 px-3 rounded-xl text-[13px] focus:outline-none"
                          style={{ background: t.surface, border: `1px solid ${t.panel}`, color: t.txt }} />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: t.txtFaint }}>Issuer URL</label>
                        <input value={ssoForm.issuerUrl} onChange={(e: { target: { value: string } }) => setSsoForm((f) => ({ ...f, issuerUrl: e.target.value }))}
                          placeholder="https://accounts.google.com"
                          className="w-full h-9 px-3 rounded-xl text-[13px] focus:outline-none"
                          style={{ background: t.surface, border: `1px solid ${t.panel}`, color: t.txt }} />
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3 pt-1">
                    <button onClick={saveSsoConfig} disabled={ssoSaving}
                      className="flex items-center gap-2 h-9 px-4 rounded-xl text-[13px] font-semibold disabled:opacity-50"
                      style={{ background: `${t.ai}1F`, color: t.aiLight, border: `1px solid ${t.ai}40` }}>
                      {ssoSaving ? <Loader2 size={13} className="animate-spin" /> : <Server size={13} strokeWidth={2} />}
                      {ssoSaving ? 'Saving…' : 'Save Provider'}
                    </button>
                    <p className="text-[11px]" style={{ color: t.txtFaint }}>
                      ACS URL: <span className="font-mono" style={{ color: t.txtDim }}>{typeof window !== 'undefined' ? window.location.origin : ''}/api/auth/sso/callback</span>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="rounded-2xl p-5" style={{ background: t.card, border: `1px solid ${t.panel}` }}>
            <div className="flex items-center gap-2 mb-1">
              <Key size={14} strokeWidth={2} style={{ color: t.ai }} />
              <p className="text-[13px] font-bold" style={{ color: t.txt }}>Session Controls</p>
            </div>
            <p className="text-[12px] mb-3" style={{ color: t.txtFaint }}>Configure session timeout and maximum concurrent sessions.</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: t.txtFaint }}>Session Timeout</label>
                <select className="w-full h-9 px-3 rounded-xl text-[12px] focus:outline-none"
                  style={{ background: t.surface, border: `1px solid ${t.panel}`, color: t.txt }}>
                  <option>24 hours</option><option>8 hours</option><option>1 hour</option><option>30 minutes</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: t.txtFaint }}>Max Concurrent Sessions</label>
                <select className="w-full h-9 px-3 rounded-xl text-[12px] focus:outline-none"
                  style={{ background: t.surface, border: `1px solid ${t.panel}`, color: t.txt }}>
                  <option>Unlimited</option><option>5</option><option>3</option><option>1</option>
                </select>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Branding — White Label */}
      {activeTab === 'branding' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {featureConfig && !featureConfig.features.whiteLabel && (
            <div className="flex items-center gap-3 p-4 rounded-xl"
              style={{ background: `${t.ai}14`, border: `1px solid ${t.ai}33` }}>
              <Lock size={14} strokeWidth={2} style={{ color: t.aiLight }} />
              <div className="flex-1">
                <p className="text-[13px] font-semibold" style={{ color: t.aiLight }}>White Label requires Enterprise plan</p>
                <p className="text-[11px] mt-0.5" style={{ color: t.txtFaint }}>Upgrade to customise logo, colors and workspace name.</p>
              </div>
              <button className="text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors"
                style={{ color: t.aiLight, background: `${t.ai}1A`, border: `1px solid ${t.ai}33` }}>
                Upgrade →
              </button>
            </div>
          )}

          <div className={cn('rounded-2xl p-5 space-y-5', featureConfig && !featureConfig.features.whiteLabel && 'opacity-60 pointer-events-none')}
            style={{ background: t.card, border: `1px solid ${t.panel}` }}>
            <p className="text-[13px] font-bold" style={{ color: t.txt }}>White Label Branding</p>

            {/* Logo */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider mb-2 block" style={{ color: t.txtFaint }}>Workspace Logo</label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden"
                  style={{ background: t.surface, border: `2px dashed #162440` }}>
                  {featureConfig?.branding.logoUrl
                    ? <img src={featureConfig.branding.logoUrl} alt="" className="w-full h-full object-cover" />
                    : <Building2 size={20} strokeWidth={1.5} style={{ color: t.txtFaint }} />}
                </div>
                <div>
                  <input
                    type="file"
                    ref={logoInputRef}
                    accept="image/png,image/svg+xml,image/jpeg"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                  <button onClick={() => logoInputRef.current?.click()}
                    disabled={logoUploading}
                    className="flex items-center gap-2 h-8 px-3 rounded-xl text-[12px] font-semibold transition-colors mb-1 disabled:opacity-50"
                    style={{ background: t.surface, border: `1px solid ${t.panel}`, color: t.txtDim }}>
                    {logoUploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} strokeWidth={2} />}
                    {logoUploading ? 'Uploading…' : 'Upload Logo'}
                  </button>
                  <p className="text-[10px]" style={{ color: t.txtFaint }}>PNG, SVG or JPEG, max 2MB</p>
                </div>
              </div>
            </div>

            {/* App Name */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: t.txtFaint }}>Workspace Name</label>
              <input value={appName} onChange={(e: { target: { value: string } }) => setAppName(e.target.value)}
                placeholder="Your Brand Name"
                className="w-full h-9 px-3 rounded-xl text-[13px] focus:outline-none"
                style={{ background: t.surface, border: `1px solid ${t.panel}`, color: t.txt }} />
              <p className="text-[10px] mt-1" style={{ color: t.txtFaint }}>Replaces &quot;X-hunt&quot; in the sidebar header</p>
            </div>

            {/* Colors */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: t.txtFaint }}>Primary Color</label>
                <div className="flex items-center gap-2 h-9 px-3 rounded-xl"
                  style={{ background: t.surface, border: `1px solid ${t.panel}` }}>
                  <input type="color" value={primaryColor}
                    onChange={(e: { target: { value: string } }) => setPrimaryColor(e.target.value)}
                    className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent p-0" />
                  <span className="text-[13px] font-mono" style={{ color: t.txt }}>{primaryColor}</span>
                </div>
                <p className="text-[10px] mt-1" style={{ color: t.txtFaint }}>Used for buttons, active states and accents</p>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: t.txtFaint }}>Accent Color</label>
                <div className="flex items-center gap-2 h-9 px-3 rounded-xl"
                  style={{ background: t.surface, border: `1px solid ${t.panel}` }}>
                  <input type="color" value={accentColor}
                    onChange={(e: { target: { value: string } }) => setAccentColor(e.target.value)}
                    className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent p-0" />
                  <span className="text-[13px] font-mono" style={{ color: t.txt }}>{accentColor}</span>
                </div>
                <p className="text-[10px] mt-1" style={{ color: t.txtFaint }}>Used for AI indicators and secondary highlights</p>
              </div>
            </div>

            {/* Preview */}
            <div className="p-4 rounded-xl" style={{ background: t.surface, border: `1px solid ${t.panel}` }}>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: t.txtFaint }}>Preview</p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${primaryColor}25`, border: `1px solid ${primaryColor}40` }}>
                  <Building2 size={14} style={{ color: primaryColor }} strokeWidth={1.8} />
                </div>
                <div>
                  <p className="text-[13px] font-bold" style={{ color: t.txt }}>{appName || 'Your Brand'}</p>
                  <p className="text-[10px]" style={{ color: t.txtFaint }}>Mission Control</p>
                </div>
                <div className="ml-auto">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${primaryColor}18`, color: primaryColor, border: `1px solid ${primaryColor}30` }}>
                    Enterprise
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button onClick={saveBranding} disabled={logoUploading}
                className="flex items-center gap-2 h-9 px-5 bg-accent rounded-xl font-semibold text-[13px] disabled:opacity-50"
                style={{ color: '#060a0e', ...(featureConfig?.branding.primaryColor ? { backgroundColor: featureConfig.branding.primaryColor } : {}) }}>
                {brandSaved ? <><Check size={14} strokeWidth={2.5} />Applied</> : <><Save size={13} strokeWidth={2} />Save Branding</>}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Notifications */}
      {activeTab === 'notifications' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="rounded-2xl p-5 space-y-4" style={{ background: t.card, border: `1px solid ${t.panel}` }}>
            <p className="text-[13px] font-bold" style={{ color: t.txt }}>Notification Preferences</p>
            {[
              { label: 'Mission completions', desc: 'Get notified when participants complete missions' },
              { label: 'Outcome validations', desc: 'Notifications for pending validation reviews' },
              { label: 'AI Briefings',         desc: 'Daily intelligence briefings from Insight Analyst' },
              { label: 'Billing alerts',       desc: 'Usage limits and billing cycle notifications' },
              { label: 'Security events',      desc: 'Login attempts and suspicious activity' },
            ].map(({ label, desc }) => (
              <div key={label} className="flex items-center justify-between py-2" style={{ borderBottom: `1px solid ${t.panel}` }}>
                <div>
                  <p className="text-[13px] font-medium" style={{ color: t.txt }}>{label}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: t.txtFaint }}>{desc}</p>
                </div>
                <button className="relative w-9 h-5 rounded-full bg-accent">
                  <span className="absolute right-0.5 top-0.5 w-4 h-4 rounded-full" style={{ background: '#060a0e' }} />
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
