'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck, Clock, CheckCircle2, XCircle, AlertCircle,
  FileText, User, Calendar, ChevronDown, ChevronUp
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { DbMissionApproval, DbAuditLog, DbMission } from '@/lib/supabase/types';
import { cn } from '@/lib/cn';

interface ApprovalWithMission extends DbMissionApproval {
  mission?: DbMission;
}

const STATUS_CONFIG = {
  pending:  { label: 'Pending',  color: 'text-[#fbbf24] bg-[#2a1a00]', icon: Clock },
  approved: { label: 'Approved', color: 'text-accent bg-accent-light',  icon: CheckCircle2 },
  rejected: { label: 'Rejected', color: 'text-[#ff5252] bg-[#2a0a0a]', icon: XCircle },
};

const ACTION_COLORS: Record<string, string> = {
  'mission.create':   'text-accent',
  'mission.update':   'text-[#22d3ee]',
  'mission.delete':   'text-[#ff5252]',
  'mission.publish':  'text-[#fbbf24]',
  'approval.approve': 'text-accent',
  'approval.reject':  'text-[#ff5252]',
  'user.role_change': 'text-[#818cf8]',
};

export default function AdminGovernancePage() {
  const [approvals, setApprovals] = useState<ApprovalWithMission[]>([]);
  const [auditLogs, setAuditLogs] = useState<DbAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [noteMap, setNoteMap] = useState<Record<string, string>>({});
  const [expandedNote, setExpandedNote] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'approvals' | 'audit'>('approvals');

  const supabase = createClient();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from('user_profiles').select('tenant_id').eq('id', user.id).single();
    if (!profile?.tenant_id) return;

    const [approvalsRes, auditRes] = await Promise.all([
      supabase.from('mission_approvals').select('*').eq('tenant_id', profile.tenant_id).order('created_at', { ascending: false }),
      supabase.from('audit_log').select('*').eq('tenant_id', profile.tenant_id).order('created_at', { ascending: false }).limit(50),
    ]);

    const rawApprovals: DbMissionApproval[] = approvalsRes.data ?? [];

    // Hydrate mission titles
    const missionIds = [...new Set(rawApprovals.map((a) => a.mission_id))];
    let missionMap: Record<string, DbMission> = {};
    if (missionIds.length > 0) {
      const { data: missions } = await supabase.from('missions').select('*').in('id', missionIds);
      missionMap = Object.fromEntries((missions ?? []).map((m) => [m.id, m]));
    }

    setApprovals(rawApprovals.map((a) => ({ ...a, mission: missionMap[a.mission_id] })));
    setAuditLogs(auditRes.data ?? []);
    setLoading(false);
  }

  async function processApproval(id: string, status: 'approved' | 'rejected') {
    setProcessingId(id);
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('mission_approvals').update({
      status,
      reviewer_id: user?.id ?? null,
      notes: noteMap[id] ?? null,
    }).eq('id', id);

    // If approved, publish the mission
    if (status === 'approved') {
      const approval = approvals.find((a) => a.id === id);
      if (approval) {
        await supabase.from('missions').update({ status: 'published' }).eq('id', approval.mission_id);
        // Write audit log
        const { data: profile } = await supabase.from('user_profiles').select('tenant_id').eq('id', user?.id ?? '').single();
        if (profile?.tenant_id) {
          await supabase.from('audit_log').insert({
            tenant_id: profile.tenant_id,
            user_id: user?.id,
            action: 'approval.approve',
            resource_type: 'mission',
            resource_id: approval.mission_id,
            metadata: { approval_id: id },
          });
        }
      }
    }

    setApprovals((prev) => prev.map((a) => a.id === id ? { ...a, status } : a));
    setProcessingId(null);
    setExpandedNote(null);
  }

  const pending = approvals.filter((a) => a.status === 'pending');
  const resolved = approvals.filter((a) => a.status !== 'pending');

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-[28px] font-bold text-[#e8f0fe]">Governance</h1>
        <p className="text-[#7a8fa8] text-sm mt-0.5">Mission approvals, permissions, and audit trail</p>
      </div>

      {/* Stat chips */}
      <div className="flex gap-3 mb-8">
        {[
          { label: 'Pending Review', value: pending.length, color: 'text-[#fbbf24] bg-[#2a1a00]' },
          { label: 'Approved',       value: approvals.filter((a) => a.status === 'approved').length, color: 'text-accent bg-accent-light' },
          { label: 'Rejected',       value: approvals.filter((a) => a.status === 'rejected').length, color: 'text-[#ff5252] bg-[#2a0a0a]' },
          { label: 'Audit Events',   value: auditLogs.length, color: 'text-[#22d3ee] bg-[#001a22]' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-[#111927] border border-[#1c2a3a] rounded-xl px-5 py-4">
            <p className={cn('text-[22px] font-bold', color.split(' ')[0])}>{value}</p>
            <p className="text-[11px] text-[#7a8fa8] font-medium mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2 mb-6">
        {(['approvals', 'audit'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 h-9 rounded-xl text-[13px] font-semibold transition-all capitalize',
              activeTab === tab ? 'bg-accent text-[#060a0e]' : 'bg-[#111927] text-[#7a8fa8] border border-[#1c2a3a] hover:border-[#2a3f58]'
            )}
          >
            {tab === 'approvals' ? `Approvals (${pending.length} pending)` : 'Audit Log'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-24 flex justify-center">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : activeTab === 'approvals' ? (
        <div className="flex flex-col gap-4">
          {pending.length === 0 && resolved.length === 0 ? (
            <div className="py-24 text-center bg-[#111927] border border-[#1c2a3a] rounded-2xl">
              <ShieldCheck size={36} className="text-[#3d5068] mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-[#7a8fa8] font-medium">No approval requests</p>
              <p className="text-[#3d5068] text-sm mt-1">Missions submitted for review will appear here.</p>
            </div>
          ) : (
            <>
              {/* Pending */}
              {pending.length > 0 && (
                <>
                  <h2 className="text-[13px] font-bold text-[#3d5068] uppercase tracking-wider">Needs Review ({pending.length})</h2>
                  {pending.map((a) => (
                    <ApprovalCard
                      key={a.id}
                      approval={a}
                      processing={processingId === a.id}
                      note={noteMap[a.id] ?? ''}
                      setNote={(v) => setNoteMap((p) => ({ ...p, [a.id]: v }))}
                      expanded={expandedNote === a.id}
                      toggleExpand={() => setExpandedNote(expandedNote === a.id ? null : a.id)}
                      onApprove={() => processApproval(a.id, 'approved')}
                      onReject={() => processApproval(a.id, 'rejected')}
                    />
                  ))}
                </>
              )}

              {/* Resolved */}
              {resolved.length > 0 && (
                <>
                  <h2 className="text-[13px] font-bold text-[#3d5068] uppercase tracking-wider mt-4">Resolved ({resolved.length})</h2>
                  {resolved.map((a) => (
                    <ApprovalCard key={a.id} approval={a} processing={false} readOnly />
                  ))}
                </>
              )}
            </>
          )}
        </div>
      ) : (
        /* Audit log */
        <div className="bg-[#111927] border border-[#1c2a3a] rounded-2xl overflow-hidden">
          <div className="grid grid-cols-[180px_1fr_120px_140px] gap-4 px-6 py-3 border-b border-[#1c2a3a]">
            {['Action', 'Resource', 'Type', 'Time'].map((h) => (
              <span key={h} className="text-[11px] font-bold text-[#3d5068] uppercase tracking-wider">{h}</span>
            ))}
          </div>
          {auditLogs.length === 0 ? (
            <div className="py-16 text-center">
              <FileText size={32} className="text-[#3d5068] mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-[#7a8fa8]">No audit events yet</p>
            </div>
          ) : (
            <div className="divide-y divide-[#1c2a3a]">
              {auditLogs.map((log) => (
                <div key={log.id} className="grid grid-cols-[180px_1fr_120px_140px] gap-4 items-center px-6 py-3 hover:bg-[#162030] transition-colors">
                  <span className={cn('text-[13px] font-semibold font-mono', ACTION_COLORS[log.action] ?? 'text-[#7a8fa8]')}>
                    {log.action}
                  </span>
                  <span className="text-[13px] text-[#e8f0fe] truncate">{log.resource_id ?? '—'}</span>
                  <span className="text-[11px] text-[#7a8fa8] bg-[#162030] px-2 py-0.5 rounded-full self-start capitalize">{log.resource_type}</span>
                  <span className="text-[12px] text-[#7a8fa8]">
                    {new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ApprovalCard({
  approval,
  processing,
  readOnly,
  note = '',
  setNote,
  expanded,
  toggleExpand,
  onApprove,
  onReject,
}: {
  approval: ApprovalWithMission;
  processing: boolean;
  readOnly?: boolean;
  note?: string;
  setNote?: (v: string) => void;
  expanded?: boolean;
  toggleExpand?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
}) {
  const cfg = STATUS_CONFIG[approval.status];
  const StatusIcon = cfg.icon;

  return (
    <div className="bg-[#111927] border border-[#1c2a3a] rounded-2xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-[15px] font-bold text-[#e8f0fe]">{approval.mission?.title ?? 'Unknown Mission'}</p>
          <p className="text-[12px] text-[#7a8fa8] mt-0.5">
            Submitted {new Date(approval.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <span className={cn('flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full', cfg.color)}>
          <StatusIcon size={11} strokeWidth={2.5} /> {cfg.label}
        </span>
      </div>

      {approval.mission && (
        <div className="flex gap-2 mb-3">
          <span className={cn(
            'text-[10px] font-bold px-2 py-0.5 rounded-full',
            approval.mission.difficulty === 'easy' ? 'text-accent bg-accent-light'
            : approval.mission.difficulty === 'medium' ? 'text-[#fbbf24] bg-[#2a1a00]'
            : 'text-[#ff5252] bg-[#2a0a0a]'
          )}>
            {approval.mission.difficulty}
          </span>
          <span className="text-[10px] text-[#3d5068] bg-[#162030] px-2 py-0.5 rounded-full">
            {(approval.mission.steps as unknown[]).length} steps
          </span>
          {approval.mission.estimated_time && (
            <span className="text-[10px] text-[#3d5068] bg-[#162030] px-2 py-0.5 rounded-full">
              {approval.mission.estimated_time}
            </span>
          )}
        </div>
      )}

      {approval.notes && (
        <p className="text-[12px] text-[#7a8fa8] bg-[#0f1824] rounded-lg px-3 py-2 mb-3 italic">
          "{approval.notes}"
        </p>
      )}

      {!readOnly && approval.status === 'pending' && (
        <div className="flex flex-col gap-3 pt-2 border-t border-[#1c2a3a]">
          <button
            onClick={toggleExpand}
            className="flex items-center gap-1.5 text-[12px] text-[#7a8fa8] hover:text-[#e8f0fe] transition-colors self-start"
          >
            {expanded ? <ChevronUp size={13} strokeWidth={2} /> : <ChevronDown size={13} strokeWidth={2} />}
            {expanded ? 'Hide note' : 'Add reviewer note'}
          </button>

          {expanded && (
            <textarea
              value={note}
              onChange={(e) => setNote?.(e.target.value)}
              placeholder="Optional note for the mission creator…"
              rows={2}
              className="w-full bg-[#0f1824] border border-[#1c2a3a] rounded-xl px-4 py-3 text-[#e8f0fe] placeholder-[#3d5068] text-[13px] focus:outline-none focus:border-accent resize-none transition-colors"
            />
          )}

          <div className="flex gap-2">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onApprove}
              disabled={processing}
              className="flex items-center gap-2 h-9 px-4 bg-accent text-[#060a0e] rounded-xl font-semibold text-[13px] disabled:opacity-60 shadow-[0_4px_12px_rgba(0,230,118,0.3)]"
            >
              <CheckCircle2 size={13} strokeWidth={2.5} /> Approve & Publish
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onReject}
              disabled={processing}
              className="flex items-center gap-2 h-9 px-4 bg-[#2a0a0a] border border-[#ff5252]/30 text-[#ff5252] rounded-xl font-semibold text-[13px] disabled:opacity-60"
            >
              <XCircle size={13} strokeWidth={2.5} /> Reject
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
}
