'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Cpu, Bot, ShieldCheck, CheckCircle2, XCircle, AlertTriangle,
  Zap, Activity, RefreshCw, Play, ChevronRight, Clock
} from 'lucide-react';
import { cn } from '@/lib/cn';

interface AgentEntry {
  agent_id: string;
  name: string;
  category: string;
  purpose: string;
  primary_stakeholders: string[];
  financial_materiality_score: number;
  impact_materiality_score: number;
  requires_human_approval: boolean;
  is_active: boolean;
}

interface HealthData {
  recentEvaluations: { agent_id: string; composite_score: number; utility_score: number; trust_score: number }[];
  constitutionalHealth: {
    approvalRate: number | null;
    recentChecks: { verdict: string; constitutional_score: number; created_at: string }[];
    totalChecks: number;
  };
  routingMetrics: {
    recentCalls: { intelligence_function: string; processing_ms: number | null }[];
    avgProcessingMs: number | null;
  };
}

const CATEGORY_COLORS: Record<string, string> = {
  participant_intelligence: 'text-accent bg-accent/10 border-accent/20',
  experience_intelligence:  'text-[#6D5DFD] bg-[#6D5DFD]/10 border-[#6D5DFD]/20',
  community_intelligence:   'text-[#fbbf24] bg-[#fbbf24]/10 border-[#fbbf24]/20',
  marketplace_intelligence: 'text-[#34d399] bg-[#34d399]/10 border-[#34d399]/20',
  governance:               'text-[#f87171] bg-[#f87171]/10 border-[#f87171]/20',
  sustainability:           'text-[#86efac] bg-[#86efac]/10 border-[#86efac]/20',
  analytics:                'text-[#c084fc] bg-[#c084fc]/10 border-[#c084fc]/20',
};

const INTELLIGENCE_FUNCTIONS = ['personal', 'community', 'marketplace', 'impact', 'governance', 'foundry'] as const;
type IntelligenceFunction = typeof INTELLIGENCE_FUNCTIONS[number];

const FN_DESCRIPTIONS: Record<IntelligenceFunction, string> = {
  personal:    'Personalized discovery & growth intelligence',
  community:   'Community health, cohesion & social capital',
  marketplace: 'Fair exchange, value distribution & opportunity',
  impact:      'Impact measurement & sustainability alignment',
  governance:  'Constitutional compliance & trust monitoring',
  foundry:     'Agent design, evaluation & ecosystem curation',
};

export default function AdminXILPage() {
  const [agents, setAgents] = useState<AgentEntry[]>([]);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'registry' | 'health' | 'invoke'>('registry');
  const [invokeFunction, setInvokeFunction] = useState<IntelligenceFunction>('personal');
  const [invokeObjective, setInvokeObjective] = useState('');
  const [invokeContext, setInvokeContext] = useState('{}');
  const [invokeResult, setInvokeResult] = useState<string | null>(null);
  const [invoking, setInvoking] = useState(false);

  useEffect(() => {
    async function loadData() {
      const [regRes, healthRes] = await Promise.all([
        fetch('/api/xil?view=registry'),
        fetch('/api/xil?view=health'),
      ]);
      const reg = await regRes.json();
      const h = await healthRes.json();
      setAgents(reg.agents ?? []);
      setHealth(h);
      setLoading(false);
    }
    void loadData();
  }, []);

  async function handleInvoke() {
    if (!invokeObjective.trim()) return;
    setInvoking(true);
    setInvokeResult(null);
    try {
      let ctx = {};
      try { ctx = JSON.parse(invokeContext); } catch { /* ignore */ }
      const res = await fetch('/api/xil', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intelligenceFunction: invokeFunction, objective: invokeObjective, context: ctx }),
      });
      const data = await res.json();
      setInvokeResult(JSON.stringify(data, null, 2));
    } catch (e) {
      setInvokeResult(String(e));
    }
    setInvoking(false);
  }

  const categories: string[] = Array.from(new Set(agents.map((a: AgentEntry) => a.category)));
  const activeCount = agents.filter((a: AgentEntry) => a.is_active).length;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-8 h-8 rounded-lg bg-[#6D5DFD]/15 border border-[#6D5DFD]/25 flex items-center justify-center">
              <Cpu size={16} className="text-[#A99FFE]" strokeWidth={1.8} />
            </div>
            <h1 className="text-[28px] font-bold text-[#e8f0fe]">XIL Layer</h1>
          </div>
          <p className="text-[#7a8fa8] text-sm">X-Hunt Intelligence Layer — constitutional orchestration & agent registry</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#6D5DFD]/8 border border-[#6D5DFD]/15">
          <div className="w-1.5 h-1.5 rounded-full bg-accent breathe" />
          <span className="text-[12px] font-semibold text-[#A99FFE]">{activeCount} Agents Active</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Agents', value: agents.length, icon: Bot, color: 'text-[#A99FFE]' },
          { label: 'Categories', value: categories.length, icon: Cpu, color: 'text-accent' },
          { label: 'Constitutional Approval Rate',
            value: health?.constitutionalHealth.approvalRate != null ? `${health.constitutionalHealth.approvalRate}%` : '—',
            icon: ShieldCheck, color: 'text-[#34d399]' },
          { label: 'Avg Processing',
            value: health?.routingMetrics.avgProcessingMs != null ? `${health.routingMetrics.avgProcessingMs}ms` : '—',
            icon: Zap, color: 'text-[#fbbf24]' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-[#111927] border border-[#1c2a3a] rounded-xl px-5 py-4">
            <div className="flex items-center gap-2 mb-1">
              <Icon size={14} className={color} strokeWidth={1.8} />
              <p className="text-[10px] font-bold text-[#3d5068] uppercase tracking-wider">{label}</p>
            </div>
            <p className="text-[22px] font-bold text-[#e8f0fe]">{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(['registry', 'health', 'invoke'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 h-9 rounded-xl text-[13px] font-semibold transition-all capitalize',
              activeTab === tab ? 'bg-accent text-[#060a0e]' : 'bg-[#111927] text-[#7a8fa8] border border-[#1c2a3a] hover:border-[#2a3f58]'
            )}
          >
            {tab === 'registry' ? 'Agent Registry' : tab === 'health' ? 'Constitutional Health' : 'Quick Invoke'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-24 flex justify-center">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : activeTab === 'registry' ? (
        <div className="space-y-8">
          {categories.map((cat: string) => {
            const catAgents = agents.filter((a: AgentEntry) => a.category === cat);
            return (
              <div key={cat}>
                <p className="text-[11px] font-bold text-[#3d5068] uppercase tracking-widest mb-3">
                  {cat.replace(/_/g, ' ')} ({catAgents.length})
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {catAgents.map((agent: AgentEntry) => (
                    <AgentCard agent={agent} key={agent.agent_id} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : activeTab === 'health' ? (
        <HealthPanel health={health} />
      ) : (
        <InvokePanel
          fn={invokeFunction}
          setFn={setInvokeFunction}
          objective={invokeObjective}
          setObjective={setInvokeObjective}
          context={invokeContext}
          setContext={setInvokeContext}
          result={invokeResult}
          invoking={invoking}
          onInvoke={handleInvoke}
        />
      )}
    </div>
  );
}

function AgentCard({ agent }: { agent: AgentEntry; key?: string }) {
  const badgeCls = CATEGORY_COLORS[agent.category] ?? 'text-[#7a8fa8] bg-[#111927] border-[#1c2a3a]';
  const fin = Math.round(agent.financial_materiality_score * 100);
  const imp = Math.round(agent.impact_materiality_score * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#111927] border border-[#1c2a3a] rounded-2xl p-5 hover:border-[#2a3f58] transition-colors"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold text-[#e8f0fe] leading-tight">{agent.name}</p>
          <p className="text-[10px] font-mono text-[#3d5068] mt-0.5">{agent.agent_id}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5 ml-3 flex-shrink-0">
          <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-full border', badgeCls)}>
            {agent.category.replace(/_/g, ' ')}
          </span>
          <span className={cn(
            'text-[9px] font-bold px-2 py-0.5 rounded-full',
            agent.is_active ? 'text-accent bg-accent/10' : 'text-[#3d5068] bg-[#0f1824]'
          )}>
            {agent.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      <p className="text-[12px] text-[#7a8fa8] leading-relaxed mb-4 line-clamp-2">{agent.purpose}</p>

      {/* Materiality bars */}
      <div className="space-y-2">
        <div>
          <div className="flex justify-between text-[10px] mb-1">
            <span className="text-[#3d5068]">Financial Materiality</span>
            <span className="text-[#7a8fa8]">{fin}%</span>
          </div>
          <div className="h-1 bg-[#0f1824] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${fin}%` }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="h-full bg-[#fbbf24] rounded-full"
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-[10px] mb-1">
            <span className="text-[#3d5068]">Impact Materiality</span>
            <span className="text-[#7a8fa8]">{imp}%</span>
          </div>
          <div className="h-1 bg-[#0f1824] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${imp}%` }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="h-full bg-[#6D5DFD] rounded-full"
            />
          </div>
        </div>
      </div>

      {agent.requires_human_approval && (
        <div className="mt-3 flex items-center gap-1.5 text-[10px] text-[#fbbf24]">
          <AlertTriangle size={10} strokeWidth={2} />
          Requires human approval
        </div>
      )}
    </motion.div>
  );
}

function HealthPanel({ health }: { health: HealthData | null }) {
  if (!health) return null;
  const { constitutionalHealth, routingMetrics } = health;

  return (
    <div className="space-y-6">
      {/* Constitutional overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#111927] border border-[#1c2a3a] rounded-xl p-5">
          <p className="text-[10px] font-bold text-[#3d5068] uppercase tracking-wider mb-1">Approval Rate</p>
          <p className="text-[32px] font-bold text-accent leading-none">
            {constitutionalHealth.approvalRate != null ? `${constitutionalHealth.approvalRate}%` : '—'}
          </p>
          <p className="text-[11px] text-[#7a8fa8] mt-1">of {constitutionalHealth.totalChecks} checks</p>
        </div>
        <div className="bg-[#111927] border border-[#1c2a3a] rounded-xl p-5">
          <p className="text-[10px] font-bold text-[#3d5068] uppercase tracking-wider mb-1">Avg Processing</p>
          <p className="text-[32px] font-bold text-[#fbbf24] leading-none">
            {routingMetrics.avgProcessingMs != null ? routingMetrics.avgProcessingMs : '—'}
          </p>
          <p className="text-[11px] text-[#7a8fa8] mt-1">milliseconds</p>
        </div>
        <div className="bg-[#111927] border border-[#1c2a3a] rounded-xl p-5">
          <p className="text-[10px] font-bold text-[#3d5068] uppercase tracking-wider mb-1">Recent Calls</p>
          <p className="text-[32px] font-bold text-[#A99FFE] leading-none">
            {routingMetrics.recentCalls.length}
          </p>
          <p className="text-[11px] text-[#7a8fa8] mt-1">last 50 routes</p>
        </div>
      </div>

      {/* Recent checks */}
      <div className="bg-[#111927] border border-[#1c2a3a] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1c2a3a]">
          <p className="text-[14px] font-bold text-[#e8f0fe]">Recent Constitutional Checks</p>
        </div>
        {constitutionalHealth.recentChecks.length === 0 ? (
          <div className="py-12 text-center">
            <ShieldCheck size={32} className="text-[#3d5068] mx-auto mb-2" strokeWidth={1.5} />
            <p className="text-[#7a8fa8] text-sm">No checks yet</p>
          </div>
        ) : (
          <div className="divide-y divide-[#1c2a3a]">
            {constitutionalHealth.recentChecks.map((check, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3">
                {check.verdict === 'approved' ? (
                  <CheckCircle2 size={14} className="text-accent flex-shrink-0" strokeWidth={2} />
                ) : check.verdict === 'rejected' ? (
                  <XCircle size={14} className="text-[#ff5252] flex-shrink-0" strokeWidth={2} />
                ) : (
                  <AlertTriangle size={14} className="text-[#fbbf24] flex-shrink-0" strokeWidth={2} />
                )}
                <span className={cn(
                  'text-[12px] font-semibold capitalize',
                  check.verdict === 'approved' ? 'text-accent' : check.verdict === 'rejected' ? 'text-[#ff5252]' : 'text-[#fbbf24]'
                )}>
                  {check.verdict}
                </span>
                <span className="text-[12px] text-[#7a8fa8]">Score: {check.constitutional_score}/7</span>
                <span className="ml-auto text-[11px] text-[#3d5068]">
                  {new Date(check.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Function usage */}
      {routingMetrics.recentCalls.length > 0 && (
        <div className="bg-[#111927] border border-[#1c2a3a] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#1c2a3a]">
            <p className="text-[14px] font-bold text-[#e8f0fe]">Recent XIL Invocations</p>
          </div>
          <div className="divide-y divide-[#1c2a3a]">
            {routingMetrics.recentCalls.slice(0, 10).map((call, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3">
                <Activity size={13} className="text-[#A99FFE] flex-shrink-0" strokeWidth={1.8} />
                <span className="text-[12px] font-semibold text-[#e8f0fe] capitalize">{call.intelligence_function}</span>
                <span className="ml-auto text-[12px] text-[#7a8fa8]">
                  {call.processing_ms != null ? `${call.processing_ms}ms` : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InvokePanel({
  fn, setFn, objective, setObjective, context, setContext,
  result, invoking, onInvoke
}: {
  fn: IntelligenceFunction;
  setFn: (v: IntelligenceFunction) => void;
  objective: string;
  setObjective: (v: string) => void;
  context: string;
  setContext: (v: string) => void;
  result: string | null;
  invoking: boolean;
  onInvoke: () => void;
}) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div>
          <p className="text-[11px] font-bold text-[#3d5068] uppercase tracking-wider mb-2">Intelligence Function</p>
          <div className="grid grid-cols-2 gap-2">
            {INTELLIGENCE_FUNCTIONS.map((f) => (
              <button
                key={f}
                onClick={() => setFn(f)}
                className={cn(
                  'text-left px-3 py-3 rounded-xl border text-[13px] font-medium transition-all',
                  fn === f
                    ? 'bg-accent/10 border-accent/30 text-accent'
                    : 'bg-[#111927] border-[#1c2a3a] text-[#7a8fa8] hover:border-[#2a3f58] hover:text-[#e8f0fe]'
                )}
              >
                <p className="font-semibold capitalize">{f}</p>
                <p className="text-[10px] mt-0.5 opacity-70 leading-relaxed">{FN_DESCRIPTIONS[f]}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[11px] font-bold text-[#3d5068] uppercase tracking-wider mb-2">Objective</p>
          <textarea
            value={objective}
            onChange={(e: { target: { value: string } }) => setObjective(e.target.value)}
            placeholder="Describe the intelligence objective…"
            rows={4}
            className="w-full bg-[#0f1824] border border-[#1c2a3a] rounded-xl px-4 py-3 text-[#e8f0fe] placeholder-[#3d5068] text-[13px] focus:outline-none focus:border-accent resize-none transition-colors"
          />
        </div>

        <div>
          <p className="text-[11px] font-bold text-[#3d5068] uppercase tracking-wider mb-2">Context (JSON)</p>
          <textarea
            value={context}
            onChange={(e: { target: { value: string } }) => setContext(e.target.value)}
            placeholder="{}"
            rows={3}
            className="w-full bg-[#0f1824] border border-[#1c2a3a] rounded-xl px-4 py-3 text-[#e8f0fe] placeholder-[#3d5068] text-[12px] font-mono focus:outline-none focus:border-accent resize-none transition-colors"
          />
        </div>

        <button
          onClick={onInvoke}
          disabled={invoking || !objective.trim()}
          className="flex items-center gap-2 h-10 px-5 bg-accent text-[#060a0e] rounded-xl font-semibold text-[13px] disabled:opacity-50 shadow-[0_4px_16px_rgba(34,255,170,0.25)] transition-opacity"
        >
          {invoking ? (
            <><RefreshCw size={14} className="animate-spin" /> Orchestrating…</>
          ) : (
            <><Play size={14} strokeWidth={2.5} /> Invoke XIL</>
          )}
        </button>
      </div>

      <div>
        <p className="text-[11px] font-bold text-[#3d5068] uppercase tracking-wider mb-2">Response</p>
        <div className="bg-[#0f1824] border border-[#1c2a3a] rounded-xl min-h-[400px] p-4 overflow-auto">
          {invoking ? (
            <div className="flex items-center gap-2 text-[#7a8fa8] text-sm">
              <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              Running constitutional checks & orchestrating agents…
            </div>
          ) : result ? (
            <pre className="text-[12px] text-[#e8f0fe] font-mono whitespace-pre-wrap break-words">{result}</pre>
          ) : (
            <div className="flex items-center gap-2 text-[#3d5068] text-sm">
              <ChevronRight size={14} />
              XIL response will appear here
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
