'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/context';
import { motion } from 'framer-motion';
import {
  UserSquare2, Plus, Search, Users, Tag, Filter, ChevronRight,
  MoreHorizontal, Edit2, Trash2, Check, AlertCircle, Activity,
  Target, TrendingUp, Shield
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/cn';
import { t } from '@/theme/colors';
import type { DbAudienceSegment, DbUserProfile } from '@/lib/supabase/types';

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg', className)} style={{ background: t.panel }} />;
}

const ROLE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  platform_admin:  { label: 'Platform Admin', color: t.error,   bg: `${t.error}1A`   },
  tenant_admin:    { label: 'Admin',          color: t.ai,      bg: `${t.ai}1A`      },
  mission_creator: { label: 'Creator',        color: t.warning, bg: `${t.warning}1A` },
  analyst:         { label: 'Analyst',        color: t.accent,  bg: `${t.accent}1A`  },
  participant:     { label: 'Participant',    color: t.txtDim,  bg: `${t.txtDim}1A`  },
};

export default function AudiencePage() {
  const [segments, setSegments] = useState<DbAudienceSegment[]>([]);
  const [users, setUsers] = useState<DbUserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'segments' | 'users'>('segments');
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const { user, isLoaded } = useAuth();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      if (!isLoaded || !user) return;
      const { data: profile } = await supabase.from('user_profiles').select('tenant_id').eq('id', user.id).single();
      if (!profile?.tenant_id) { setLoading(false); return; }
      setTenantId(profile.tenant_id);

      const [segmentsRes, usersRes] = await Promise.all([
        supabase.from('audience_segments').select('*').eq('tenant_id', profile.tenant_id).order('created_at', { ascending: false }),
        supabase.from('user_profiles').select('*').eq('tenant_id', profile.tenant_id).order('created_at', { ascending: false }).limit(50),
      ]);

      setSegments(segmentsRes.data ?? []);
      setUsers(usersRes.data ?? []);
      setLoading(false);
    }
    load();
  }, [supabase, user, isLoaded]);

  async function createSegment() {
    if (!newName.trim() || !tenantId) return;
    setSaving(true);
    const { data } = await supabase.from('audience_segments').insert({
      tenant_id: tenantId,
      name: newName.trim(),
      description: newDesc.trim() || null,
      filters: {},
      created_by: user?.id ?? null,
    }).select('*').single();
    if (data) setSegments((prev) => [data, ...prev]);
    setNewName('');
    setNewDesc('');
    setCreating(false);
    setSaving(false);
  }

  const filteredSegments = segments.filter((s) =>
    !search || s.name.toLowerCase().includes(search.toLowerCase())
  );
  const filteredUsers = users.filter((u) =>
    !search || (u.display_name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const roleCounts: Record<string, number> = {};
  users.forEach((u) => { roleCounts[u.role] = (roleCounts[u.role] ?? 0) + 1; });

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-8 w-56" />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
        </div>
        <Skeleton className="h-[400px] rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: `${t.ai}1A`, border: `1px solid ${t.ai}33` }}>
            <UserSquare2 size={18} strokeWidth={1.8} style={{ color: t.ai }} />
          </div>
          <div>
            <h1 className="text-[22px] font-bold" style={{ color: t.txt }}>Audience Center</h1>
            <p className="text-[12px]" style={{ color: t.txtFaint }}>{users.length} participants · {segments.length} segments</p>
          </div>
        </div>
        <button
          onClick={() => setCreating(!creating)}
          className="flex items-center gap-2 h-9 px-4 bg-accent rounded-xl font-semibold text-[13px] shadow-[0_4px_16px_rgba(34,255,170,0.25)]"
          style={{ color: '#060a0e' }}
        >
          <Plus size={14} strokeWidth={2.5} />
          New Segment
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-3">
        {Object.entries(ROLE_LABELS).map(([role, cfg]) => (
          <div key={role} className="rounded-xl p-4 flex items-center gap-3"
            style={{ background: t.card, border: `1px solid ${t.panel}` }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: cfg.bg }}>
              <Shield size={14} strokeWidth={1.8} style={{ color: cfg.color }} />
            </div>
            <div>
              <p className="text-[20px] font-bold tabular-nums" style={{ color: cfg.color }}>{roleCounts[role] ?? 0}</p>
              <p className="text-[10px] font-medium" style={{ color: t.txtFaint }}>{cfg.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Create Segment */}
      {creating && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 border border-accent/20"
          style={{ background: t.card }}
        >
          <p className="text-[13px] font-bold mb-4" style={{ color: t.txt }}>Create Audience Segment</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: t.txtFaint }}>Segment Name *</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Power Users"
                className="w-full h-9 px-3 rounded-xl text-[13px] focus:outline-none"
                style={{ background: t.surface, border: `1px solid ${t.panel}`, color: t.txt }}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: t.txtFaint }}>Description</label>
              <input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Optional description"
                className="w-full h-9 px-3 rounded-xl text-[13px] focus:outline-none"
                style={{ background: t.surface, border: `1px solid ${t.panel}`, color: t.txt }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={createSegment} disabled={saving || !newName.trim()} className="flex items-center gap-2 h-8 px-4 bg-accent rounded-xl text-[12px] font-semibold disabled:opacity-50" style={{ color: '#060a0e' }}>
              <Check size={12} strokeWidth={2.5} />{saving ? 'Creating…' : 'Create Segment'}
            </button>
            <button onClick={() => setCreating(false)} className="h-8 px-3 rounded-xl text-[12px]" style={{ background: t.surface, border: `1px solid ${t.panel}`, color: t.txtDim }}>Cancel</button>
          </div>
        </motion.div>
      )}

      {/* Tabs + Search */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 rounded-xl p-1" style={{ background: t.card, border: `1px solid ${t.panel}` }}>
          {([['segments', 'Segments'], ['users', 'Users']] as const).map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="h-7 px-4 rounded-lg text-[12px] font-semibold transition-all"
              style={{
                background: activeTab === tab ? t.panel : 'transparent',
                color: activeTab === tab ? t.txt : t.txtFaint,
              }}
            >{label} <span className="ml-1 text-[10px]" style={{ color: activeTab === tab ? undefined : t.txtFaint }}
              >{tab === 'segments' ? segments.length : users.length}</span>
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" strokeWidth={2} style={{ color: t.txtFaint }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={activeTab === 'segments' ? 'Search segments…' : 'Search users…'}
            className="w-64 h-9 pl-8 pr-3 rounded-xl text-[13px] focus:outline-none"
            style={{ background: t.card, border: `1px solid ${t.panel}`, color: t.txt }}
          />
        </div>
      </div>

      {/* Content */}
      {activeTab === 'segments' ? (
        <div className="grid grid-cols-3 gap-4">
          {filteredSegments.length === 0 ? (
            <div className="col-span-3 rounded-2xl py-16 text-center" style={{ background: t.card, border: `1px solid ${t.panel}` }}>
              <UserSquare2 size={28} className="mx-auto mb-2" strokeWidth={1.5} style={{ color: t.txtFaint }} />
              <p className="font-medium" style={{ color: t.txtDim }}>No segments yet</p>
              <p className="text-sm mt-1" style={{ color: t.txtFaint }}>Create audience segments to target specific user groups.</p>
            </div>
          ) : (
            filteredSegments.map((seg, i) => (
              <motion.div
                key={seg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl p-5 transition-colors"
                style={{ background: t.card, border: `1px solid ${t.panel}` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: `${t.ai}1A`, border: `1px solid ${t.ai}26` }}>
                    <Users size={16} strokeWidth={1.8} style={{ color: t.ai }} />
                  </div>
                </div>
                <h3 className="text-[14px] font-bold mb-1" style={{ color: t.txt }}>{seg.name}</h3>
                {seg.description && <p className="text-[12px] mb-3" style={{ color: t.txtFaint }}>{seg.description}</p>}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {Object.entries(seg.filters ?? {}).slice(0, 3).map(([k, v]) => (
                    <span key={k} className="text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize"
                      style={{ background: `${t.ai}1A`, border: `1px solid ${t.ai}33`, color: t.aiLight }}>
                      {k}: {Array.isArray(v) ? v.join(', ') : String(v)}
                    </span>
                  ))}
                  {Object.keys(seg.filters ?? {}).length === 0 && (
                    <span className="text-[10px]" style={{ color: t.txtFaint }}>No filters defined</span>
                  )}
                </div>
                <div className="flex items-center justify-between pt-3" style={{ borderTop: `1px solid ${t.panel}` }}>
                  <p className="text-[10px]" style={{ color: t.txtFaint }}>
                    {new Date(seg.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                  <button className="text-[11px] font-semibold hover:text-accent transition-colors flex items-center gap-1" style={{ color: t.txtDim }}>
                    Configure <ChevronRight size={11} strokeWidth={2} />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background: t.card, border: `1px solid ${t.panel}` }}>
          {filteredUsers.length === 0 ? (
            <div className="py-16 text-center">
              <Users size={28} className="mx-auto mb-2" strokeWidth={1.5} style={{ color: t.txtFaint }} />
              <p className="font-medium" style={{ color: t.txtDim }}>No users found</p>
            </div>
          ) : (
            <>
              <div className="grid px-5 py-3 border-b"
                style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr', background: t.surface, borderColor: t.panel }}>
                {['User', 'Role', 'Tier', 'Joined'].map((h) => (
                  <p key={h} className="text-[10px] font-bold uppercase tracking-wider" style={{ color: t.txtFaint }}>{h}</p>
                ))}
              </div>
              <div className="divide-y" style={{ borderColor: t.panel }}>
                {filteredUsers.map((u) => {
                  const rc = ROLE_LABELS[u.role] ?? ROLE_LABELS.participant;
                  const initials = (u.display_name ?? 'U').slice(0, 2).toUpperCase();
                  return (
                    <div key={u.id} className="grid px-5 py-3.5 items-center transition-colors"
                      style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr' }}
                      onMouseEnter={e => (e.currentTarget.style.background = t.panel)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                          style={{ background: `linear-gradient(135deg, ${t.ai}, ${t.accent})`, color: '#060a0e' }}>
                          {initials}
                        </div>
                        <div>
                          <p className="text-[13px] font-medium" style={{ color: t.txt }}>{u.display_name ?? 'Anonymous'}</p>
                          <p className="text-[10px]" style={{ color: t.txtFaint }}>{u.interests?.slice(0, 2).join(', ') || '—'}</p>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full w-fit" style={{ color: rc.color, background: rc.bg }}>{rc.label}</span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full w-fit capitalize" style={{
                        color: u.subscription_tier === 'pro' ? t.accent : u.subscription_tier === 'trial' ? t.warning : t.txtFaint,
                        background: u.subscription_tier === 'pro' ? `${t.accent}1A` : u.subscription_tier === 'trial' ? `${t.warning}1A` : `${t.txtFaint}1A`,
                      }}>{u.subscription_tier}</span>
                      <p className="text-[11px]" style={{ color: t.txtFaint }}>
                        {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
