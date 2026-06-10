'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign, TrendingUp, BarChart2, FileText, Plus, Loader2,
  RefreshCw, ArrowUpRight, Calendar, CreditCard, Package, Zap,
  CheckCircle2, Clock, XCircle, Download
} from 'lucide-react';
import { cn } from '@/lib/cn';
import type { DbRevenueRecord, DbInvoice, RevenueCategory, InvoiceLineItem, InvoiceStatus } from '@/lib/supabase/types';

const CATEGORY_CONFIG: Record<RevenueCategory, { label: string; color: string; bg: string; icon: typeof DollarSign }> = {
  subscription:          { label: 'Subscription',         color: 'text-accent',    bg: 'bg-accent-light',  icon: CreditCard },
  mission_fee:           { label: 'Mission Fee',          color: 'text-[#6D5DFD]', bg: 'bg-[#001a22]',     icon: Package },
  outcome_bonus:         { label: 'Outcome Bonus',        color: 'text-[#818cf8]', bg: 'bg-[#0f0f2a]',     icon: Zap },
  escrow_release:        { label: 'Escrow Release',       color: 'text-[#fbbf24]', bg: 'bg-[#2a1a00]',     icon: ArrowUpRight },
  api_usage:             { label: 'API Usage',            color: 'text-[#f472b6]', bg: 'bg-[#2a0a1a]',     icon: BarChart2 },
  professional_services: { label: 'Prof. Services',       color: 'text-[#34d399]', bg: 'bg-[#002a1a]',     icon: TrendingUp },
};

const INVOICE_STATUS_CONFIG: Record<InvoiceStatus, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  draft:          { label: 'Draft',          color: 'text-[#7a8fa8]', bg: 'bg-[#162030]',  icon: FileText },
  open:           { label: 'Open',           color: 'text-[#6D5DFD]', bg: 'bg-[#001a22]',  icon: Clock },
  paid:           { label: 'Paid',           color: 'text-accent',    bg: 'bg-accent-light', icon: CheckCircle2 },
  void:           { label: 'Void',           color: 'text-[#7a8fa8]', bg: 'bg-[#162030]',  icon: XCircle },
  uncollectible:  { label: 'Uncollectible',  color: 'text-[#f87171]', bg: 'bg-[#2a0a0a]',  icon: XCircle },
};

function fmt(cents: number, currency = 'usd') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100);
}

function InvoiceModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [lines, setLines] = useState<Partial<InvoiceLineItem>[]>([
    { description: '', quantity: 1, unit_price_cents: 0, category: 'subscription' }
  ]);
  const [dueDays, setDueDays] = useState(30);
  const [submitting, setSubmitting] = useState(false);

  function updateLine(i: number, key: keyof InvoiceLineItem, value: unknown) {
    setLines(prev => prev.map((l, idx) => {
      if (idx !== i) return l;
      const updated = { ...l, [key]: value };
      if (key === 'quantity' || key === 'unit_price_cents') {
        updated.amount_cents = (Number(updated.quantity ?? 1)) * (Number(updated.unit_price_cents ?? 0));
      }
      return updated;
    }));
  }

  async function submit() {
    const validLines = lines.filter(l => l.description && l.amount_cents !== undefined);
    if (!validLines.length) return;
    setSubmitting(true);
    const res = await fetch('/api/revenue/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ line_items: validLines, due_days: dueDays }),
    });
    setSubmitting(false);
    if (res.ok) { onCreated(); onClose(); }
  }

  if (!open) return null;

  const total = lines.reduce((s, l) => s + (l.amount_cents ?? 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-[#0d1623] border border-[#1c2a3a] rounded-2xl w-full max-w-xl mx-4 p-6"
      >
        <h2 className="text-[18px] font-bold text-[#e8f0fe] mb-5">Generate Invoice</h2>

        <div className="flex flex-col gap-3 mb-4">
          {lines.map((l, i) => (
            <div key={i} className="grid grid-cols-[1fr_80px_100px_28px] gap-2 items-center">
              <input
                value={l.description ?? ''}
                onChange={e => updateLine(i, 'description', e.target.value)}
                placeholder="Description"
                className="h-9 px-3 bg-[#111927] border border-[#1c2a3a] rounded-lg text-[12px] text-[#e8f0fe] placeholder-[#3d5068] focus:outline-none"
              />
              <input
                type="number" min={1}
                value={l.quantity ?? 1}
                onChange={e => updateLine(i, 'quantity', Number(e.target.value))}
                placeholder="Qty"
                className="h-9 px-2 bg-[#111927] border border-[#1c2a3a] rounded-lg text-[12px] text-[#e8f0fe] focus:outline-none text-center"
              />
              <input
                type="number" min={0}
                value={(l.unit_price_cents ?? 0) / 100}
                onChange={e => updateLine(i, 'unit_price_cents', Math.round(Number(e.target.value) * 100))}
                placeholder="Unit $"
                className="h-9 px-2 bg-[#111927] border border-[#1c2a3a] rounded-lg text-[12px] text-[#e8f0fe] focus:outline-none"
              />
              <button onClick={() => setLines(p => p.filter((_, idx) => idx !== i))}
                className="text-[#3d5068] hover:text-[#f87171] transition-colors text-lg leading-none">×</button>
            </div>
          ))}
          <button
            onClick={() => setLines(p => [...p, { description: '', quantity: 1, unit_price_cents: 0, category: 'subscription' }])}
            className="text-[12px] text-accent hover:text-accent-dark transition-colors text-left"
          >
            + Add line item
          </button>
        </div>

        <div className="flex items-center gap-3 mb-5">
          <label className="text-[12px] text-[#7a8fa8]">Due in</label>
          <select value={dueDays} onChange={e => setDueDays(Number(e.target.value))}
            className="h-9 px-3 bg-[#111927] border border-[#1c2a3a] rounded-lg text-[12px] text-[#e8f0fe] focus:outline-none">
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
            <option value={60}>60 days</option>
            <option value={90}>90 days</option>
          </select>
          <div className="ml-auto text-[14px] font-bold text-accent">{fmt(total)}</div>
        </div>

        <div className="flex gap-2">
          <button onClick={submit} disabled={submitting}
            className="flex items-center gap-2 h-9 px-5 bg-accent text-[#060a0e] rounded-xl text-[13px] font-bold disabled:opacity-60">
            {submitting ? <Loader2 size={13} strokeWidth={2} className="animate-spin" /> : null}
            Create Invoice
          </button>
          <button onClick={onClose} className="h-9 px-4 text-[#7a8fa8] text-[13px] hover:text-[#e8f0fe] transition-colors">
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function RevenuePage() {
  const [records, setRecords] = useState<DbRevenueRecord[]>([]);
  const [invoices, setInvoices] = useState<DbInvoice[]>([]);
  const [summary, setSummary] = useState<{
    total_revenue_cents: number;
    mrr_cents: number;
    arr_cents: number;
    by_category: Record<string, number>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'records' | 'invoices'>('records');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (categoryFilter !== 'all') params.set('category', categoryFilter);

    const [revRes, invRes] = await Promise.all([
      fetch(`/api/revenue?${params}`),
      fetch('/api/revenue/invoices'),
    ]);

    if (revRes.ok) {
      const json = await revRes.json();
      setRecords(json.records ?? []);
      setSummary(json.summary);
    }
    if (invRes.ok) {
      const json = await invRes.json();
      setInvoices(json.invoices ?? []);
    }
    setLoading(false);
  }, [categoryFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const SUMMARY_CARDS = [
    { label: 'Total Revenue', value: fmt(summary?.total_revenue_cents ?? 0), icon: DollarSign, color: 'text-accent', bg: 'bg-accent-light' },
    { label: 'Monthly Revenue', value: fmt(summary?.mrr_cents ?? 0), icon: Calendar, color: 'text-[#6D5DFD]', bg: 'bg-[#001a22]' },
    { label: 'Annual Revenue', value: fmt(summary?.arr_cents ?? 0), icon: TrendingUp, color: 'text-[#818cf8]', bg: 'bg-[#0f0f2a]' },
    { label: 'Open Invoices', value: invoices.filter(i => i.status === 'open').length, icon: FileText, color: 'text-[#fbbf24]', bg: 'bg-[#2a1a00]' },
  ];

  const categories = Object.keys(CATEGORY_CONFIG) as RevenueCategory[];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[28px] font-bold text-[#e8f0fe]">Revenue Manager</h1>
          <p className="text-[#7a8fa8] text-sm mt-0.5">
            Revenue tracking, billing, outcome attribution, and invoicing
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadData}
            className="flex items-center gap-2 h-10 px-4 bg-[#111927] border border-[#1c2a3a] text-[#7a8fa8] rounded-xl text-sm hover:text-[#e8f0fe] transition-colors">
            <RefreshCw size={14} strokeWidth={2} /> Refresh
          </button>
          <button onClick={() => setShowInvoiceModal(true)}
            className="flex items-center gap-2 h-10 px-5 bg-accent text-[#060a0e] rounded-xl text-sm font-bold shadow-[0_4px_16px_rgba(0,230,118,0.3)]">
            <Plus size={15} strokeWidth={2.5} /> New Invoice
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {SUMMARY_CARDS.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-[#111927] border border-[#1c2a3a] rounded-2xl p-5">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-4', bg)}>
              <Icon size={20} className={color} strokeWidth={2} />
            </div>
            <p className={cn('text-[24px] font-bold', color)}>{value}</p>
            <p className="text-[#7a8fa8] text-[13px] font-medium mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Revenue by category */}
      <div className="bg-[#111927] border border-[#1c2a3a] rounded-2xl p-5 mb-6">
        <p className="text-[13px] font-bold text-[#e8f0fe] mb-4">Revenue by Category</p>
        <div className="flex flex-col gap-3">
          {categories.map(cat => {
            const cfg = CATEGORY_CONFIG[cat];
            const Icon = cfg.icon;
            const amount = summary?.by_category?.[cat] ?? 0;
            const total = summary?.total_revenue_cents ?? 1;
            const pct = total > 0 ? (amount / total) * 100 : 0;
            return (
              <div key={cat} className="flex items-center gap-3">
                <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', cfg.bg)}>
                  <Icon size={13} className={cfg.color} strokeWidth={2} />
                </div>
                <span className="text-[12px] text-[#7a8fa8] w-32 flex-shrink-0">{cfg.label}</span>
                <div className="flex-1 h-2 bg-[#162030] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.7, ease: 'easeOut' as const }}
                    className={cn('h-full rounded-full', cfg.bg.replace('bg-', 'bg-').replace('-light', ''))}
                    style={{ backgroundColor: undefined }}
                  >
                    <div className={cn('w-full h-full', cfg.color.replace('text-', 'bg-'))} />
                  </motion.div>
                </div>
                <span className={cn('text-[12px] font-bold w-20 text-right', cfg.color)}>{fmt(amount)}</span>
                <span className="text-[11px] text-[#3d5068] w-10 text-right">{pct.toFixed(0)}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs: Records / Invoices */}
      <div className="flex gap-1 mb-4">
        {(['records', 'invoices'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2 rounded-lg text-[13px] font-semibold transition-all capitalize',
              activeTab === tab
                ? 'bg-accent/10 text-accent border border-accent/25'
                : 'text-[#7a8fa8] hover:text-[#e8f0fe]'
            )}>
            {tab}
            <span className="ml-1 text-[#3d5068]">
              ({tab === 'records' ? records.length : invoices.length})
            </span>
          </button>
        ))}

        {activeTab === 'records' && (
          <div className="ml-auto flex gap-1">
            <button
              onClick={() => setCategoryFilter('all')}
              className={cn('px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all',
                categoryFilter === 'all' ? 'bg-[#1c2a3a] text-[#e8f0fe]' : 'text-[#7a8fa8] hover:text-[#e8f0fe]'
              )}>
              All
            </button>
            {categories.map(cat => (
              <button key={cat}
                onClick={() => setCategoryFilter(cat === categoryFilter ? 'all' : cat)}
                className={cn('px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all',
                  categoryFilter === cat
                    ? cn(CATEGORY_CONFIG[cat].bg, CATEGORY_CONFIG[cat].color)
                    : 'text-[#7a8fa8] hover:text-[#e8f0fe]'
                )}>
                {CATEGORY_CONFIG[cat].label}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-16 flex justify-center">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : activeTab === 'records' ? (
        /* Revenue records table */
        <div className="bg-[#111927] border border-[#1c2a3a] rounded-2xl overflow-hidden">
          {records.length === 0 ? (
            <div className="py-16 text-center">
              <DollarSign size={32} className="text-[#3d5068] mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-[#7a8fa8] font-medium">No revenue records</p>
              <p className="text-[#3d5068] text-sm mt-1">Revenue is automatically recorded on escrow releases, subscriptions, and manual entries.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#1c2a3a]">
              {/* Header */}
              <div className="grid grid-cols-[140px_1fr_100px_120px] gap-4 px-5 py-3 text-[10px] font-bold text-[#3d5068] uppercase tracking-wider">
                <span>Category</span>
                <span>Description</span>
                <span className="text-right">Amount</span>
                <span className="text-right">Date</span>
              </div>
              {records.map(r => {
                const cfg = CATEGORY_CONFIG[r.category as RevenueCategory] ?? CATEGORY_CONFIG.subscription;
                const Icon = cfg.icon;
                return (
                  <div key={r.id} className="grid grid-cols-[140px_1fr_100px_120px] gap-4 px-5 py-3 hover:bg-[#162030] transition-colors items-center">
                    <div className="flex items-center gap-2">
                      <div className={cn('w-6 h-6 rounded-md flex items-center justify-center', cfg.bg)}>
                        <Icon size={11} className={cfg.color} strokeWidth={2} />
                      </div>
                      <span className={cn('text-[11px] font-semibold', cfg.color)}>{cfg.label}</span>
                    </div>
                    <p className="text-[12px] text-[#7a8fa8] truncate">{r.description || '—'}</p>
                    <p className="text-[13px] font-bold text-accent text-right">{fmt(r.amount_cents, r.currency)}</p>
                    <p className="text-[11px] text-[#3d5068] text-right">
                      {new Date(r.recognized_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Invoices */
        <div className="flex flex-col gap-3">
          {invoices.length === 0 ? (
            <div className="py-16 text-center bg-[#111927] border border-[#1c2a3a] rounded-2xl">
              <FileText size={32} className="text-[#3d5068] mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-[#7a8fa8] font-medium">No invoices yet</p>
              <button onClick={() => setShowInvoiceModal(true)}
                className="mt-3 h-9 px-5 bg-accent text-[#060a0e] rounded-xl text-[13px] font-bold">
                Create First Invoice
              </button>
            </div>
          ) : invoices.map(inv => {
            const cfg = INVOICE_STATUS_CONFIG[inv.status];
            const Icon = cfg.icon;
            return (
              <div key={inv.id} className="bg-[#111927] border border-[#1c2a3a] rounded-2xl p-4 flex items-center gap-4">
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', cfg.bg)}>
                  <Icon size={16} className={cfg.color} strokeWidth={1.8} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold text-[#e8f0fe]">{inv.invoice_number}</p>
                  <p className="text-[11px] text-[#7a8fa8] mt-0.5">
                    Issued {new Date(inv.issued_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {inv.due_at && <> · Due {new Date(inv.due_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[18px] font-bold text-accent">{fmt(inv.amount_cents, inv.currency)}</p>
                  <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', cfg.bg, cfg.color)}>{cfg.label}</span>
                </div>
                <button className="flex items-center gap-1 h-8 px-3 bg-[#162030] text-[#7a8fa8] rounded-lg text-[11px] hover:text-[#e8f0fe] transition-colors">
                  <Download size={11} strokeWidth={2} /> Export
                </button>
              </div>
            );
          })}
        </div>
      )}

      <InvoiceModal open={showInvoiceModal} onClose={() => setShowInvoiceModal(false)} onCreated={loadData} />
    </div>
  );
}
