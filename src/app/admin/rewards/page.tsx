'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Gift, Star, Tag, Ticket, Zap, Award, Save, Loader2,
  Trash2, ToggleLeft, ToggleRight
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { DbRewardConfig, RewardType, RewardConfigValue } from '@/lib/supabase/types';
import { cn } from '@/lib/cn';

const REWARD_TYPE_CONFIG: Record<RewardType, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  points:     { label: 'Points',     icon: Star,   color: 'text-[#fbbf24]', bg: 'bg-[#2a1a00]' },
  badge:      { label: 'Badge',      icon: Award,  color: 'text-[#818cf8]', bg: 'bg-[#0f0f2a]' },
  coupon:     { label: 'Coupon',     icon: Ticket, color: 'text-[#22d3ee]', bg: 'bg-[#001a22]' },
  experience: { label: 'Experience', icon: Zap,    color: 'text-accent',    bg: 'bg-accent-light' },
  benefit:    { label: 'Benefit',    icon: Gift,   color: 'text-[#f472b6]', bg: 'bg-[#2a0a1a]' },
};

interface RewardForm {
  name: string;
  type: RewardType;
  value: RewardConfigValue;
}

const EMPTY_FORM: RewardForm = {
  name: '',
  type: 'points',
  value: { points: 100 },
};

function RewardValueFields({
  type,
  value,
  onChange,
}: {
  type: RewardType;
  value: RewardConfigValue;
  onChange: (v: RewardConfigValue) => void;
}) {
  switch (type) {
    case 'points':
      return (
        <div>
          <label className="text-[12px] font-semibold text-[#7a8fa8] uppercase tracking-wider mb-1.5 block">Point Value</label>
          <input
            type="number"
            min={1}
            value={value.points ?? 100}
            onChange={(e) => onChange({ ...value, points: Number(e.target.value) })}
            className="w-full h-11 bg-[#0f1824] border border-[#1c2a3a] rounded-xl px-4 text-[#e8f0fe] text-sm focus:outline-none focus:border-accent transition-colors"
          />
        </div>
      );
    case 'badge':
      return (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[12px] font-semibold text-[#7a8fa8] uppercase tracking-wider mb-1.5 block">Badge Label</label>
            <input
              value={value.badge_label ?? ''}
              onChange={(e) => onChange({ ...value, badge_label: e.target.value })}
              placeholder="e.g. Explorer"
              className="w-full h-11 bg-[#0f1824] border border-[#1c2a3a] rounded-xl px-4 text-[#e8f0fe] placeholder-[#3d5068] text-sm focus:outline-none focus:border-accent transition-colors"
            />
          </div>
          <div>
            <label className="text-[12px] font-semibold text-[#7a8fa8] uppercase tracking-wider mb-1.5 block">Icon (emoji)</label>
            <input
              value={value.badge_icon ?? ''}
              onChange={(e) => onChange({ ...value, badge_icon: e.target.value })}
              placeholder="🏆"
              className="w-full h-11 bg-[#0f1824] border border-[#1c2a3a] rounded-xl px-4 text-[#e8f0fe] placeholder-[#3d5068] text-sm focus:outline-none focus:border-accent transition-colors"
            />
          </div>
        </div>
      );
    case 'coupon':
      return (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[12px] font-semibold text-[#7a8fa8] uppercase tracking-wider mb-1.5 block">Coupon Code</label>
            <input
              value={value.coupon_code ?? ''}
              onChange={(e) => onChange({ ...value, coupon_code: e.target.value.toUpperCase() })}
              placeholder="XHUNT20"
              className="w-full h-11 bg-[#0f1824] border border-[#1c2a3a] rounded-xl px-4 text-[#e8f0fe] placeholder-[#3d5068] text-sm font-mono focus:outline-none focus:border-accent transition-colors"
            />
          </div>
          <div>
            <label className="text-[12px] font-semibold text-[#7a8fa8] uppercase tracking-wider mb-1.5 block">Discount %</label>
            <input
              type="number"
              min={1}
              max={100}
              value={value.discount_pct ?? 20}
              onChange={(e) => onChange({ ...value, discount_pct: Number(e.target.value) })}
              className="w-full h-11 bg-[#0f1824] border border-[#1c2a3a] rounded-xl px-4 text-[#e8f0fe] text-sm focus:outline-none focus:border-accent transition-colors"
            />
          </div>
        </div>
      );
    case 'experience':
    case 'benefit':
      return (
        <div>
          <label className="text-[12px] font-semibold text-[#7a8fa8] uppercase tracking-wider mb-1.5 block">Description</label>
          <textarea
            value={value.description ?? ''}
            onChange={(e) => onChange({ ...value, description: e.target.value })}
            placeholder={type === 'experience' ? 'e.g. Exclusive city tour for two' : 'e.g. 3 months premium membership'}
            rows={2}
            className="w-full bg-[#0f1824] border border-[#1c2a3a] rounded-xl px-4 py-3 text-[#e8f0fe] placeholder-[#3d5068] text-sm focus:outline-none focus:border-accent transition-colors resize-none"
          />
        </div>
      );
  }
}

function rewardSummary(r: DbRewardConfig): string {
  switch (r.type) {
    case 'points':     return `${r.value.points ?? 0} pts`;
    case 'badge':      return `${r.value.badge_icon ?? ''} ${r.value.badge_label ?? ''}`.trim();
    case 'coupon':     return `${r.value.coupon_code ?? ''} · ${r.value.discount_pct ?? 0}% off`;
    case 'experience': return r.value.description?.slice(0, 40) ?? '';
    case 'benefit':    return r.value.description?.slice(0, 40) ?? '';
  }
}

export default function AdminRewardsPage() {
  const [rewards, setRewards] = useState<DbRewardConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<RewardForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => { loadRewards(); }, []);

  async function loadRewards() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from('user_profiles').select('tenant_id').eq('id', user.id).single();
    if (!profile?.tenant_id) return;
    const { data } = await supabase.from('reward_configs').select('*').eq('tenant_id', profile.tenant_id).order('created_at', { ascending: false });
    setRewards(data ?? []);
    setLoading(false);
  }

  function openCreate() { setEditing(null); setForm(EMPTY_FORM); setShowForm(true); }
  function openEdit(r: DbRewardConfig) {
    setEditing(r.id);
    setForm({ name: r.name, type: r.type, value: r.value });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const { data: profile } = await supabase.from('user_profiles').select('tenant_id').eq('id', user.id).single();
    if (!profile?.tenant_id) { setSaving(false); return; }

    if (editing) {
      const { data } = await supabase.from('reward_configs').update({ name: form.name, type: form.type, value: form.value }).eq('id', editing).select().single();
      if (data) setRewards((prev) => prev.map((r) => r.id === editing ? data : r));
    } else {
      const { data } = await supabase.from('reward_configs').insert({ tenant_id: profile.tenant_id, name: form.name, type: form.type, value: form.value }).select().single();
      if (data) setRewards((prev) => [data, ...prev]);
    }

    setSaving(false);
    setShowForm(false);
  }

  async function toggleActive(id: string, current: boolean) {
    await supabase.from('reward_configs').update({ is_active: !current }).eq('id', id);
    setRewards((prev) => prev.map((r) => r.id === id ? { ...r, is_active: !current } : r));
  }

  async function deleteReward(id: string) {
    if (!confirm('Delete this reward config?')) return;
    setDeleting(id);
    await supabase.from('reward_configs').delete().eq('id', id);
    setRewards((prev) => prev.filter((r) => r.id !== id));
    setDeleting(null);
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[28px] font-bold text-[#e8f0fe]">Rewards</h1>
          <p className="text-[#7a8fa8] text-sm mt-0.5">Configure reward types that missions can offer participants</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={openCreate}
          className="flex items-center gap-2 h-10 px-5 bg-accent text-[#060a0e] rounded-xl font-semibold text-sm shadow-[0_4px_16px_rgba(0,230,118,0.35)]"
        >
          <Plus size={16} strokeWidth={2.5} /> New Reward
        </motion.button>
      </div>

      {loading ? (
        <div className="py-24 flex justify-center">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : rewards.length === 0 && !showForm ? (
        <div className="py-24 text-center bg-[#111927] border border-[#1c2a3a] rounded-2xl">
          <Gift size={36} className="text-[#3d5068] mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-[#7a8fa8] font-medium mb-1">No rewards configured</p>
          <p className="text-[#3d5068] text-sm mb-5">Create reward configs to attach to missions.</p>
          <button onClick={openCreate} className="inline-flex items-center gap-2 px-5 h-10 bg-accent text-[#060a0e] rounded-xl font-semibold text-sm">
            <Plus size={15} strokeWidth={2.5} /> Create Reward
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 mb-6">
          {rewards.map((r) => {
            const cfg = REWARD_TYPE_CONFIG[r.type];
            const Icon = cfg.icon;
            return (
              <div key={r.id} className={cn('bg-[#111927] border rounded-2xl p-5 transition-all group', r.is_active ? 'border-[#1c2a3a] hover:border-[#2a3f58]' : 'border-[#1c2a3a] opacity-50')}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', cfg.bg)}>
                      <Icon size={17} className={cfg.color} strokeWidth={2} />
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-[#e8f0fe]">{r.name}</p>
                      <p className="text-[11px] text-[#7a8fa8]">{rewardSummary(r)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => toggleActive(r.id, r.is_active)}
                      className="w-8 h-8 rounded-lg bg-[#162030] flex items-center justify-center text-[#7a8fa8] hover:text-accent transition-colors"
                      title={r.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {r.is_active ? <ToggleRight size={14} strokeWidth={2} /> : <ToggleLeft size={14} strokeWidth={2} />}
                    </button>
                    <button onClick={() => openEdit(r)} className="w-8 h-8 rounded-lg bg-[#162030] flex items-center justify-center text-[#7a8fa8] hover:text-accent transition-colors">
                      <Tag size={13} strokeWidth={2} />
                    </button>
                    <button onClick={() => deleteReward(r.id)} disabled={deleting === r.id} className="w-8 h-8 rounded-lg bg-[#162030] flex items-center justify-center text-[#7a8fa8] hover:text-[#ff5252] transition-colors disabled:opacity-40">
                      <Trash2 size={13} strokeWidth={2} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', cfg.bg, cfg.color)}>
                    {cfg.label}
                  </span>
                  <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', r.is_active ? 'bg-accent-light text-accent' : 'bg-[#162030] text-[#3d5068]')}>
                    {r.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="bg-[#111927] border border-[#1c2a3a] rounded-2xl p-6"
          >
            <h2 className="text-[16px] font-bold text-[#e8f0fe] mb-5">{editing ? 'Edit Reward' : 'New Reward Config'}</h2>
            <div className="flex flex-col gap-5">
              <div>
                <label className="text-[12px] font-semibold text-[#7a8fa8] uppercase tracking-wider mb-1.5 block">Reward Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Explorer Points"
                  className="w-full h-11 bg-[#0f1824] border border-[#1c2a3a] rounded-xl px-4 text-[#e8f0fe] placeholder-[#3d5068] text-sm focus:outline-none focus:border-accent transition-colors"
                />
              </div>

              <div>
                <label className="text-[12px] font-semibold text-[#7a8fa8] uppercase tracking-wider mb-2 block">Type</label>
                <div className="grid grid-cols-5 gap-2">
                  {(Object.entries(REWARD_TYPE_CONFIG) as [RewardType, typeof REWARD_TYPE_CONFIG[RewardType]][]).map(([type, cfg]) => {
                    const Icon = cfg.icon;
                    const isActive = form.type === type;
                    return (
                      <button
                        key={type}
                        onClick={() => setForm((p) => ({ ...p, type, value: {} }))}
                        className={cn(
                          'flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all text-[11px] font-semibold',
                          isActive ? `${cfg.bg} ${cfg.color} border-transparent` : 'bg-[#0f1824] text-[#7a8fa8] border-[#1c2a3a] hover:border-[#2a3f58]'
                        )}
                      >
                        <Icon size={17} strokeWidth={2} />
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <RewardValueFields type={form.type} value={form.value} onChange={(v) => setForm((p) => ({ ...p, value: v }))} />

              <div className="flex gap-3 pt-2">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSave}
                  disabled={saving || !form.name.trim()}
                  className="flex items-center gap-2 h-10 px-5 bg-accent text-[#060a0e] rounded-xl font-semibold text-sm shadow-[0_4px_16px_rgba(0,230,118,0.35)] disabled:opacity-60"
                >
                  {saving ? <Loader2 size={15} className="animate-spin" strokeWidth={2} /> : <Save size={15} strokeWidth={2} />}
                  {editing ? 'Update Reward' : 'Create Reward'}
                </motion.button>
                <button onClick={() => setShowForm(false)} className="h-10 px-5 bg-[#162030] border border-[#1c2a3a] rounded-xl text-[#7a8fa8] hover:text-[#e8f0fe] text-sm font-medium transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
