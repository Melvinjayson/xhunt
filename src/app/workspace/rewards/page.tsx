'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Gift, Plus, Award, Tag, Percent, Star, Key, Sparkles, BarChart3,
  Check, X, MoreHorizontal, TrendingUp, Users, ArrowUpRight, Zap,
  ChevronRight, RefreshCw, Store, Trash2
} from 'lucide-react';
import { t } from '@/theme/colors';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/cn';
import type { DbRewardConfig, DbRewardEvent } from '@/lib/supabase/types';

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('bg-[#0D1530] animate-pulse rounded-lg', className)} />;
}

const REWARD_TYPE_CONFIG = {
  points:     { label: 'Points',      icon: Star,     color: 'text-[#FFB84D]', bg: 'bg-[#FFB84D]/10' },
  badge:      { label: 'Badge',       icon: Award,    color: 'text-[#6D5DFD]', bg: 'bg-[#6D5DFD]/10' },
  coupon:     { label: 'Coupon',      icon: Percent,  color: 'text-[#22FFAA]', bg: 'bg-[#22FFAA]/8'  },
  experience: { label: 'Experience',  icon: Sparkles, color: 'text-[#FF5C7A]', bg: 'bg-[#FF5C7A]/10' },
  benefit:    { label: 'Benefit',     icon: Key,      color: 'text-[#8B9CC0]', bg: 'bg-[#8B9CC0]/10' },
};

export default function RewardsPage() {
  const [configs, setConfigs] = useState<DbRewardConfig[]>([]);
  const [events, setEvents] = useState<DbRewardEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<DbRewardConfig['type']>('points');
  const [newPoints, setNewPoints] = useState('100');
  const [saving, setSaving] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);

  // Marketplace Perks state
  const [perkListings, setPerkListings] = useState<{ id: string; title: string; description: string | null; ask_xp: number | null; status: string; created_at: string; expires_at: string | null }[]>([]);
  const [creatingPerk, setCreatingPerk] = useState(false);
  const [perkTitle, setPerkTitle] = useState('');
  const [perkDescription, setPerkDescription] = useState('');
  const [perkXpCost, setPerkXpCost] = useState('');
  const [perkExpiry, setPerkExpiry] = useState('30');
  const [savingPerk, setSavingPerk] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('user_profiles').select('tenant_id').eq('id', user.id).single();
      if (!profile?.tenant_id) return;
      setTenantId(profile.tenant_id);

      const [configsRes, eventsRes, perksRes] = await Promise.all([
        supabase.from('reward_configs').select('*').eq('tenant_id', profile.tenant_id).order('created_at', { ascending: false }),
        supabase.from('reward_events').select('*').eq('tenant_id', profile.tenant_id).order('issued_at', { ascending: false }).limit(30),
        supabase.from('barter_listings').select('id, title, description, ask_xp, status, created_at, expires_at').eq('listing_type', 'perk').eq('user_id', user.id).order('created_at', { ascending: false }),
      ]);
      setConfigs(configsRes.data ?? []);
      setEvents(eventsRes.data ?? []);
      setPerkListings((perksRes.data ?? []) as { id: string; title: string; description: string | null; ask_xp: number | null; status: string; created_at: string; expires_at: string | null }[]);
      setLoading(false);
    }
    load();
  }, [supabase]);

  async function toggleActive(id: string, is_active: boolean) {
    await supabase.from('reward_configs').update({ is_active: !is_active }).eq('id', id);
    setConfigs((prev) => prev.map((c) => c.id === id ? { ...c, is_active: !is_active } : c));
  }

  async function createReward() {
    if (!newName.trim() || !tenantId) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const value = newType === 'points' ? { points: parseInt(newPoints) || 100 } : {};
    const { data } = await supabase.from('reward_configs').insert({
      tenant_id: tenantId,
      name: newName.trim(),
      type: newType,
      value,
      is_active: true,
    }).select('*').single();
    if (data) setConfigs((prev) => [data, ...prev]);
    setNewName('');
    setNewPoints('100');
    setCreating(false);
    setSaving(false);
  }

  async function createPerk() {
    if (!perkTitle.trim()) return;
    setSavingPerk(true);
    const expiresAt = perkExpiry ? new Date(Date.now() + parseInt(perkExpiry) * 86400000).toISOString() : null;
    const res = await fetch('/api/barter/listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        listing_type: 'perk',
        title: perkTitle.trim(),
        description: perkDescription.trim() || null,
        offering: { type: 'benefit', label: perkTitle.trim() },
        ask_xp: parseInt(perkXpCost) > 0 ? parseInt(perkXpCost) : null,
        expires_at: expiresAt,
      }),
    });
    if (res.ok) {
      const d = await res.json() as { listing: { id: string; title: string; description: string | null; ask_xp: number | null; status: string; created_at: string; expires_at: string | null } };
      setPerkListings(prev => [d.listing, ...prev]);
      setPerkTitle('');
      setPerkDescription('');
      setPerkXpCost('');
      setPerkExpiry('30');
      setCreatingPerk(false);
    }
    setSavingPerk(false);
  }

  async function cancelPerk(id: string) {
    await fetch(`/api/barter/listings/${id}`, { method: 'DELETE' });
    setPerkListings(prev => prev.map(p => p.id === id ? { ...p, status: 'cancelled' } : p));
  }

  const totalIssued = events.length;
  const totalRedeemed = events.filter((e) => e.redeemed).length;
  const redemptionRate = totalIssued > 0 ? Math.round((totalRedeemed / totalIssued) * 100) : 0;
  const typeBreakdown: Record<string, number> = {};
  events.forEach((e) => { typeBreakdown[e.reward_type] = (typeBreakdown[e.reward_type] ?? 0) + 1; });

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-8 w-56" />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
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
          <div className="w-9 h-9 rounded-xl bg-[#FFB84D]/10 border border-[#FFB84D]/20 flex items-center justify-center">
            <Gift size={18} className="text-[#FFB84D]" strokeWidth={1.8} />
          </div>
          <div>
            <h1 className="text-[22px] font-bold text-[#F0F4FF]">Reward Center</h1>
            <p className="text-[#4A5578] text-[12px]">{configs.length} reward types · {totalIssued} issued</p>
          </div>
        </div>
        <button
          onClick={() => setCreating(!creating)}
          className="flex items-center gap-2 h-9 px-4 bg-accent text-[#060a0e] rounded-xl font-semibold text-[13px] shadow-[0_4px_16px_rgba(34,255,170,0.25)]"
        >
          <Plus size={14} strokeWidth={2.5} />
          New Reward
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Issued',   value: totalIssued,       icon: Gift,    color: 'text-[#22FFAA]', bg: 'bg-[#22FFAA]/8',  trend: 15 },
          { label: 'Redeemed',       value: totalRedeemed,     icon: Check,   color: 'text-[#6D5DFD]', bg: 'bg-[#6D5DFD]/10', trend: 8  },
          { label: 'Redemption Rate',value: `${redemptionRate}%`, icon: TrendingUp, color: 'text-[#FFB84D]', bg: 'bg-[#FFB84D]/10', trend: 3 },
        ].map(({ label, value, icon: Icon, color, bg, trend }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-[#0A1226] border border-[#0F1D35] rounded-2xl p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', bg)}>
                <Icon size={16} className={color} strokeWidth={1.8} />
              </div>
              <span className={cn('text-[11px] font-bold flex items-center gap-0.5', trend >= 0 ? 'text-[#22FFAA]' : 'text-[#FF5C7A]')}>
                <ArrowUpRight size={11} strokeWidth={2.5} />
                {Math.abs(trend)}%
              </span>
            </div>
            <p className={cn('text-2xl font-bold tabular-nums', color)}>{value}</p>
            <p className="text-[#4A5578] text-[11px] mt-0.5 font-medium">{label}</p>
          </motion.div>
        ))}
      </div>

      {/* Create Reward */}
      {creating && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0A1226] border border-accent/20 rounded-2xl p-5"
        >
          <p className="text-[13px] font-bold text-[#F0F4FF] mb-4">Configure New Reward</p>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="text-[10px] font-bold text-[#4A5578] uppercase tracking-wider mb-1.5 block">Name *</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Mission Champion Badge"
                className="w-full h-9 px-3 bg-[#07101F] border border-[#0F1D35] rounded-xl text-[13px] text-[#F0F4FF] placeholder:text-[#4A5578] focus:outline-none focus:border-[#162440]"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-[#4A5578] uppercase tracking-wider mb-1.5 block">Type</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as DbRewardConfig['type'])}
                className="w-full h-9 px-3 bg-[#07101F] border border-[#0F1D35] rounded-xl text-[13px] text-[#F0F4FF] focus:outline-none"
              >
                {Object.entries(REWARD_TYPE_CONFIG).map(([v, { label }]) => (
                  <option key={v} value={v}>{label}</option>
                ))}
              </select>
            </div>
            {newType === 'points' && (
              <div>
                <label className="text-[10px] font-bold text-[#4A5578] uppercase tracking-wider mb-1.5 block">Points Value</label>
                <input
                  type="number"
                  value={newPoints}
                  onChange={(e) => setNewPoints(e.target.value)}
                  className="w-full h-9 px-3 bg-[#07101F] border border-[#0F1D35] rounded-xl text-[13px] text-[#F0F4FF] focus:outline-none focus:border-[#162440]"
                />
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={createReward} disabled={saving || !newName.trim()} className="flex items-center gap-1.5 h-8 px-4 bg-accent text-[#060a0e] rounded-xl text-[12px] font-semibold disabled:opacity-50">
              <Check size={12} strokeWidth={2.5} />{saving ? 'Creating…' : 'Create Reward'}
            </button>
            <button onClick={() => setCreating(false)} className="h-8 px-3 bg-[#07101F] border border-[#0F1D35] rounded-xl text-[12px] text-[#8B9CC0]">Cancel</button>
          </div>
        </motion.div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-3 gap-4">
        {/* Reward Configs */}
        <div className="col-span-2 space-y-3">
          <p className="text-[11px] font-bold text-[#4A5578] uppercase tracking-wider">Configured Rewards</p>
          {configs.length === 0 ? (
            <div className="bg-[#0A1226] border border-[#0F1D35] rounded-2xl py-16 text-center">
              <Gift size={28} className="text-[#4A5578] mx-auto mb-2" strokeWidth={1.5} />
              <p className="text-[#8B9CC0] font-medium">No rewards configured</p>
              <p className="text-[#4A5578] text-sm mt-1">Create your first reward type to start incentivizing participation.</p>
            </div>
          ) : (
            configs.map((config, i) => {
              const tc = REWARD_TYPE_CONFIG[config.type] ?? REWARD_TYPE_CONFIG.benefit;
              const typeEvents = events.filter((e) => e.reward_type === config.type);
              return (
                <motion.div
                  key={config.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="bg-[#0A1226] border border-[#0F1D35] rounded-2xl p-4 hover:border-[#162440] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', tc.bg)}>
                      <tc.icon size={16} className={tc.color} strokeWidth={1.8} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-bold text-[#F0F4FF] truncate">{config.name}</p>
                        <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', tc.color, tc.bg)}>{tc.label}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-[#4A5578]">
                        {config.value.points && <span>{config.value.points} pts</span>}
                        {config.value.discount_pct && <span>{config.value.discount_pct}% off</span>}
                        {config.value.badge_label && <span>{config.value.badge_label}</span>}
                        <span>·</span>
                        <span>{typeEvents.length} issued</span>
                        <span>·</span>
                        <span>{typeEvents.filter((e) => e.redeemed).length} redeemed</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => toggleActive(config.id, config.is_active)}
                        className={cn(
                          'relative w-9 h-5 rounded-full transition-all',
                          config.is_active ? 'bg-accent' : 'bg-[#0D1530] border border-[#162440]'
                        )}
                      >
                        <span className={cn(
                          'absolute top-0.5 w-4 h-4 rounded-full transition-all',
                          config.is_active ? 'right-0.5 bg-[#060a0e]' : 'left-0.5 bg-[#4A5578]'
                        )} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Analytics Panel */}
        <div className="space-y-4">
          <div className="bg-[#0A1226] border border-[#0F1D35] rounded-2xl p-4">
            <p className="text-[11px] font-bold text-[#4A5578] uppercase tracking-wider mb-4">By Type</p>
            <div className="space-y-3">
              {Object.entries(REWARD_TYPE_CONFIG).map(([type, cfg]) => {
                const count = typeBreakdown[type] ?? 0;
                const pct = totalIssued > 0 ? Math.round((count / totalIssued) * 100) : 0;
                return (
                  <div key={type}>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <div className="flex items-center gap-1.5">
                        <cfg.icon size={11} className={cfg.color} strokeWidth={2} />
                        <span className="text-[#8B9CC0]">{cfg.label}</span>
                      </div>
                      <span className="font-bold tabular-nums text-[#F0F4FF]">{count}</span>
                    </div>
                    <div className="h-1 bg-[#0D1530] rounded-full">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: 0.3 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: cfg.color.replace('text-[', '').replace(']', '') }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Events */}
          <div className="bg-[#0A1226] border border-[#0F1D35] rounded-2xl overflow-hidden">
            <p className="text-[11px] font-bold text-[#4A5578] uppercase tracking-wider px-4 pt-4 pb-3">Recent Reward Events</p>
            {events.length === 0 ? (
              <p className="text-[12px] text-[#4A5578] px-4 pb-4">No reward events yet.</p>
            ) : (
              <div className="divide-y divide-[#0F1D35]">
                {events.slice(0, 8).map((e) => {
                  const tc = REWARD_TYPE_CONFIG[e.reward_type as keyof typeof REWARD_TYPE_CONFIG] ?? REWARD_TYPE_CONFIG.benefit;
                  return (
                    <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                      <div className={cn('w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0', tc.bg)}>
                        <tc.icon size={11} className={tc.color} strokeWidth={2} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-[#F0F4FF] font-medium capitalize">{e.reward_type}</p>
                      </div>
                      <span className={cn('text-[10px] font-bold', e.redeemed ? 'text-[#22FFAA]' : 'text-[#4A5578]')}>
                        {e.redeemed ? 'Redeemed' : 'Pending'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Marketplace Perks */}
      <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 12, background: `${t.ai}1A`, border: `1px solid ${t.ai}33`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Store size={16} style={{ color: t.ai }} strokeWidth={1.8} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: t.txt }}>Marketplace Perks</p>
              <p style={{ fontSize: 11, color: t.txtFaint }}>Perks participants can claim with XP on the barter market</p>
            </div>
          </div>
          <button
            onClick={() => setCreatingPerk(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, height: 34, padding: '0 14px', background: `${t.ai}1A`, border: `1px solid ${t.ai}33`, borderRadius: 10, color: t.ai, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            <Plus size={13} strokeWidth={2.5} />
            Add Perk
          </button>
        </div>

        {creatingPerk && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ background: t.card, border: `1px solid ${t.ai}33`, borderRadius: 16, padding: 18, marginBottom: 16 }}
          >
            <p style={{ fontSize: 12, fontWeight: 700, color: t.txt, marginBottom: 14 }}>New Marketplace Perk</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Perk Name *</label>
                <input
                  value={perkTitle}
                  onChange={e => setPerkTitle(e.target.value)}
                  placeholder="e.g. Free Coffee Voucher"
                  style={{ width: '100%', height: 36, padding: '0 12px', background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, fontSize: 12, color: t.txt, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>XP Cost</label>
                <input
                  type="number"
                  value={perkXpCost}
                  onChange={e => setPerkXpCost(e.target.value)}
                  placeholder="e.g. 200"
                  min={1}
                  style={{ width: '100%', height: 36, padding: '0 12px', background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, fontSize: 12, color: t.txt, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Expires In</label>
                <select
                  value={perkExpiry}
                  onChange={e => setPerkExpiry(e.target.value)}
                  style={{ width: '100%', height: 36, padding: '0 12px', background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, fontSize: 12, color: t.txt, outline: 'none', boxSizing: 'border-box' }}
                >
                  <option value="7">7 days</option>
                  <option value="14">14 days</option>
                  <option value="30">30 days</option>
                  <option value="90">90 days</option>
                  <option value="">No expiry</option>
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Description</label>
              <input
                value={perkDescription}
                onChange={e => setPerkDescription(e.target.value)}
                placeholder="What participants receive when they claim this perk…"
                style={{ width: '100%', height: 36, padding: '0 12px', background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, fontSize: 12, color: t.txt, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={createPerk}
                disabled={savingPerk || !perkTitle.trim()}
                style={{ display: 'flex', alignItems: 'center', gap: 6, height: 32, padding: '0 16px', background: t.ai, color: '#fff', borderRadius: 10, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', opacity: savingPerk || !perkTitle.trim() ? 0.5 : 1 }}
              >
                <Check size={12} strokeWidth={2.5} />
                {savingPerk ? 'Creating…' : 'Create Perk'}
              </button>
              <button
                onClick={() => setCreatingPerk(false)}
                style={{ height: 32, padding: '0 12px', background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, fontSize: 12, color: t.txtDim, cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}

        {perkListings.length === 0 && !creatingPerk ? (
          <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, padding: '40px 0', textAlign: 'center' }}>
            <Store size={28} style={{ color: t.txtFaint, margin: '0 auto 8px' }} strokeWidth={1.5} />
            <p style={{ color: t.txtDim, fontWeight: 500, fontSize: 13 }}>No marketplace perks yet</p>
            <p style={{ color: t.txtFaint, fontSize: 12, marginTop: 4 }}>Create perks participants can claim with their XP balance.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {perkListings.map((perk, i) => (
              <motion.div
                key={perk.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                style={{ background: t.card, border: `1px solid ${perk.status === 'active' ? t.ai + '33' : t.border}`, borderRadius: 14, padding: 14 }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: `${t.ai}1A`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Key size={14} style={{ color: t.ai }} strokeWidth={1.8} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: t.txt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{perk.title}</p>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: perk.status === 'active' ? `${t.accent}1A` : `${t.txtFaint}1A`, color: perk.status === 'active' ? t.accent : t.txtFaint, flexShrink: 0 }}>
                        {perk.status}
                      </span>
                    </div>
                    {perk.description && (
                      <p style={{ fontSize: 11, color: t.txtDim, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{perk.description}</p>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {perk.ask_xp ? (
                        <span style={{ fontSize: 11, fontWeight: 700, color: t.ai }}>{perk.ask_xp} XP</span>
                      ) : (
                        <span style={{ fontSize: 11, color: t.txtFaint }}>No XP cost</span>
                      )}
                      {perk.expires_at && (
                        <span style={{ fontSize: 10, color: t.txtFaint }}>· expires {new Date(perk.expires_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  {perk.status === 'active' && (
                    <button
                      onClick={() => cancelPerk(perk.id)}
                      title="Cancel perk"
                      style={{ width: 28, height: 28, borderRadius: 8, background: `${t.error}1A`, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                    >
                      <Trash2 size={12} style={{ color: t.error }} strokeWidth={2} />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
