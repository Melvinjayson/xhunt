'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Settings, Building2, Users, Shield, Palette, Globe, Bell,
  Save, Check, AlertCircle, Lock, Key, Eye, EyeOff, ChevronRight,
  Trash2, Plus, UserPlus, Mail
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/cn';
import type { DbTenant, DbUserProfile } from '@/lib/supabase/types';

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('bg-[#0D1530] animate-pulse rounded-lg', className)} />;
}

const TABS = [
  { id: 'organization', label: 'Organization', icon: Building2 },
  { id: 'users',        label: 'Users & Roles', icon: Users     },
  { id: 'security',     label: 'Security',      icon: Shield    },
  { id: 'branding',     label: 'Branding',      icon: Palette   },
  { id: 'notifications',label: 'Notifications', icon: Bell      },
] as const;

type Tab = (typeof TABS)[number]['id'];

const ROLE_OPTIONS = [
  { value: 'tenant_admin',    label: 'Admin',    desc: 'Full workspace access' },
  { value: 'mission_creator', label: 'Creator',  desc: 'Create and manage missions' },
  { value: 'analyst',         label: 'Analyst',  desc: 'View analytics and reports' },
  { value: 'participant',     label: 'Participant', desc: 'Access and complete missions' },
];

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
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      const { data: profile } = await supabase.from('user_profiles').select('tenant_id').eq('id', user.id).single();
      if (!profile?.tenant_id) return;

      const [tenantRes, usersRes] = await Promise.all([
        supabase.from('tenants').select('*').eq('id', profile.tenant_id).single(),
        supabase.from('user_profiles').select('*').eq('tenant_id', profile.tenant_id).order('created_at', { ascending: true }),
      ]);

      if (tenantRes.data) {
        setTenant(tenantRes.data);
        setOrgName(tenantRes.data.name);
        setOrgSlug(tenantRes.data.slug);
      }
      setUsers(usersRes.data ?? []);
      setLoading(false);
    }
    load();
  }, [supabase]);

  async function saveOrg() {
    if (!tenant) return;
    setSaving(true);
    await supabase.from('tenants').update({ name: orgName.trim(), slug: orgSlug.trim() }).eq('id', tenant.id);
    setTenant((prev) => prev ? { ...prev, name: orgName, slug: orgSlug } : prev);
    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 2500);
  }

  async function updateUserRole(userId: string, role: string) {
    await supabase.from('user_profiles').update({ role: role as DbUserProfile['role'] }).eq('id', userId);
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: role as DbUserProfile['role'] } : u));
  }

  const ROLE_LABEL: Record<string, string> = { platform_admin: 'Platform Admin', tenant_admin: 'Admin', mission_creator: 'Creator', analyst: 'Analyst', participant: 'Participant' };
  const ROLE_COLOR: Record<string, string> = { platform_admin: 'text-[#FF5C7A]', tenant_admin: 'text-[#6D5DFD]', mission_creator: 'text-[#FFB84D]', analyst: 'text-[#22FFAA]', participant: 'text-[#8B9CC0]' };

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-9 rounded-xl" />)}
        </div>
        <Skeleton className="h-[400px] rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#8B9CC0]/10 border border-[#8B9CC0]/20 flex items-center justify-center">
          <Settings size={18} className="text-[#8B9CC0]" strokeWidth={1.8} />
        </div>
        <div>
          <h1 className="text-[22px] font-bold text-[#F0F4FF]">Organization Settings</h1>
          <p className="text-[#4A5578] text-[12px]">{tenant?.name} · {tenant?.plan} plan</p>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex items-center gap-1 bg-[#0A1226] border border-[#0F1D35] rounded-xl p-1 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-semibold whitespace-nowrap transition-all',
              activeTab === id ? 'bg-[#0D1530] text-[#F0F4FF]' : 'text-[#4A5578] hover:text-[#8B9CC0]'
            )}
          >
            <Icon size={13} strokeWidth={activeTab === id ? 2.2 : 1.8} />
            {label}
          </button>
        ))}
      </div>

      {/* Organization */}
      {activeTab === 'organization' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="bg-[#0A1226] border border-[#0F1D35] rounded-2xl p-6 space-y-5">
            <p className="text-[13px] font-bold text-[#F0F4FF]">Organization Profile</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-[#4A5578] uppercase tracking-wider mb-1.5 block">Organization Name</label>
                <input
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full h-9 px-3 bg-[#07101F] border border-[#0F1D35] rounded-xl text-[13px] text-[#F0F4FF] focus:outline-none focus:border-[#162440]"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#4A5578] uppercase tracking-wider mb-1.5 block">Workspace Slug</label>
                <input
                  value={orgSlug}
                  onChange={(e) => setOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className="w-full h-9 px-3 bg-[#07101F] border border-[#0F1D35] rounded-xl text-[13px] text-[#F0F4FF] focus:outline-none focus:border-[#162440]"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-[#4A5578] uppercase tracking-wider mb-1.5 block">Plan</label>
              <div className="flex items-center gap-2">
                <span className="h-9 px-3 bg-[#07101F] border border-[#0F1D35] rounded-xl text-[13px] text-[#8B9CC0] flex items-center capitalize">{tenant?.plan}</span>
                <span className="text-[11px] text-[#4A5578]">→ Upgrade in Billing</span>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={saveOrg}
                disabled={saving}
                className="flex items-center gap-2 h-9 px-4 bg-accent text-[#060a0e] rounded-xl font-semibold text-[13px] disabled:opacity-50"
              >
                {saved ? <><Check size={14} strokeWidth={2.5} />Saved</> : <><Save size={13} strokeWidth={2} />{saving ? 'Saving…' : 'Save Changes'}</>}
              </button>
            </div>
          </div>

          <div className="bg-[#0A1226] border border-[#FF5C7A]/20 rounded-2xl p-5">
            <p className="text-[13px] font-bold text-[#FF5C7A] mb-2">Danger Zone</p>
            <p className="text-[12px] text-[#4A5578] mb-3">Permanently delete your organization and all data. This cannot be undone.</p>
            <button className="flex items-center gap-2 h-8 px-3 bg-[#FF5C7A]/10 border border-[#FF5C7A]/20 text-[#FF5C7A] rounded-xl text-[12px] font-semibold hover:bg-[#FF5C7A]/15 transition-colors">
              <Trash2 size={12} strokeWidth={2} />Delete Organization
            </button>
          </div>
        </motion.div>
      )}

      {/* Users & Roles */}
      {activeTab === 'users' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {/* Invite */}
          <div className="bg-[#0A1226] border border-[#0F1D35] rounded-2xl p-5">
            <p className="text-[13px] font-bold text-[#F0F4FF] mb-4">Invite Team Member</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-[#4A5578] uppercase tracking-wider mb-1.5 block">Email Address</label>
                <div className="relative">
                  <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4A5578]" strokeWidth={2} />
                  <input
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@company.com"
                    className="w-full h-9 pl-8 pr-3 bg-[#07101F] border border-[#0F1D35] rounded-xl text-[13px] text-[#F0F4FF] placeholder:text-[#4A5578] focus:outline-none focus:border-[#162440]"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#4A5578] uppercase tracking-wider mb-1.5 block">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full h-9 px-3 bg-[#07101F] border border-[#0F1D35] rounded-xl text-[13px] text-[#F0F4FF] focus:outline-none"
                >
                  {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            </div>
            <button className="mt-3 flex items-center gap-2 h-8 px-4 bg-accent/10 border border-accent/20 text-accent rounded-xl text-[12px] font-semibold hover:bg-accent/15 transition-colors">
              <UserPlus size={12} strokeWidth={2.5} />Send Invitation
            </button>
          </div>

          {/* User List */}
          <div className="bg-[#0A1226] border border-[#0F1D35] rounded-2xl overflow-hidden">
            <div className="grid px-5 py-3 border-b border-[#0F1D35] bg-[#07101F]"
              style={{ gridTemplateColumns: '2fr 1fr 1fr 80px' }}>
              {['Member', 'Role', 'Status', 'Actions'].map((h) => (
                <p key={h} className="text-[10px] font-bold text-[#4A5578] uppercase tracking-wider">{h}</p>
              ))}
            </div>
            <div className="divide-y divide-[#0F1D35]">
              {users.map((u) => {
                const initials = (u.display_name ?? 'U').slice(0, 2).toUpperCase();
                return (
                  <div key={u.id} className="grid px-5 py-3.5 items-center" style={{ gridTemplateColumns: '2fr 1fr 1fr 80px' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6D5DFD] to-accent flex items-center justify-center text-[10px] font-bold text-[#060a0e] flex-shrink-0">
                        {initials}
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-[#F0F4FF]">{u.display_name ?? 'Anonymous'}</p>
                        <p className="text-[10px] text-[#4A5578]">{u.id === currentUserId ? 'You' : 'Member'}</p>
                      </div>
                    </div>
                    <select
                      value={u.role}
                      onChange={(e) => updateUserRole(u.id, e.target.value)}
                      disabled={u.id === currentUserId}
                      className={cn(
                        'h-7 px-2 rounded-lg text-[11px] font-bold bg-transparent border border-transparent hover:border-[#162440] focus:outline-none transition-colors capitalize',
                        ROLE_COLOR[u.role] ?? 'text-[#8B9CC0]'
                      )}
                    >
                      {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                    <span className={cn(
                      'text-[10px] font-bold px-2 py-0.5 rounded-full w-fit capitalize',
                      u.subscription_tier === 'pro' ? 'text-[#22FFAA] bg-[#22FFAA]/10' : 'text-[#4A5578] bg-[#4A5578]/10'
                    )}>{u.subscription_tier}</span>
                    <button disabled={u.id === currentUserId} className="text-[#4A5578] hover:text-[#FF5C7A] disabled:opacity-30 transition-colors p-1">
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
          {[
            { key: 'mfa', label: 'Multi-Factor Authentication', desc: 'Require MFA for all workspace members.', state: mfaEnabled, set: setMfaEnabled, badge: 'Recommended' },
            { key: 'sso', label: 'Single Sign-On (SSO)', desc: 'Configure SAML/OIDC SSO for your organization.', state: ssoEnabled, set: setSsoEnabled, badge: 'Enterprise' },
          ].map(({ key, label, desc, state, set, badge }) => (
            <div key={key} className="bg-[#0A1226] border border-[#0F1D35] rounded-2xl p-5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-[13px] font-bold text-[#F0F4FF]">{label}</p>
                  <span className="text-[9px] font-bold px-2 py-0.5 bg-[#6D5DFD]/10 border border-[#6D5DFD]/20 text-[#A99FFE] rounded-full">{badge}</span>
                </div>
                <p className="text-[12px] text-[#4A5578]">{desc}</p>
              </div>
              <button
                onClick={() => set(!state)}
                className={cn(
                  'relative w-10 h-6 rounded-full transition-all flex-shrink-0',
                  state ? 'bg-accent' : 'bg-[#0D1530] border border-[#162440]'
                )}
              >
                <span className={cn(
                  'absolute top-1 w-4 h-4 rounded-full transition-all',
                  state ? 'right-1 bg-[#060a0e]' : 'left-1 bg-[#4A5578]'
                )} />
              </button>
            </div>
          ))}

          <div className="bg-[#0A1226] border border-[#0F1D35] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-1">
              <Key size={14} className="text-[#6D5DFD]" strokeWidth={2} />
              <p className="text-[13px] font-bold text-[#F0F4FF]">Session Controls</p>
            </div>
            <p className="text-[12px] text-[#4A5578] mb-3">Configure session timeout and maximum concurrent sessions.</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-[#4A5578] uppercase tracking-wider mb-1.5 block">Session Timeout</label>
                <select className="w-full h-9 px-3 bg-[#07101F] border border-[#0F1D35] rounded-xl text-[12px] text-[#F0F4FF] focus:outline-none">
                  <option>24 hours</option>
                  <option>8 hours</option>
                  <option>1 hour</option>
                  <option>30 minutes</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#4A5578] uppercase tracking-wider mb-1.5 block">Max Concurrent Sessions</label>
                <select className="w-full h-9 px-3 bg-[#07101F] border border-[#0F1D35] rounded-xl text-[12px] text-[#F0F4FF] focus:outline-none">
                  <option>Unlimited</option>
                  <option>5</option>
                  <option>3</option>
                  <option>1</option>
                </select>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Branding */}
      {activeTab === 'branding' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="bg-[#0A1226] border border-[#0F1D35] rounded-2xl p-5 space-y-5">
            <p className="text-[13px] font-bold text-[#F0F4FF]">Workspace Branding</p>
            <div>
              <label className="text-[10px] font-bold text-[#4A5578] uppercase tracking-wider mb-2 block">Logo</label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-[#07101F] border-2 border-dashed border-[#162440] flex items-center justify-center">
                  <Building2 size={20} className="text-[#4A5578]" strokeWidth={1.5} />
                </div>
                <div>
                  <button className="flex items-center gap-2 h-8 px-3 bg-[#07101F] border border-[#0F1D35] rounded-xl text-[12px] font-semibold text-[#8B9CC0] hover:text-[#F0F4FF] hover:border-[#162440] transition-colors mb-1">
                    Upload Logo
                  </button>
                  <p className="text-[10px] text-[#4A5578]">PNG or SVG, max 2MB</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Primary Color', value: '#22FFAA' },
                { label: 'Accent Color',  value: '#6D5DFD' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <label className="text-[10px] font-bold text-[#4A5578] uppercase tracking-wider mb-1.5 block">{label}</label>
                  <div className="flex items-center gap-2 h-9 px-3 bg-[#07101F] border border-[#0F1D35] rounded-xl">
                    <div className="w-5 h-5 rounded-md flex-shrink-0" style={{ backgroundColor: value }} />
                    <span className="text-[13px] font-mono text-[#F0F4FF]">{value}</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-[#4A5578]">Custom branding is available on Growth and Enterprise plans.</p>
          </div>
        </motion.div>
      )}

      {/* Notifications */}
      {activeTab === 'notifications' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="bg-[#0A1226] border border-[#0F1D35] rounded-2xl p-5 space-y-4">
            <p className="text-[13px] font-bold text-[#F0F4FF]">Notification Preferences</p>
            {[
              { label: 'Mission completions', desc: 'Get notified when participants complete missions' },
              { label: 'Outcome validations', desc: 'Notifications for pending validation reviews' },
              { label: 'AI Briefings',         desc: 'Daily intelligence briefings from Insight Analyst' },
              { label: 'Billing alerts',       desc: 'Usage limits and billing cycle notifications' },
              { label: 'Security events',      desc: 'Login attempts and suspicious activity' },
            ].map(({ label, desc }, i) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-[#0F1D35] last:border-0">
                <div>
                  <p className="text-[13px] font-medium text-[#F0F4FF]">{label}</p>
                  <p className="text-[11px] text-[#4A5578] mt-0.5">{desc}</p>
                </div>
                <button className="relative w-9 h-5 rounded-full bg-accent">
                  <span className="absolute right-0.5 top-0.5 w-4 h-4 rounded-full bg-[#060a0e]" />
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
