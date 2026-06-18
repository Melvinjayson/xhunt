'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Cpu, Play, RefreshCw, ChevronRight, Sparkles,
  ShieldCheck, CheckCircle2, XCircle, AlertTriangle, Bot
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { t } from '@/theme/colors';

const INTELLIGENCE_FUNCTIONS = ['personal', 'community', 'marketplace', 'impact'] as const;
type IntelligenceFunction = typeof INTELLIGENCE_FUNCTIONS[number];

const FN_META: Record<IntelligenceFunction, { label: string; description: string; color: string; examples: string[] }> = {
  personal: {
    label: 'Personal Intelligence',
    description: 'Personalized discovery, skill-matched opportunities, and growth path recommendations',
    color: 'accent',
    examples: [
      'Find missions that match my skill level and interests',
      'Suggest learning paths to improve my trust score',
      'Show me opportunities aligned with my contribution history',
    ],
  },
  community: {
    label: 'Community Intelligence',
    description: 'Community health signals, cohesion patterns, and social capital analysis',
    color: t.ai,
    examples: [
      'What is the health of my community this week?',
      'Identify collaboration opportunities with peers',
      'Analyze contribution diversity in our group',
    ],
  },
  marketplace: {
    label: 'Marketplace Intelligence',
    description: 'Fair exchange recommendations, value distribution analysis, and opportunity matching',
    color: t.warning,
    examples: [
      'Are our reward structures creating fair incentives?',
      'Identify underserved mission categories',
      'Optimize reward distribution for maximum impact',
    ],
  },
  impact: {
    label: 'Impact Intelligence',
    description: 'Impact measurement, sustainability alignment, and double materiality assessment',
    color: t.accent,
    examples: [
      'Measure the real-world impact of completed missions',
      'Assess alignment with UN SDGs',
      'Identify sustainability risks in our mission portfolio',
    ],
  },
};

interface Agent {
  agent_id: string;
  name: string;
  category: string;
  purpose: string;
  is_active: boolean;
}

export default function WorkspaceIntelligencePage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedFn, setSelectedFn] = useState<IntelligenceFunction>('personal');
  const [objective, setObjective] = useState('');
  const [result, setResult] = useState<{ thinking?: string; content?: string; constitutional?: { verdict: string; score: number } } | null>(null);
  const [invoking, setInvoking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/xil?view=registry')
      .then((r) => r.json())
      .then((d) => setAgents(d.agents ?? []));
  }, []);

  async function handleInvoke() {
    if (!objective.trim()) return;
    setInvoking(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch('/api/xil', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intelligenceFunction: selectedFn, objective }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Intelligence request failed');
      } else {
        setResult(data);
      }
    } catch {
      setError('Failed to connect to XIL');
    }
    setInvoking(false);
  }

  const meta = FN_META[selectedFn as IntelligenceFunction];
  const activeAgents = agents.filter((a: Agent) => a.is_active);
  const visibleCategories = ['participant_intelligence', 'experience_intelligence', 'community_intelligence', 'marketplace_intelligence', 'sustainability'];
  const displayAgents = activeAgents.filter((a: Agent) => visibleCategories.includes(a.category)).slice(0, 6);

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: `${t.ai}26`, border: `1px solid ${t.ai}40` }}>
            <Cpu size={17} strokeWidth={1.8} style={{ color: t.aiLight }} />
          </div>
          <div>
            <h1 className="text-[24px] font-bold leading-tight" style={{ color: t.txt }}>XIL Hub</h1>
            <p className="text-[11px]" style={{ color: t.txtFaint }}>X-Hunt Intelligence Layer</p>
          </div>
        </div>
        <p className="text-[13px]" style={{ color: t.txtDim }}>
          Constitutional AI intelligence that helps you flourish — not just engage
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: function selector + invoke */}
        <div className="xl:col-span-2 space-y-5">
          {/* Function picker */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: t.txtFaint }}>Intelligence Function</p>
            <div className="grid grid-cols-2 gap-3">
              {INTELLIGENCE_FUNCTIONS.map((fn) => {
                const m = FN_META[fn];
                const active = selectedFn === fn;
                return (
                  <button
                    key={fn}
                    onClick={() => setSelectedFn(fn)}
                    className={cn(
                      'text-left p-4 rounded-2xl border transition-all',
                      active
                        ? 'bg-accent/10 border-accent/30'
                        : 'border-[#0F1D35] hover:border-[#1A2E50]'
                    )}
                    style={!active ? { background: t.surface } : {}}
                  >
                    <p className={cn('text-[13px] font-bold mb-1', active ? 'text-accent' : '')}
                      style={!active ? { color: t.txt } : {}}>
                      {m.label}
                    </p>
                    <p className="text-[11px] leading-relaxed" style={{ color: t.txtFaint }}>{m.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Objective input */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: t.txtFaint }}>Your Question or Objective</p>
            <div className="relative">
              <textarea
                value={objective}
                onChange={(e: { target: { value: string } }) => setObjective(e.target.value)}
                placeholder={`e.g. "${meta.examples[0]}"`}
                rows={3}
                className="w-full rounded-xl px-4 py-3 text-[13px] focus:outline-none focus:border-accent/50 resize-none transition-colors"
                style={{ background: t.surface, border: `1px solid ${t.panel}`, color: t.txt }}
                onKeyDown={(e: { key: string; metaKey: boolean; ctrlKey: boolean }) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void handleInvoke();
                }}
              />
              <p className="absolute bottom-3 right-3 text-[10px]" style={{ color: '#2A3550' }}>⌘↵ to run</p>
            </div>
          </div>

          {/* Example prompts */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: t.txtFaint }}>Example Objectives</p>
            <div className="flex flex-col gap-1.5">
              {meta.examples.map((ex: string) => (
                <button
                  key={ex}
                  onClick={() => setObjective(ex)}
                  className="flex items-center gap-2 text-left px-3 py-2 rounded-lg transition-colors group"
                  style={{ background: 'transparent' }}
                  onMouseEnter={e => (e.currentTarget.style.background = t.card)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <ChevronRight size={12} className="text-accent transition-colors flex-shrink-0" strokeWidth={2.5} style={{ color: t.txtFaint }} />
                  <span className="text-[12px] transition-colors" style={{ color: t.txtDim }}>{ex}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleInvoke}
            disabled={invoking || !objective.trim()}
            className="flex items-center gap-2 h-11 px-6 bg-accent rounded-xl font-bold text-[13px] disabled:opacity-50 shadow-[0_4px_20px_rgba(34,255,170,0.2)] transition-opacity w-full justify-center"
            style={{ color: '#060a0e' }}
          >
            {invoking ? (
              <><RefreshCw size={14} className="animate-spin" /> Consulting Intelligence Layer…</>
            ) : (
              <><Sparkles size={14} strokeWidth={2.5} /> Ask XIL</>
            )}
          </button>

          {/* Result */}
          {(result || error) && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl overflow-hidden"
              style={{ background: t.surface, border: `1px solid ${t.panel}` }}
            >
              {/* Constitutional verdict */}
              {result?.constitutional && (
                <div className={cn(
                  'flex items-center gap-2 px-4 py-2.5 border-b text-[12px] font-medium',
                  result.constitutional.verdict === 'approved'
                    ? 'bg-accent/5 border-accent/15 text-accent'
                    : result.constitutional.verdict === 'rejected'
                    ? 'bg-[#ff5252]/5 border-[#ff5252]/15 text-[#ff5252]'
                    : 'bg-[#fbbf24]/5 border-[#fbbf24]/15 text-[#fbbf24]'
                )}>
                  {result.constitutional.verdict === 'approved' ? (
                    <CheckCircle2 size={13} strokeWidth={2} />
                  ) : result.constitutional.verdict === 'rejected' ? (
                    <XCircle size={13} strokeWidth={2} />
                  ) : (
                    <AlertTriangle size={13} strokeWidth={2} />
                  )}
                  Constitutional check: {result.constitutional.verdict} (score {result.constitutional.score}/7)
                </div>
              )}

              {error ? (
                <div className="p-5 flex items-start gap-2">
                  <XCircle size={14} className="flex-shrink-0 mt-0.5" strokeWidth={2} style={{ color: t.error }} />
                  <p className="text-[13px]" style={{ color: t.error }}>{error}</p>
                </div>
              ) : result?.content ? (
                <div className="p-5">
                  <p className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: t.txtDim }}>{result.content}</p>
                </div>
              ) : (
                <div className="p-5">
                  <pre className="text-[11px] font-mono whitespace-pre-wrap overflow-auto max-h-64" style={{ color: t.txtDim }}>
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Right: active agents */}
        <div className="space-y-4">
          <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: t.txtFaint }}>Active Agents ({activeAgents.length})</p>
          {displayAgents.length === 0 ? (
            <div className="py-8 text-center rounded-2xl" style={{ background: t.surface, border: `1px solid ${t.panel}` }}>
              <Bot size={28} className="mx-auto mb-2" strokeWidth={1.5} style={{ color: '#2A3550' }} />
              <p className="text-sm" style={{ color: t.txtFaint }}>No agents active</p>
            </div>
          ) : (
            displayAgents.map((agent: Agent) => (
              <div key={agent.agent_id} className="rounded-xl p-4 transition-colors" style={{ background: t.surface, border: `1px solid ${t.panel}` }}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                  <p className="text-[13px] font-semibold" style={{ color: t.txt }}>{agent.name}</p>
                </div>
                <p className="text-[11px] leading-relaxed line-clamp-2" style={{ color: t.txtFaint }}>{agent.purpose}</p>
              </div>
            ))
          )}

          {/* Constitutional principles */}
          <div className="rounded-2xl p-4 mt-4" style={{ background: t.surface, border: `1px solid ${t.panel}` }}>
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck size={13} strokeWidth={1.8} style={{ color: t.aiLight }} />
              <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: t.txtFaint }}>Constitutional AI</p>
            </div>
            <div className="space-y-2">
              {[
                'Human agency always takes precedence',
                'Engage for value, not engagement itself',
                'Fairness maximizes opportunity',
                'Trust is our most valuable asset',
              ].map((p) => (
                <div key={p} className="flex items-start gap-2">
                  <div className="w-1 h-1 rounded-full flex-shrink-0 mt-1.5" style={{ background: t.txtFaint }} />
                  <p className="text-[11px] leading-relaxed" style={{ color: t.txtFaint }}>{p}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
