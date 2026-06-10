'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock, Unlock, AlertTriangle, CheckCircle2, Clock, DollarSign,
  Plus, RefreshCw, Loader2, ChevronDown, ChevronUp, Shield,
  ArrowUpRight, XCircle, BarChart2, Target
} from 'lucide-react';
import { cn } from '@/lib/cn';
import type { DbEscrowAccount, EscrowStatus, EscrowReleaseCondition } from '@/lib/supabase/types';

const STATUS_CONFIG: Record<EscrowStatus, { label: string; color: string; bg: string; border: string; icon: typeof Lock }> = {
  created:            { label: 'Created',           color: 'text-[#7a8fa8]', bg: 'bg-[#162030]',  border: 'border-[#1c2a3a]',  icon: Clock },
  funded:             { label: 'Funded',            color: 'text-[#6D5DFD]', bg: 'bg-[#001a22]',  border: 'border-[#6D5DFD]/20]', icon: DollarSign },
  locked:             { label: 'Locked',            color: 'text-[#fbbf24]', bg: 'bg-[#2a1a00]',  border: 'border-[#fbbf24]/20]', icon: Lock },
  partially_released: { label: 'Partial Release',  color: 'text-[#818cf8]', bg: 'bg-[#0f0f2a]',  border: 'border-[#818cf8]/20]', icon: ArrowUpRight },
  fully_released:     { label: 'Released',         color: 'text-accent',    bg: 'bg-accent-light', border: 'border-accent/20',  icon: Unlock },
  disputed:           { label: 'Disputed',         color: 'text-[#f87171]', bg: 'bg-[#2a0a0a]',  border: 'border-[#f87171]/20]', icon: AlertTriangle },
  refunded:           { label: 'Refunded',         color: 'text-[#7a8fa8]', bg: 'bg-[#162030]',  border: 'border-[#1c2a3a]',  icon: XCircle },
};

const CONDITION_CONFIG: Record<EscrowReleaseCondition, { label: string; icon: typeof Target }> = {
  mei_threshold:   { label: 'MEI Threshold',     icon: BarChart2 },
  outcome_count:   { label: 'Outcome Count',     icon: CheckCircle2 },
  manual_approval: { label: 'Manual Approval',   icon: Shield },
  deadline_based:  { label: 'Deadline-Based',    icon: Clock },
  hybrid:          { label: 'Hybrid Conditions', icon: Target },
};

function fmt(cents: number, currency = 'usd') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100);
}

function ProgressRing({ pct }: { pct: number }) {
  const r = 20; const c = 2 * Math.PI * r;
  return (
    <svg width="48" height="48" viewBox="0 0 48 48">
      <circle cx="24" cy="24" r={r} fill="none" stroke="#162030" strokeWidth="4" />
      <motion.circle
        cx="24" cy="24" r={r} fill="none" stroke="#22FFAA" strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c - (pct / 100) * c }}
        transition={{ duration: 0.8, ease: 'easeOut' as const }}
        style={{ transformOrigin: '24px 24px', rotate: '-90deg' }}
      />
      <text x="24" y="28" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#e8f0fe">
        {Math.round(pct)}%
      </text>
    </svg>
  );
}

function CreateEscrowModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    amount: '',
    currency: 'usd',
    release_condition: 'manual_approval' as EscrowReleaseCondition,
    mission_id: '',
    mei_threshold: '75',
    outcome_count: '10',
    deadline: '',
  });
  const [submitting, setSubmitting] = useState(false);

  function buildReleaseConfig() {
    switch (form.release_condition) {
      case 'mei_threshold':   return { threshold: Number(form.mei_threshold) };
      case 'outcome_count':   return { count: Number(form.outcome_count) };
      case 'deadline_based':  return { deadline: form.deadline };
      case 'hybrid':          return { mei_threshold: Number(form.mei_threshold), outcome_count: Number(form.outcome_count) };
      default:                return {};
    }
  }

  async function submit() {
    const amountCents = Math.round(Number(form.amount) * 100);
    if (!amountCents || amountCents <= 0) return;
    setSubmitting(true);
    const res = await fetch('/api/escrow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount_cents: amountCents,
        currency: form.currency,
        release_condition: form.release_condition,
        release_config: buildReleaseConfig(),
        mission_id: form.mission_id || undefined,
      }),
    });
    setSubmitting(false);
    if (res.ok) { onCreated(); onClose(); }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-[#0d1623] border border-[#1c2a3a] rounded-2xl w-full max-w-md mx-4 p-6"
      >
        <h2 className="text-[18px] font-bold text-[#e8f0fe] mb-5">Create Escrow Account</h2>

        <div className="flex flex-col gap-3 mb-5">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-[#7a8fa8] block mb-1">Amount ($)</label>
              <input value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                type="number" min="0" placeholder="0.00"
                className="w-full h-9 px-3 bg-[#111927] border border-[#1c2a3a] rounded-lg text-[13px] text-[#e8f0fe] focus:outline-none" />
            </div>
            <div>
              <label className="text-[11px] text-[#7a8fa8] block mb-1">Currency</label>
              <select value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}
                className="w-full h-9 px-3 bg-[#111927] border border-[#1c2a3a] rounded-lg text-[13px] text-[#e8f0fe] focus:outline-none">
                <option value="usd">USD</option>
                <option value="eur">EUR</option>
                <option value="gbp">GBP</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] text-[#7a8fa8] block mb-1">Release Condition</label>
            <select value={form.release_condition} onChange={e => setForm(p => ({ ...p, release_condition: e.target.value as EscrowReleaseCondition }))}
              className="w-full h-9 px-3 bg-[#111927] border border-[#1c2a3a] rounded-lg text-[13px] text-[#e8f0fe] focus:outline-none">
              {(Object.keys(CONDITION_CONFIG) as EscrowReleaseCondition[]).map(k => (
                <option key={k} value={k}>{CONDITION_CONFIG[k].label}</option>
              ))}
            </select>
          </div>

          {(form.release_condition === 'mei_threshold' || form.release_condition === 'hybrid') && (
            <div>
              <label className="text-[11px] text-[#7a8fa8] block mb-1">MEI Threshold: {form.mei_threshold}</label>
              <input type="range" min={0} max={100} value={form.mei_threshold}
                onChange={e => setForm(p => ({ ...p, mei_threshold: e.target.value }))}
                className="w-full accent-accent" />
            </div>
          )}
          {(form.release_condition === 'outcome_count' || form.release_condition === 'hybrid') && (
            <div>
              <label className="text-[11px] text-[#7a8fa8] block mb-1">Required Outcomes</label>
              <input type="number" min={1} value={form.outcome_count}
                onChange={e => setForm(p => ({ ...p, outcome_count: e.target.value }))}
                className="w-full h-9 px-3 bg-[#111927] border border-[#1c2a3a] rounded-lg text-[13px] text-[#e8f0fe] focus:outline-none" />
            </div>
          )}
          {form.release_condition === 'deadline_based' && (
            <div>
              <label className="text-[11px] text-[#7a8fa8] block mb-1">Release Deadline</label>
              <input type="date" value={form.deadline}
                onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))}
                className="w-full h-9 px-3 bg-[#111927] border border-[#1c2a3a] rounded-lg text-[13px] text-[#e8f0fe] focus:outline-none" />
            </div>
          )}

          <div>
            <label className="text-[11px] text-[#7a8fa8] block mb-1">Mission ID (optional)</label>
            <input value={form.mission_id} onChange={e => setForm(p => ({ ...p, mission_id: e.target.value }))}
              placeholder="uuid of mission to tie escrow to"
              className="w-full h-9 px-3 bg-[#111927] border border-[#1c2a3a] rounded-lg text-[12px] text-[#e8f0fe] placeholder-[#3d5068] focus:outline-none" />
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={submit} disabled={submitting}
            className="flex items-center gap-2 h-9 px-5 bg-accent text-[#060a0e] rounded-xl text-[13px] font-bold disabled:opacity-60">
            {submitting && <Loader2 size={13} strokeWidth={2} className="animate-spin" />}
            Create Escrow
          </button>
          <button onClick={onClose} className="h-9 px-4 text-[#7a8fa8] text-[13px] hover:text-[#e8f0fe] transition-colors">
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function EscrowPage() {
  const [accounts, setAccounts] = useState<DbEscrowAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [actionState, setActionState] = useState<Record<string, { type: 'release' | 'dispute'; notes?: string; reason?: string }>>({});
  const [processing, setProcessing] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.set('status', statusFilter);
    const res = await fetch(`/api/escrow?${params}`);
    if (res.ok) {
      const json = await res.json();
      setAccounts(json.escrow_accounts ?? []);
    }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);

  async function doRelease(id: string) {
    setProcessing(id);
    const action = actionState[id];
    const res = await fetch(`/api/escrow/${id}/release`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: action?.notes }),
    });
    setProcessing(null);
    if (res.ok) { await loadAccounts(); setActionState(p => { const n = { ...p }; delete n[id]; return n; }); }
  }

  async function doDispute(id: string) {
    const action = actionState[id];
    if (!action?.reason?.trim()) return;
    setProcessing(id);
    const res = await fetch(`/api/escrow/${id}/dispute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: action.reason }),
    });
    setProcessing(null);
    if (res.ok) { await loadAccounts(); setActionState(p => { const n = { ...p }; delete n[id]; return n; }); }
  }

  const statuses: EscrowStatus[] = ['created', 'funded', 'locked', 'partially_released', 'fully_released', 'disputed', 'refunded'];
  const counts: Record<string, number> = { all: accounts.length };
  accounts.forEach(a => { counts[a.status] = (counts[a.status] ?? 0) + 1; });

  const totalFunded = accounts.filter(a => ['funded','locked','partially_released'].includes(a.status))
    .reduce((s, a) => s + a.amount_cents, 0);
  const totalReleased = accounts.reduce((s, a) => s + a.released_amount_cents, 0);
  const disputed = accounts.filter(a => a.status === 'disputed').length;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[28px] font-bold text-[#e8f0fe]">Escrow Services</h1>
          <p className="text-[#7a8fa8] text-sm mt-0.5">
            Outcome-gated payment escrow, release conditions, and dispute resolution
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadAccounts}
            className="flex items-center gap-2 h-10 px-4 bg-[#111927] border border-[#1c2a3a] text-[#7a8fa8] rounded-xl text-sm hover:text-[#e8f0fe] transition-colors">
            <RefreshCw size={14} strokeWidth={2} /> Refresh
          </button>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 h-10 px-5 bg-accent text-[#060a0e] rounded-xl text-sm font-bold shadow-[0_4px_16px_rgba(0,230,118,0.3)]">
            <Plus size={15} strokeWidth={2.5} /> New Escrow
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Funds in Escrow',    value: fmt(totalFunded),   icon: Lock,        color: 'text-[#6D5DFD]', bg: 'bg-[#001a22]' },
          { label: 'Total Released',     value: fmt(totalReleased), icon: Unlock,      color: 'text-accent',    bg: 'bg-accent-light' },
          { label: 'Active Accounts',    value: accounts.filter(a => !['fully_released','refunded'].includes(a.status)).length,
            icon: Shield, color: 'text-[#818cf8]', bg: 'bg-[#0f0f2a]' },
          { label: 'Disputed',           value: disputed,            icon: AlertTriangle, color: 'text-[#f87171]', bg: 'bg-[#2a0a0a]' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-[#111927] border border-[#1c2a3a] rounded-2xl p-5">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-4', bg)}>
              <Icon size={20} className={color} strokeWidth={2} />
            </div>
            <p className={cn('text-[24px] font-bold', color)}>{value}</p>
            <p className="text-[#7a8fa8] text-[13px] font-medium mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        {(['all', ...statuses] as (EscrowStatus | 'all')[]).map(s => {
          const cfg = s !== 'all' ? STATUS_CONFIG[s] : null;
          const active = statusFilter === s;
          return (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all capitalize',
                active
                  ? (cfg ? cn(cfg.bg, cfg.color) : 'bg-[#1c2a3a] text-[#e8f0fe]')
                  : 'text-[#7a8fa8] hover:text-[#e8f0fe]'
              )}>
              {s === 'all' ? 'All' : STATUS_CONFIG[s].label}
              {counts[s] !== undefined && <span className="ml-1 opacity-60">({counts[s]})</span>}
            </button>
          );
        })}
      </div>

      {/* Escrow accounts list */}
      {loading ? (
        <div className="py-20 flex justify-center">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : accounts.length === 0 ? (
        <div className="py-20 text-center bg-[#111927] rounded-2xl border border-[#1c2a3a]">
          <Lock size={36} className="text-[#3d5068] mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-[#7a8fa8] font-medium">No escrow accounts</p>
          <p className="text-[#3d5068] text-sm mt-1">Create outcome-gated escrow accounts to protect and release mission rewards.</p>
          <button onClick={() => setShowCreate(true)}
            className="mt-4 h-9 px-5 bg-accent text-[#060a0e] rounded-xl text-[13px] font-bold">
            Create First Escrow
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {accounts.map(acc => {
            const cfg = STATUS_CONFIG[acc.status];
            const condCfg = CONDITION_CONFIG[acc.release_condition];
            const CondIcon = condCfg.icon;
            const releasedPct = acc.amount_cents > 0 ? (acc.released_amount_cents / acc.amount_cents) * 100 : 0;
            const isExpanded = expanded === acc.id;
            const action = actionState[acc.id];
            const canRelease = ['funded', 'locked', 'partially_released'].includes(acc.status);
            const canDispute = ['funded', 'locked', 'partially_released'].includes(acc.status);

            return (
              <div key={acc.id} className="bg-[#111927] border border-[#1c2a3a] rounded-2xl overflow-hidden">
                <button
                  onClick={() => setExpanded(isExpanded ? null : acc.id)}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-[#162030] transition-colors text-left"
                >
                  {/* Progress ring */}
                  <ProgressRing pct={releasedPct} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-[14px] font-bold text-[#e8f0fe]">{fmt(acc.amount_cents, acc.currency)}</p>
                      <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', cfg.bg, cfg.color)}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#7a8fa8]">
                      Released: {fmt(acc.released_amount_cents, acc.currency)} of {fmt(acc.amount_cents, acc.currency)}
                    </p>
                    {acc.mission_id && (
                      <p className="text-[10px] text-[#3d5068] mt-0.5">Mission {acc.mission_id.slice(0, 8)}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="flex items-center gap-1.5 bg-[#162030] rounded-lg px-2.5 py-1.5">
                      <CondIcon size={11} className="text-[#7a8fa8]" strokeWidth={2} />
                      <span className="text-[10px] text-[#7a8fa8] font-medium">{condCfg.label}</span>
                    </div>
                    <span className="text-[11px] text-[#3d5068]">
                      {new Date(acc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  {isExpanded ? <ChevronUp size={15} className="text-[#3d5068] flex-shrink-0" /> : <ChevronDown size={15} className="text-[#3d5068] flex-shrink-0" />}
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 border-t border-[#1c2a3a] pt-4">
                        {/* Release config */}
                        {Object.keys(acc.release_config).length > 0 && (
                          <div className="mb-4 bg-[#0a1020] rounded-xl p-3 border border-[#1c2a3a]">
                            <p className="text-[10px] font-bold text-[#3d5068] uppercase tracking-wider mb-2">Release Config</p>
                            {Object.entries(acc.release_config).map(([k, v]) => (
                              <div key={k} className="flex justify-between text-[12px]">
                                <span className="text-[#7a8fa8] capitalize">{k.replace(/_/g, ' ')}</span>
                                <span className="text-[#e8f0fe] font-semibold">{String(v)}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Dispute reason */}
                        {acc.dispute_reason && (
                          <div className="mb-4 flex items-start gap-2 bg-[#2a0a0a] rounded-xl p-3 border border-[#f87171]/20">
                            <AlertTriangle size={14} className="text-[#f87171] mt-0.5 flex-shrink-0" strokeWidth={1.8} />
                            <div>
                              <p className="text-[10px] font-bold text-[#f87171] uppercase tracking-wider mb-1">Dispute Reason</p>
                              <p className="text-[12px] text-[#e8f0fe]">{acc.dispute_reason}</p>
                            </div>
                          </div>
                        )}

                        {/* Action buttons */}
                        {(canRelease || canDispute) && !action && (
                          <div className="flex gap-2">
                            {canRelease && (
                              <button
                                onClick={() => setActionState(p => ({ ...p, [acc.id]: { type: 'release' } }))}
                                className="flex items-center gap-1.5 h-8 px-3 bg-accent/10 text-accent border border-accent/25 rounded-lg text-[12px] font-semibold hover:bg-accent/20 transition-all"
                              >
                                <Unlock size={13} strokeWidth={2.5} /> Release Funds
                              </button>
                            )}
                            {canDispute && (
                              <button
                                onClick={() => setActionState(p => ({ ...p, [acc.id]: { type: 'dispute' } }))}
                                className="flex items-center gap-1.5 h-8 px-3 bg-[#2a0a0a] text-[#f87171] border border-[#f87171]/25 rounded-lg text-[12px] font-semibold hover:bg-[#3a1010] transition-all"
                              >
                                <AlertTriangle size={13} strokeWidth={2.5} /> Open Dispute
                              </button>
                            )}
                          </div>
                        )}

                        {/* Release form */}
                        {action?.type === 'release' && (
                          <motion.div
                            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                            className="bg-[#0a1020] rounded-xl p-4 border border-[#1c2a3a]"
                          >
                            <p className="text-[12px] font-bold text-accent mb-2">Release Funds</p>
                            <p className="text-[11px] text-[#7a8fa8] mb-3">
                              Available: {fmt(acc.amount_cents - acc.released_amount_cents, acc.currency)}
                            </p>
                            <textarea
                              placeholder="Release notes (optional)…"
                              value={action.notes ?? ''}
                              onChange={e => setActionState(p => ({ ...p, [acc.id]: { ...p[acc.id], notes: e.target.value } }))}
                              rows={2}
                              className="w-full bg-[#111927] border border-[#1c2a3a] rounded-lg px-3 py-2 text-[12px] text-[#e8f0fe] placeholder-[#3d5068] focus:outline-none resize-none mb-3"
                            />
                            <div className="flex gap-2">
                              <button onClick={() => doRelease(acc.id)} disabled={processing === acc.id}
                                className="flex items-center gap-1.5 h-8 px-4 bg-accent text-[#060a0e] rounded-lg text-[12px] font-bold disabled:opacity-60">
                                {processing === acc.id && <Loader2 size={12} className="animate-spin" />}
                                Confirm Release
                              </button>
                              <button onClick={() => setActionState(p => { const n = { ...p }; delete n[acc.id]; return n; })}
                                className="h-8 px-3 text-[#7a8fa8] text-[12px] hover:text-[#e8f0fe] transition-colors">
                                Cancel
                              </button>
                            </div>
                          </motion.div>
                        )}

                        {/* Dispute form */}
                        {action?.type === 'dispute' && (
                          <motion.div
                            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                            className="bg-[#1a0808] rounded-xl p-4 border border-[#f87171]/20"
                          >
                            <p className="text-[12px] font-bold text-[#f87171] mb-3">Open Dispute</p>
                            <textarea
                              placeholder="Describe the dispute reason…"
                              value={action.reason ?? ''}
                              onChange={e => setActionState(p => ({ ...p, [acc.id]: { ...p[acc.id], reason: e.target.value } }))}
                              rows={3}
                              className="w-full bg-[#0a0505] border border-[#f87171]/20 rounded-lg px-3 py-2 text-[12px] text-[#e8f0fe] placeholder-[#5a3030] focus:outline-none resize-none mb-3"
                            />
                            <div className="flex gap-2">
                              <button onClick={() => doDispute(acc.id)} disabled={processing === acc.id || !action.reason?.trim()}
                                className="flex items-center gap-1.5 h-8 px-4 bg-[#f87171] text-[#0a0000] rounded-lg text-[12px] font-bold disabled:opacity-60">
                                {processing === acc.id && <Loader2 size={12} className="animate-spin" />}
                                Submit Dispute
                              </button>
                              <button onClick={() => setActionState(p => { const n = { ...p }; delete n[acc.id]; return n; })}
                                className="h-8 px-3 text-[#7a8fa8] text-[12px] hover:text-[#e8f0fe] transition-colors">
                                Cancel
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      <CreateEscrowModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={loadAccounts} />
    </div>
  );
}
