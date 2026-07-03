'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Gift, Plus, Award, Tag, Percent, Star, Key, Sparkles, BarChart3,
  Check, X, MoreHorizontal, TrendingUp, Users, ArrowUpRight, Zap,
  ChevronRight, RefreshCw
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/context';
import { cn } from '@/lib/cn';
import { t } from '@/theme/colors';
import type { DbRewardConfig, DbRewardEvent } from '@/lib/supabase/types';

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg', className)} style={{ background: t.panel }} />;
}

const REWARD_TYPE_CONFIG = {
  points:     { label: 'Points',      icon: Star,     color: t.warning, bg: `${t.warning}1A` },
  badge:      { label: 'Badge',       icon: Award,    color: t.ai,      bg: `${t.ai}1A`      },
  coupon:     { label: 'Coupon',      icon: Percent,  color: t.accent,  bg: `${t.accent}14`  },
  experience: { label: 'Experience',  icon: Sparkles, color: t.error,   bg: `${t.error}1A`   },
  benefit:    { label: 'Benefit',     icon: Key,      color: t.txtDim,  bg: `${t.txtDim}1A`  },
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
  const { user, isLoaded } = useAuth();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      if (!isLoaded || !user) return;
      const { data: profile } = await supabase.from('user_profiles').select('tenant_id').eq('id', user.id).single();
      if (!profile?.tenant_id) { setLoading(false); return; }
      setTenantId(profile.tenant_id);

      const [configsRes, eventsRes] = await Promise.all([
        supabase.from('reward_configs').select('*').eq('tenant_id', profile.tenant_id).order('created_at', { ascending: false }),
        supabase.from('reward_events').select('*').eq('tenant_id', profile.tenant_id).order('issued_at', { ascending: false }).limit(30),
      ]);
      setConfigs(configsRes.data ?? []);
      setEvents(eventsRes.data ?? []);
      setLoading(false);
    }
    load();
  }, [supabase, user, isLoaded]);

  async function toggleActive(id: string, is_active: boolean) {
    await supabase.from('reward_configs').update({ is_active: !is_active }).eq('id', id);
    setConfigs((prev) => prev.map((c) => c.id === id ? { ...c, is_active: !is_active } : c));
  }

  async function createReward() {
    if (!newName.trim() || !tenantId) return;
    setSaving(true);
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
          <div className="w-9 h-9 rounded-xl border flex items-center justify-center"
            style={{ background: `${t.warning}1A`, borderColor: `${t.warning}33` }}>
            <Gift size={18} strokeWidth={1.8} style={{ color: t.warning }} />
          </div>
          <div>
            <h1 className="text-[22px] font-bold" style={{ color: t.txt }}>Reward Center</h1>
            <p className="text-[12px]" style={{ color: t.txtFaint }}>{configs.length} reward types · {totalIssued} issued</p>
          </div>
        </div>
        <button
          onClick={() => setCreating(!creating)}
          className="flex items-center gap-2 h-9 px-4 bg-accent rounded-xl font-semibold text-[13px] shadow-[0_4px_16px_rgba(34,255,170,0.25)]"
          style={{ color: '#060a0e' }}
        >
          <Plus size={14} strokeWidth={2.5} />
          New Reward
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Issued',    value: totalIssued,          icon: Gift,       color: t.accent,  bg: `${t.accent}14`,  trend: 15 },
          { label: 'Redeemed',        value: totalRedeemed,        icon: Check,      color: t.ai,      bg: `${t.ai}1A`,      trend: 8  },
          { label: 'Redemption Rate', value: `${redemptionRate}%`, icon: TrendingUp, color: t.warning, bg: `${t.warning}1A`, trend: 3  },
        ].map(({ label, value, icon: Icon, color, bg, trend }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl p-5"
            style={{ background: t.card, border: `1px solid ${t.panel}` }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: bg }}>
                <Icon size={16} strokeWidth={1.8} style={{ color }} />
              </div>
              <span className="text-[11px] font-bold flex items-center gap-0.5" style={{ color: trend >= 0 ? t.accent : t.error }}>
                <ArrowUpRight size={11} strokeWidth={2.5} />
                {Math.abs(trend)}%
              </span>
            </div>
            <p className="text-2xl font-bold tabular-nums" style={{ color }}>{value}</p>
            <p className="text-[11px] mt-0.5 font-medium" style={{ color: t.txtFaint }}>{label}</p>
          </motion.div>
        ))}
      </div>

      {/* Create Reward */}
      {creating && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 border border-accent/20"
          style={{ background: t.card }}
        >
          <p className="text-[13px] font-bold mb-4" style={{ color: t.txt }}>Configure New Reward</p>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: t.txtFaint }}>Name *</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Mission Champion Badge"
                className="w-full h-9 px-3 rounded-xl text-[13px] focus:outline-none"
                style={{ background: t.surface, border: `1px solid ${t.panel}`, color: t.txt }}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: t.txtFaint }}>Type</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as DbRewardConfig['type'])}
                className="w-full h-9 px-3 rounded-xl text-[13px] focus:outline-none"
                style={{ background: t.surface, border: `1px solid ${t.panel}`, color: t.txt }}
              >
                {Object.entries(REWARD_TYPE_CONFIG).map(([v, { label }]) => (
                  <option key={v} value={v}>{label}</option>
                ))}
              </select>
            </div>
            {newType === 'points' && (
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: t.txtFaint }}>Points Value</label>
                <input
                  type="number"
                  value={newPoints}
                  onChange={(e) => setNewPoints(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl text-[13px] focus:outline-none"
                  style={{ background: t.surface, border: `1px solid ${t.panel}`, color: t.txt }}
                />
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={createReward} disabled={saving || !newName.trim()} className="flex items-center gap-1.5 h-8 px-4 bg-accent rounded-xl text-[12px] font-semibold disabled:opacity-50" style={{ color: '#060a0e' }}>
              <Check size={12} strokeWidth={2.5} />{saving ? 'Creating…' : 'Create Reward'}
            </button>
            <button onClick={() => setCreating(false)} className="h-8 px-3 rounded-xl text-[12px]" style={{ background: t.surface, border: `1px solid ${t.panel}`, color: t.txtDim }}>Cancel</button>
          </div>
        </motion.div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-3 gap-4">
        {/* Reward Configs */}
        <div className="col-span-2 space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: t.txtFaint }}>Configured Rewards</p>
          {configs.length === 0 ? (
            <div className="rounded-2xl py-16 text-center" style={{ background: t.card, border: `1px solid ${t.panel}` }}>
              <Gift size={28} className="mx-auto mb-2" strokeWidth={1.5} style={{ color: t.txtFaint }} />
              <p className="font-medium" style={{ color: t.txtDim }}>No rewards configured</p>
              <p className="text-sm mt-1" style={{ color: t.txtFaint }}>Create your first reward type to start incentivizing participation.</p>
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
                  className="rounded-2xl p-4 transition-colors"
                  style={{ background: t.card, border: `1px solid ${t.panel}` }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: tc.bg }}>
                      <tc.icon size={16} strokeWidth={1.8} style={{ color: tc.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-bold truncate" style={{ color: t.txt }}>{config.name}</p>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ color: tc.color, background: tc.bg }}>{tc.label}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[11px]" style={{ color: t.txtFaint }}>
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
                        className="relative w-9 h-5 rounded-full transition-all"
                        style={{ background: config.is_active ? t.accent : t.panel, border: config.is_active ? 'none' : `1px solid #162440` }}
                      >
                        <span className="absolute top-0.5 w-4 h-4 rounded-full transition-all" style={{
                          right: config.is_active ? '0.125rem' : undefined,
                          left: config.is_active ? undefined : '0.125rem',
                          background: config.is_active ? '#060a0e' : t.txtFaint,
                        }} />
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
          <div className="rounded-2xl p-4" style={{ background: t.card, border: `1px solid ${t.panel}` }}>
            <p className="text-[11px] font-bold uppercase tracking-wider mb-4" style={{ color: t.txtFaint }}>By Type</p>
            <div className="space-y-3">
              {Object.entries(REWARD_TYPE_CONFIG).map(([type, cfg]) => {
                const count = typeBreakdown[type] ?? 0;
                const pct = totalIssued > 0 ? Math.round((count / totalIssued) * 100) : 0;
                return (
                  <div key={type}>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <div className="flex items-center gap-1.5">
                        <cfg.icon size={11} strokeWidth={2} style={{ color: cfg.color }} />
                        <span style={{ color: t.txtDim }}>{cfg.label}</span>
                      </div>
                      <span className="font-bold tabular-nums" style={{ color: t.txt }}>{count}</span>
                    </div>
                    <div className="h-1 rounded-full" style={{ background: t.panel }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: 0.3 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: cfg.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Events */}
          <div className="rounded-2xl overflow-hidden" style={{ background: t.card, border: `1px solid ${t.panel}` }}>
            <p className="text-[11px] font-bold uppercase tracking-wider px-4 pt-4 pb-3" style={{ color: t.txtFaint }}>Recent Reward Events</p>
            {events.length === 0 ? (
              <p className="text-[12px] px-4 pb-4" style={{ color: t.txtFaint }}>No reward events yet.</p>
            ) : (
              <div className="divide-y" style={{ borderColor: t.panel }}>
                {events.slice(0, 8).map((e) => {
                  const tc = REWARD_TYPE_CONFIG[e.reward_type as keyof typeof REWARD_TYPE_CONFIG] ?? REWARD_TYPE_CONFIG.benefit;
                  return (
                    <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: tc.bg }}>
                        <tc.icon size={11} strokeWidth={2} style={{ color: tc.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium capitalize" style={{ color: t.txt }}>{e.reward_type}</p>
                      </div>
                      <span className="text-[10px] font-bold" style={{ color: e.redeemed ? t.accent : t.txtFaint }}>
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
    </div>
  );
}
