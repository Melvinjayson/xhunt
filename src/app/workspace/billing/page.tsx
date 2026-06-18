'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard, TrendingUp, FileText, ArrowUpRight, Download,
  Sparkles, Users, Zap, Check, ChevronRight, BarChart3, DollarSign,
  Calendar, Shield
} from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/context';
import { cn } from '@/lib/cn';
import { t } from '@/theme/colors';
import type { DbRevenueRecord, DbInvoice } from '@/lib/supabase/types';

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg', className)} style={{ backgroundColor: t.panel }} />;
}

const INVOICE_STATUS = {
  draft:         { label: 'Draft',    color: t.txtFaint,  bg: 'rgba(74,85,120,0.1)'   },
  open:          { label: 'Open',     color: t.warning,   bg: 'rgba(255,184,77,0.1)'  },
  paid:          { label: 'Paid',     color: t.accent,    bg: 'rgba(34,255,170,0.1)'  },
  void:          { label: 'Void',     color: t.txtDim,    bg: 'rgba(139,156,192,0.1)' },
  uncollectible: { label: 'Overdue',  color: t.error,     bg: 'rgba(255,92,122,0.1)'  },
};

const PLANS = [
  {
    id: 'starter', name: 'Starter', price: '$0', period: 'forever',
    features: ['5 missions', '50 participants', '1 admin seat', 'Basic analytics'],
    cta: 'Current Plan',
  },
  {
    id: 'growth', name: 'Growth', price: '$299', period: '/mo',
    features: ['Unlimited missions', '1,000 participants', '5 admin seats', 'Advanced analytics', 'AI Agents (100 req/day)', 'Priority support'],
    cta: 'Upgrade to Growth',
    highlight: true,
  },
  {
    id: 'enterprise', name: 'Enterprise', price: 'Custom', period: '',
    features: ['Unlimited everything', 'Unlimited participants', 'Unlimited seats', 'Custom AI credits', 'SSO + SCIM', 'Dedicated success manager', 'SLA guarantee'],
    cta: 'Contact Sales',
  },
];

export default function BillingPage() {
  const [revenues, setRevenues] = useState<DbRevenueRecord[]>([]);
  const [invoices, setInvoices] = useState<DbInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPlan, setCurrentPlan] = useState<string>('starter');
  const [totalUsers, setTotalUsers] = useState(0);
  const { user, isLoaded } = useAuth();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      if (!isLoaded || !user) return;
      const { data: profile } = await supabase.from('user_profiles').select('tenant_id').eq('id', user.id).single();
      if (!profile?.tenant_id) { setLoading(false); return; }

      const [tenantRes, revenueRes, invoiceRes, usersRes] = await Promise.all([
        supabase.from('tenants').select('plan').eq('id', profile.tenant_id).single(),
        supabase.from('revenue_records').select('*').eq('tenant_id', profile.tenant_id).order('recognized_at', { ascending: false }).limit(20),
        supabase.from('invoices').select('*').eq('tenant_id', profile.tenant_id).order('issued_at', { ascending: false }).limit(10),
        supabase.from('user_profiles').select('id', { count: 'exact' }).eq('tenant_id', profile.tenant_id),
      ]);

      setCurrentPlan(tenantRes.data?.plan ?? 'starter');
      setRevenues(revenueRes.data ?? []);
      setInvoices(invoiceRes.data ?? []);
      setTotalUsers(usersRes.count ?? 0);
      setLoading(false);
    }
    load();
  }, [supabase, user, isLoaded]);

  const totalRevenue = revenues.reduce((s, r) => s + r.amount_cents, 0) / 100;
  const thisMonthRevenue = revenues
    .filter((r) => new Date(r.recognized_at).getMonth() === new Date().getMonth())
    .reduce((s, r) => s + r.amount_cents, 0) / 100;

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-8 w-56" />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <Skeleton className="h-60 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(34,255,170,0.08)', border: `1px solid rgba(34,255,170,0.15)` }}>
            <CreditCard size={18} strokeWidth={1.8} style={{ color: t.accent }} />
          </div>
          <div>
            <h1 className="text-[22px] font-bold" style={{ color: t.txt }}>Billing & Usage</h1>
            <p className="text-[12px]" style={{ color: t.txtFaint }}>
              Current plan: <span className="font-semibold capitalize" style={{ color: t.accent }}>{currentPlan}</span>
            </p>
          </div>
        </div>
        <Link href="/admin/revenue">
          <button className="flex items-center gap-2 h-9 px-4 rounded-xl font-medium text-[13px] transition-colors" style={{ backgroundColor: t.card, border: `1px solid #162440`, color: t.txt }}>
            <DollarSign size={13} strokeWidth={2} />
            Revenue Dashboard
          </button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Revenue This Month', value: `$${thisMonthRevenue.toFixed(2)}`, icon: TrendingUp, color: t.accent,   bg: 'rgba(34,255,170,0.08)',  trend: 18 },
          { label: 'Total Revenue',      value: `$${totalRevenue.toFixed(2)}`,     icon: DollarSign, color: t.ai,       bg: 'rgba(109,93,253,0.1)',   trend: 12 },
          { label: 'Active Seats',       value: totalUsers,                         icon: Users,      color: t.warning,  bg: 'rgba(255,184,77,0.1)',   trend: 5  },
        ].map(({ label, value, icon: Icon, color, bg, trend }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl p-5"
            style={{ backgroundColor: t.card, border: `1px solid ${t.panel}` }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: bg }}>
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

      {/* Plan Comparison */}
      <div>
        <p className="text-[13px] font-bold mb-4" style={{ color: t.txt }}>Plans</p>
        <div className="grid grid-cols-3 gap-4">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="rounded-2xl p-5 relative"
              style={{
                backgroundColor: t.card,
                border: plan.highlight ? `1px solid rgba(34,255,170,0.3)` : `1px solid ${t.panel}`,
                boxShadow: currentPlan === plan.id ? `0 0 0 1px rgba(34,255,170,0.2)` : undefined,
              }}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 text-[10px] font-bold rounded-full" style={{ backgroundColor: t.accent, color: '#060a0e' }}>
                  RECOMMENDED
                </div>
              )}
              {currentPlan === plan.id && (
                <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(34,255,170,0.1)', border: `1px solid rgba(34,255,170,0.2)` }}>
                  <div className="w-1 h-1 rounded-full breathe" style={{ backgroundColor: t.accent }} />
                  <span className="text-[9px] font-bold" style={{ color: t.accent }}>Active</span>
                </div>
              )}

              <div className="mb-4">
                <p className="text-[16px] font-bold" style={{ color: t.txt }}>{plan.name}</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-[28px] font-bold" style={{ color: t.txt }}>{plan.price}</span>
                  {plan.period && <span className="text-[13px]" style={{ color: t.txtFaint }}>{plan.period}</span>}
                </div>
              </div>

              <ul className="space-y-2 mb-5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-[12px]" style={{ color: t.txtDim }}>
                    <Check size={12} className="flex-shrink-0" strokeWidth={2.5} style={{ color: t.accent }} />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                disabled={currentPlan === plan.id}
                className="w-full h-9 rounded-xl text-[12px] font-semibold transition-all"
                style={currentPlan === plan.id
                  ? { backgroundColor: t.surface, border: `1px solid ${t.panel}`, color: t.txtFaint, cursor: 'default' }
                  : plan.highlight
                    ? { backgroundColor: t.accent, color: '#060a0e', boxShadow: '0 4px 16px rgba(34,255,170,0.25)' }
                    : { backgroundColor: t.panel, border: `1px solid #162440`, color: t.txt }
                }
              >
                {currentPlan === plan.id ? 'Current Plan' : plan.cta}
              </button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Invoices */}
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: t.card, border: `1px solid ${t.panel}` }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: t.panel }}>
          <div className="flex items-center gap-2">
            <FileText size={14} strokeWidth={2} style={{ color: t.ai }} />
            <p className="text-[13px] font-bold" style={{ color: t.txt }}>Invoices</p>
          </div>
        </div>
        {invoices.length === 0 ? (
          <div className="py-12 text-center">
            <FileText size={24} className="mx-auto mb-2" strokeWidth={1.5} style={{ color: t.txtFaint }} />
            <p className="font-medium" style={{ color: t.txtDim }}>No invoices yet</p>
            <p className="text-sm mt-1" style={{ color: t.txtFaint }}>Your billing history will appear here.</p>
          </div>
        ) : (
          <>
            <div className="grid px-5 py-3 border-b"
              style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr 80px', borderColor: t.panel, backgroundColor: t.surface }}>
              {['Invoice', 'Amount', 'Status', 'Issued', ''].map((h) => (
                <p key={h} className="text-[10px] font-bold uppercase tracking-wider" style={{ color: t.txtFaint }}>{h}</p>
              ))}
            </div>
            <div className="divide-y" style={{ borderColor: t.panel }}>
              {invoices.map((inv) => {
                const sc = INVOICE_STATUS[inv.status] ?? INVOICE_STATUS.draft;
                return (
                  <div key={inv.id} className="grid px-5 py-4 items-center transition-colors"
                    style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr 80px' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = t.panel)}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}>
                    <p className="text-[12px] font-semibold" style={{ color: t.txt }}>{inv.invoice_number}</p>
                    <p className="text-[13px] font-bold tabular-nums" style={{ color: t.txt }}>
                      ${(inv.amount_cents / 100).toFixed(2)}
                    </p>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full w-fit" style={{ color: sc.color, backgroundColor: sc.bg }}>{sc.label}</span>
                    <p className="text-[11px]" style={{ color: t.txtFaint }}>
                      {new Date(inv.issued_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    <button className="flex items-center gap-1 text-[11px] font-medium transition-colors" style={{ color: t.txtDim }}>
                      <Download size={11} strokeWidth={2} />PDF
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
