'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck, FileCheck, Clock, CheckCircle2, XCircle, AlertTriangle,
  Eye, ChevronRight, Users, Activity, Lock, Filter, Search,
  ScrollText, MoreHorizontal
} from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/context';
import { cn } from '@/lib/cn';
import { t } from '@/theme/colors';
import type { DbMissionApproval, DbAuditLog } from '@/lib/supabase/types';

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg', className)} style={{ backgroundColor: t.panel }} />;
}

const APPROVAL_CONFIG = {
  pending:  { label: 'Pending',  color: t.warning, icon: Clock },
  approved: { label: 'Approved', color: t.accent,  icon: CheckCircle2 },
  rejected: { label: 'Rejected', color: t.error,   icon: XCircle },
};

export default function GovernancePage() {
  const [approvals, setApprovals] = useState<DbMissionApproval[]>([]);
  const [logs, setLogs] = useState<DbAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'approvals' | 'audit'>('approvals');
  const [search, setSearch] = useState('');
  const { user, isLoaded } = useAuth();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      if (!isLoaded || !user) return;
      const { data: profile } = await supabase.from('user_profiles').select('tenant_id').eq('id', user.id).single();
      if (!profile?.tenant_id) { setLoading(false); return; }

      const [approvalsRes, logsRes] = await Promise.all([
        supabase.from('mission_approvals').select('*').eq('tenant_id', profile.tenant_id).order('created_at', { ascending: false }).limit(30),
        supabase.from('audit_logs').select('*').eq('tenant_id', profile.tenant_id).order('created_at', { ascending: false }).limit(50),
      ]);

      setApprovals(approvalsRes.data ?? []);
      setLogs(logsRes.data ?? []);
      setLoading(false);
    }
    load();
  }, [supabase, user, isLoaded]);

  async function reviewApproval(id: string, status: 'approved' | 'rejected') {
    await supabase.from('mission_approvals').update({ status, reviewer_id: user?.id }).eq('id', id);
    setApprovals((prev) => prev.map((a) => a.id === id ? { ...a, status } : a));
  }

  const pending = approvals.filter((a) => a.status === 'pending').length;
  const approved = approvals.filter((a) => a.status === 'approved').length;
  const rejected = approvals.filter((a) => a.status === 'rejected').length;

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
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(255,92,122,0.1)', border: `1px solid rgba(255,92,122,0.2)` }}>
            <ShieldCheck size={18} strokeWidth={1.8} style={{ color: t.error }} />
          </div>
          <div>
            <h1 className="text-[22px] font-bold" style={{ color: t.txt }}>Governance Center</h1>
            <p className="text-[12px]" style={{ color: t.txtFaint }}>Approvals, audit logs, and compliance</p>
          </div>
        </div>
        {pending > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ backgroundColor: 'rgba(255,184,77,0.1)', border: `1px solid rgba(255,184,77,0.2)` }}>
            <AlertTriangle size={13} strokeWidth={2} style={{ color: t.warning }} />
            <span className="text-[12px] font-semibold" style={{ color: t.warning }}>{pending} pending review</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pending Review', value: pending,  icon: Clock,        color: t.warning, bg: 'rgba(255,184,77,0.1)'  },
          { label: 'Approved',       value: approved, icon: CheckCircle2, color: t.accent,  bg: 'rgba(34,255,170,0.08)' },
          { label: 'Rejected',       value: rejected, icon: XCircle,      color: t.error,   bg: 'rgba(255,92,122,0.1)'  },
        ].map(({ label, value, icon: Icon, color, bg }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl p-5"
            style={{ backgroundColor: t.card, border: `1px solid ${t.panel}` }}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: bg }}>
              <Icon size={16} strokeWidth={1.8} style={{ color }} />
            </div>
            <p className="text-2xl font-bold tabular-nums" style={{ color }}>{value}</p>
            <p className="text-[11px] mt-0.5 font-medium" style={{ color: t.txtFaint }}>{label}</p>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-xl p-1 w-fit" style={{ backgroundColor: t.card, border: `1px solid ${t.panel}` }}>
        {([['approvals', 'Mission Approvals', pending], ['audit', 'Audit Log', logs.length]] as [string, string, number][]).map(([tab, label, count]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as typeof activeTab)}
            className="h-7 px-4 rounded-lg text-[12px] font-semibold transition-all"
            style={activeTab === tab ? { backgroundColor: t.panel, color: t.txt } : { color: t.txtFaint }}
          >
            {label}
            <span className="ml-1.5 text-[10px]" style={{ color: activeTab === tab ? t.accent : t.txtFaint }}>{count}</span>
          </button>
        ))}
      </div>

      {/* Approvals */}
      {activeTab === 'approvals' && (
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: t.card, border: `1px solid ${t.panel}` }}>
          {approvals.length === 0 ? (
            <div className="py-16 text-center">
              <FileCheck size={28} className="mx-auto mb-3" strokeWidth={1.5} style={{ color: t.txtFaint }} />
              <p className="font-medium" style={{ color: t.txtDim }}>No mission approvals</p>
              <p className="text-sm mt-1" style={{ color: t.txtFaint }}>Mission approval requests will appear here.</p>
            </div>
          ) : (
            <>
              <div className="grid px-5 py-3 border-b"
                style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 120px', borderColor: t.panel, backgroundColor: t.surface }}>
                {['Mission', 'Status', 'Reviewer', 'Submitted', 'Actions'].map((h) => (
                  <p key={h} className="text-[10px] font-bold uppercase tracking-wider" style={{ color: t.txtFaint }}>{h}</p>
                ))}
              </div>
              <div className="divide-y" style={{ borderColor: t.panel }}>
                {approvals.map((a) => {
                  const sc = APPROVAL_CONFIG[a.status];
                  return (
                    <div key={a.id} className="grid px-5 py-4 items-center transition-colors"
                      style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 120px' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = t.panel)}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}>
                      <div>
                        <p className="text-[12px] font-semibold truncate" style={{ color: t.txt }}>Mission #{a.mission_id.slice(0, 8)}</p>
                        {a.notes && <p className="text-[11px] truncate mt-0.5" style={{ color: t.txtFaint }}>{a.notes}</p>}
                      </div>
                      <span className="flex items-center gap-1.5 text-[11px] font-bold w-fit px-2 py-0.5 rounded-full" style={{ color: sc.color, backgroundColor: `${sc.color}1a` }}>
                        <sc.icon size={10} strokeWidth={2.5} />
                        {sc.label}
                      </span>
                      <p className="text-[11px]" style={{ color: t.txtFaint }}>{a.reviewer_id ? `#${a.reviewer_id.slice(0, 6)}` : '—'}</p>
                      <p className="text-[11px]" style={{ color: t.txtFaint }}>
                        {new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                      {a.status === 'pending' ? (
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => reviewApproval(a.id, 'approved')} className="flex items-center gap-1 h-7 px-2.5 rounded-lg text-[11px] font-bold transition-colors" style={{ backgroundColor: 'rgba(34,255,170,0.1)', border: `1px solid rgba(34,255,170,0.2)`, color: t.accent }}>
                            <CheckCircle2 size={11} strokeWidth={2.5} />Approve
                          </button>
                          <button onClick={() => reviewApproval(a.id, 'rejected')} className="flex items-center gap-1 h-7 px-2 rounded-lg text-[11px] font-bold" style={{ backgroundColor: 'rgba(255,92,122,0.1)', border: `1px solid rgba(255,92,122,0.2)`, color: t.error }}>
                            <XCircle size={11} strokeWidth={2.5} />
                          </button>
                        </div>
                      ) : (
                        <p className="text-[11px]" style={{ color: t.txtFaint }}>Reviewed</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Audit Log */}
      {activeTab === 'audit' && (
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: t.card, border: `1px solid ${t.panel}` }}>
          {logs.length === 0 ? (
            <div className="py-16 text-center">
              <ScrollText size={28} className="mx-auto mb-3" strokeWidth={1.5} style={{ color: t.txtFaint }} />
              <p className="font-medium" style={{ color: t.txtDim }}>No audit logs yet</p>
              <p className="text-sm mt-1" style={{ color: t.txtFaint }}>All platform actions will be logged here for compliance.</p>
            </div>
          ) : (
            <>
              <div className="grid px-5 py-3 border-b"
                style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr', borderColor: t.panel, backgroundColor: t.surface }}>
                {['Action', 'Resource', 'User', 'Timestamp'].map((h) => (
                  <p key={h} className="text-[10px] font-bold uppercase tracking-wider" style={{ color: t.txtFaint }}>{h}</p>
                ))}
              </div>
              <div className="divide-y max-h-[500px] overflow-y-auto" style={{ borderColor: t.panel }}>
                {logs.map((log) => (
                  <div key={log.id} className="grid px-5 py-3 items-center transition-colors"
                    style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = t.panel)}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: t.panel }}>
                        <Activity size={11} strokeWidth={2} style={{ color: t.ai }} />
                      </div>
                      <p className="text-[12px] font-medium capitalize truncate" style={{ color: t.txt }}>{log.action.replace('_', ' ')}</p>
                    </div>
                    <span className="text-[11px] capitalize" style={{ color: t.txtDim }}>{log.resource_type}</span>
                    <span className="text-[11px]" style={{ color: t.txtFaint }}>{log.user_id ? `#${log.user_id.slice(0, 8)}` : 'System'}</span>
                    <span className="text-[11px]" style={{ color: t.txtFaint }}>
                      {new Date(log.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
