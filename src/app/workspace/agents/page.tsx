'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, Zap, Brain, Target, TrendingUp, Sparkles, Network, BarChart3,
  Send, X, RefreshCw, AlertCircle, Settings, Check,
  Cpu, Gauge, ChevronDown, ChevronUp, Sliders, MessageSquare,
  Wand2, BookOpen, Shield, Lightbulb,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { t } from '@/theme/colors';

/* ─── agent persona config ─── */
interface AgentPersonaConfig {
  customName: string;
  reasoning: 'fast' | 'balanced' | 'deep';
  outputStyle: 'concise' | 'detailed' | 'structured';
  systemPrompt: string;
  temperature: number;
}
const DEFAULT_PERSONA: AgentPersonaConfig = { customName: '', reasoning: 'balanced', outputStyle: 'detailed', systemPrompt: '', temperature: 0.7 };
function loadAgentConfigs(): Record<string, AgentPersonaConfig> {
  try { const s = localStorage.getItem('xhunt-agent-personas'); return s ? JSON.parse(s) : {}; } catch { return {}; }
}
function saveAgentConfigs(cfg: Record<string, AgentPersonaConfig>) {
  try { localStorage.setItem('xhunt-agent-personas', JSON.stringify(cfg)); } catch {}
}

/* ─── agent definitions ─── */
interface Agent {
  id: string;
  name: string;
  role: string;
  description: string;
  capabilities: string[];
  apiPath: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  status: 'active' | 'idle';
  lastRun?: string;
  tasksCompleted: number;
  confidence: number;
  defaultPrompt?: string;
}

const AGENTS: Agent[] = [
  {
    id: 'mission-architect',
    name: 'Mission Architect',
    role: 'Mission Design',
    description: 'Designs mission structures, objectives, and step sequences optimized for engagement and outcome achievement.',
    capabilities: ['Generate mission blueprints', 'Suggest step sequences', 'Optimize flow', 'Template creation'],
    apiPath: '/api/agents/mission-architect',
    icon: Target,
    color: t.accent,
    bgColor: 'bg-[#22FFAA]/10',
    status: 'active',
    lastRun: '2 min ago',
    tasksCompleted: 147,
    confidence: 94,
    defaultPrompt: 'You are a mission design expert. Help the user create engaging, well-structured mission experiences with clear objectives and measurable outcomes.',
  },
  {
    id: 'outcome-planner',
    name: 'Outcome Planner',
    role: 'Outcome Strategy',
    description: 'Maps organizational objectives to measurable outcomes and creates roadmaps for achievement.',
    capabilities: ['Outcome mapping', 'Success metrics', 'ROI forecasting', 'Roadmap generation'],
    apiPath: '/api/agents/outcome-planner',
    icon: TrendingUp,
    color: t.ai,
    bgColor: 'bg-[#6D5DFD]/10',
    status: 'active',
    lastRun: '5 min ago',
    tasksCompleted: 89,
    confidence: 91,
    defaultPrompt: 'You are an outcome strategy specialist. Help the user align organizational goals with measurable outcomes and actionable roadmaps.',
  },
  {
    id: 'experience-designer',
    name: 'Experience Designer',
    role: 'Engagement Design',
    description: 'Designs reward structures, motivation sequences, and participant journey experiences.',
    capabilities: ['Reward design', 'Journey mapping', 'Motivation optimization', 'Engagement scoring'],
    apiPath: '/api/agents/experience-designer',
    icon: Sparkles,
    color: t.warning,
    bgColor: 'bg-[#FFB84D]/10',
    status: 'active',
    lastRun: '12 min ago',
    tasksCompleted: 203,
    confidence: 88,
    defaultPrompt: 'You are an experience design expert. Help the user craft compelling reward structures and participant journeys that maximize engagement.',
  },
  {
    id: 'behavioral-analyst',
    name: 'Behavioral Analyst',
    role: 'Behavioral Intelligence',
    description: 'Analyzes participant behavior patterns, identifies drop-off signals, and recommends friction reduction.',
    capabilities: ['Behavior analysis', 'Drop-off detection', 'Pattern recognition', 'Friction scoring'],
    apiPath: '/api/agents/behavioral-analyst',
    icon: Brain,
    color: t.error,
    bgColor: 'bg-[#FF5C7A]/10',
    status: 'idle',
    lastRun: '1 hour ago',
    tasksCompleted: 312,
    confidence: 87,
    defaultPrompt: 'You are a behavioral intelligence analyst. Help the user understand participant behavior and identify opportunities to reduce friction and improve retention.',
  },
  {
    id: 'knowledge-agent',
    name: 'Knowledge Agent',
    role: 'Organizational Intelligence',
    description: 'Builds and maintains the organizational knowledge graph connecting users, skills, missions, and outcomes.',
    capabilities: ['Graph construction', 'Skill mapping', 'Relationship inference', 'Knowledge synthesis'],
    apiPath: '/api/agents/knowledge-agent',
    icon: Network,
    color: t.accent,
    bgColor: 'bg-[#22FFAA]/8',
    status: 'idle',
    lastRun: '3 hours ago',
    tasksCompleted: 76,
    confidence: 82,
    defaultPrompt: 'You are a knowledge graph specialist. Help the user build connections between skills, users, and mission outcomes to surface valuable organizational insights.',
  },
  {
    id: 'insight-analyst',
    name: 'Insight Analyst',
    role: 'Intelligence Briefings',
    description: 'Generates daily operational briefings with risks, opportunities, and recommended actions for leadership.',
    capabilities: ['Daily briefings', 'Risk identification', 'Opportunity detection', 'Action recommendations'],
    apiPath: '/api/agents/insight-analyst',
    icon: BarChart3,
    color: t.ai,
    bgColor: 'bg-[#6D5DFD]/10',
    status: 'active',
    lastRun: '30 min ago',
    tasksCompleted: 421,
    confidence: 95,
    defaultPrompt: 'You are an intelligence analyst. Generate concise briefings surfacing risks, opportunities, and clear action recommendations for leadership.',
  },
];

/* ─── chat message ─── */
interface ChatMessage {
  role: 'user' | 'agent';
  content: string;
  timestamp: string;
  isThinking?: boolean;
}

/* ─── reasoning opts ─── */
const REASONING_OPTS = [
  { id: 'fast'     as const, label: 'Fast',       icon: Cpu,   desc: 'Quick answers'              },
  { id: 'balanced' as const, label: 'Balanced',   icon: Gauge, desc: 'Thoughtful analysis'         },
  { id: 'deep'     as const, label: 'Deep Think', icon: Brain, desc: 'Extended chain-of-thought'   },
];
const OUTPUT_OPTS = [
  { id: 'concise'    as const, label: 'Concise',    icon: Zap,       desc: 'Short and direct'          },
  { id: 'detailed'   as const, label: 'Detailed',   icon: BookOpen,  desc: 'Full explanations'          },
  { id: 'structured' as const, label: 'Structured', icon: Sliders,   desc: 'Bullets, tables, sections'  },
];

/* ─── ConfigPanel ─── */
function ConfigPanel({ agentId, config, onChange, onSave, onClose }: {
  agentId: string; config: AgentPersonaConfig;
  onChange: (p: Partial<AgentPersonaConfig>) => void;
  onSave: () => void; onClose: () => void;
}) {
  const agent = AGENTS.find(a => a.id === agentId);
  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
      style={{ overflow: 'hidden', borderBottom: '1px solid rgba(109,93,253,.15)', background: 'rgba(109,93,253,.04)' }}>
      <div style={{ padding: '16px 20px 18px' }}>

        {/* Custom name */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '.09em', marginBottom: 6 }}>Custom Name</label>
          <input
            value={config.customName}
            onChange={e => onChange({ customName: e.target.value })}
            placeholder={agent?.name ?? 'Agent Name'}
            style={{ width: '100%', padding: '9px 12px', borderRadius: 10, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', color: t.txt, fontSize: 12, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
          />
        </div>

        {/* Reasoning */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '.09em', marginBottom: 8 }}>Reasoning Mode</label>
          <div style={{ display: 'flex', gap: 7 }}>
            {REASONING_OPTS.map(({ id, label, icon: Icon, desc }) => {
              const active = config.reasoning === id;
              return (
                <button key={id} onClick={() => onChange({ reasoning: id })} style={{ flex: 1, padding: '9px 6px', borderRadius: 10, background: active ? `${t.ai}18` : 'rgba(255,255,255,.03)', border: `1px solid ${active ? t.ai + '40' : 'rgba(255,255,255,.08)'}`, cursor: 'pointer', textAlign: 'center' }}>
                  <Icon size={13} strokeWidth={2} style={{ color: active ? t.ai : t.txtFaint, display: 'block', margin: '0 auto 4px' }} />
                  <span style={{ fontSize: 9.5, fontWeight: 700, color: active ? t.txt : t.txtDim, display: 'block' }}>{label}</span>
                  <span style={{ fontSize: 8, color: t.txtFaint, display: 'block', lineHeight: 1.3 }}>{desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Output style */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '.09em', marginBottom: 8 }}>Output Style</label>
          <div style={{ display: 'flex', gap: 7 }}>
            {OUTPUT_OPTS.map(({ id, label, icon: Icon, desc }) => {
              const active = config.outputStyle === id;
              return (
                <button key={id} onClick={() => onChange({ outputStyle: id })} style={{ flex: 1, padding: '9px 6px', borderRadius: 10, background: active ? `${t.accent}10` : 'rgba(255,255,255,.03)', border: `1px solid ${active ? t.accent + '40' : 'rgba(255,255,255,.08)'}`, cursor: 'pointer', textAlign: 'center' }}>
                  <Icon size={13} strokeWidth={2} style={{ color: active ? t.accent : t.txtFaint, display: 'block', margin: '0 auto 4px' }} />
                  <span style={{ fontSize: 9.5, fontWeight: 700, color: active ? t.txt : t.txtDim, display: 'block' }}>{label}</span>
                  <span style={{ fontSize: 8, color: t.txtFaint, display: 'block', lineHeight: 1.3 }}>{desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Temperature */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '.09em' }}>Creativity</label>
            <span style={{ fontSize: 10, fontWeight: 700, color: t.accent }}>{config.temperature.toFixed(1)}</span>
          </div>
          <div style={{ position: 'relative', height: 6, borderRadius: 999, background: 'rgba(255,255,255,.08)' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 999, background: `linear-gradient(90deg,${t.ai},${t.accent})`, width: `${config.temperature * 100}%` }} />
            <input type="range" min="0" max="1" step="0.1" value={config.temperature}
              onChange={e => onChange({ temperature: parseFloat(e.target.value) })}
              style={{ position: 'absolute', inset: 0, width: '100%', opacity: 0, cursor: 'pointer', height: '100%' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: 9, color: t.txtFaint }}>Precise</span>
            <span style={{ fontSize: 9, color: t.txtFaint }}>Creative</span>
          </div>
        </div>

        {/* System prompt */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: t.txtFaint, textTransform: 'uppercase', letterSpacing: '.09em', marginBottom: 6 }}>System Prompt Override</label>
          <textarea
            value={config.systemPrompt}
            onChange={e => onChange({ systemPrompt: e.target.value })}
            placeholder={agent?.defaultPrompt ?? 'Override the default agent behavior…'}
            rows={3}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.09)', color: t.txt, fontSize: 11.5, resize: 'none', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', lineHeight: 1.5 }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => { onSave(); onClose(); }} style={{ flex: 1, height: 36, borderRadius: 9, background: `linear-gradient(135deg,${t.accent},${t.accent}CC)`, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Check size={12} strokeWidth={2.5} style={{ color: t.bg }} />
            <span style={{ fontSize: 11.5, fontWeight: 800, color: t.bg }}>Save Config</span>
          </button>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.09)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={12} strokeWidth={2} style={{ color: t.txtFaint }} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════ PAGE ═══════════════════════ */
export default function AgentsPage() {
  const [selected, setSelected] = useState<Agent | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [showCfg, setShowCfg]   = useState(false);
  const [allCfg, setAllCfg]     = useState<Record<string, AgentPersonaConfig>>({});
  const messagesEndRef           = useRef<HTMLDivElement>(null);

  useEffect(() => { setAllCfg(loadAgentConfigs()); }, []);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  function getAgentCfg(id: string): AgentPersonaConfig { return allCfg[id] ?? { ...DEFAULT_PERSONA }; }
  function patchAgentCfg(id: string, patch: Partial<AgentPersonaConfig>) {
    setAllCfg(prev => ({ ...prev, [id]: { ...getAgentCfg(id), ...patch } }));
  }
  function saveCurrentCfg() { saveAgentConfigs(allCfg); }

  async function sendMessage() {
    if (!input.trim() || !selected || loading) return;
    const msg = input.trim();
    setInput(''); setError('');
    const ts = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { role: 'user', content: msg, timestamp: ts }]);
    setLoading(true);

    const cfg = getAgentCfg(selected.id);
    const isDeep = cfg.reasoning === 'deep';

    if (isDeep) {
      setMessages(prev => [...prev, { role: 'agent', content: '', timestamp: ts, isThinking: true }]);
    }

    try {
      const res = await fetch(selected.apiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: msg,
          reasoning: cfg.reasoning,
          outputStyle: cfg.outputStyle,
          temperature: cfg.temperature,
          systemPrompt: cfg.systemPrompt || selected.defaultPrompt,
          agentName: cfg.customName || selected.name,
        }),
      });
      const json = await res.json();
      const text: string = json.content ?? json.message ?? 'I processed your request.';

      setMessages(prev => {
        const filtered = prev.filter(m => !m.isThinking);
        return [...filtered, { role: 'agent', content: text, timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) }];
      });
    } catch {
      setMessages(prev => prev.filter(m => !m.isThinking));
      setError('Failed to reach the agent. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const cfg = selected ? getAgentCfg(selected.id) : null;
  const displayName = (selected && cfg?.customName) ? cfg.customName : selected?.name ?? '';

  return (
    <div className="p-8 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#6D5DFD]/10 border border-[#6D5DFD]/20 flex items-center justify-center">
            <Bot size={18} strokeWidth={1.8} style={{ color: t.ai }} />
          </div>
          <div>
            <h1 className="text-[22px] font-bold" style={{ color: t.txt }}>AI Agents</h1>
            <p className="text-[12px]" style={{ color: t.txtFaint }}>6 intelligent agents · {AGENTS.filter(a => a.status === 'active').length} active · fully customisable</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#22FFAA]/8 border border-[#22FFAA]/15 rounded-xl">
          <div className="w-1.5 h-1.5 rounded-full breathe" style={{ background: t.accent }} />
          <span className="text-[11px] font-semibold" style={{ color: t.accent }}>{AGENTS.filter(a => a.status === 'active').length} Agents Running</span>
        </div>
      </div>

      <div className={cn('grid gap-4', selected ? 'grid-cols-5' : 'grid-cols-3')}>

        {/* Agent Cards */}
        <div className={cn('grid gap-4 content-start', selected ? 'col-span-2 grid-cols-1' : 'col-span-3 grid-cols-3')}>
          {AGENTS.map((agent, i) => {
            const agentCfg = getAgentCfg(agent.id);
            const isCustomised = agentCfg.customName || agentCfg.systemPrompt || agentCfg.reasoning !== 'balanced';
            return (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                onClick={() => { setSelected(agent === selected ? null : agent); setMessages([]); setInput(''); setError(''); setShowCfg(false); }}
                className={cn(
                  'bg-[#0A1226] border rounded-2xl p-4 cursor-pointer transition-all',
                  selected?.id === agent.id ? 'border-[#6D5DFD]/40 bg-[#6D5DFD]/5' : 'border-[#0F1D35] hover:border-[#162440]'
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', agent.bgColor)}>
                    <agent.icon size={18} strokeWidth={1.8} style={{ color: agent.color }} />
                  </div>
                  <div className="flex items-center gap-2">
                    {isCustomised && (
                      <div className="flex items-center gap-1 px-1.5 py-0.5 bg-[#6D5DFD]/10 border border-[#6D5DFD]/20 rounded-full">
                        <Wand2 size={8} strokeWidth={2} style={{ color: t.ai }} />
                        <span className="text-[8.5px] font-bold" style={{ color: t.ai }}>Custom</span>
                      </div>
                    )}
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: agent.status === 'active' ? t.accent : t.txtFaint }} />
                    <span className="text-[10px] font-bold" style={{ color: agent.status === 'active' ? t.accent : t.txtFaint }}>
                      {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
                    </span>
                  </div>
                </div>

                <h3 className="text-[13px] font-bold mb-0.5" style={{ color: t.txt }}>
                  {agentCfg.customName || agent.name}
                </h3>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: t.txtFaint }}>{agent.role}</p>
                {!selected && <p className="text-[11px] line-clamp-2 mb-3" style={{ color: t.txtDim }}>{agent.description}</p>}

                <div className="flex items-center justify-between pt-2 border-t border-[#0F1D35]">
                  <div className="flex items-center gap-3 text-[10px]" style={{ color: t.txtFaint }}>
                    <span className="tabular-nums">{agent.tasksCompleted} tasks</span>
                    <span className="font-bold" style={{ color: agent.color }}>{agent.confidence}% conf.</span>
                  </div>
                  {agent.lastRun && <span className="text-[10px]" style={{ color: t.txtFaint }}>{agent.lastRun}</span>}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Agent Chat Panel */}
        <AnimatePresence>
          {selected && cfg && (
            <motion.div
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
              className="col-span-3 bg-[#0A1226] border border-[#0F1D35] rounded-2xl flex flex-col overflow-hidden"
              style={{ height: 'calc(100vh - 200px)' }}
            >
              {/* Chat Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#0F1D35] flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center', selected.bgColor)}>
                    <selected.icon size={16} strokeWidth={1.8} style={{ color: selected.color }} />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold" style={{ color: t.txt }}>{displayName}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-[10px]" style={{ color: t.txtFaint }}>{selected.role} · {selected.confidence}% conf</p>
                      <div className="flex items-center gap-1">
                        <span style={{ width: 4, height: 4, borderRadius: '50%', background: t.txtFaint, display: 'inline-block' }} />
                        <span className="text-[9.5px]" style={{ color: cfg.reasoning === 'deep' ? t.warning : cfg.reasoning === 'fast' ? t.accent : t.ai }}>
                          {cfg.reasoning === 'deep' ? '🔮 Deep Think' : cfg.reasoning === 'fast' ? '⚡ Fast' : '⚖ Balanced'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowCfg(v => !v)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 h-8 rounded-lg text-[11px] font-semibold transition-all',
                      showCfg
                        ? 'bg-[#6D5DFD]/15 border border-[#6D5DFD]/30'
                        : 'bg-[#07101F] border border-[#0F1D35] hover:border-[#162440]'
                    )}
                    style={{ color: showCfg ? t.aiLight : t.txtFaint }}
                  >
                    <Settings size={11} strokeWidth={2} />
                    Configure
                    {showCfg ? <ChevronUp size={10} strokeWidth={2} /> : <ChevronDown size={10} strokeWidth={2} />}
                  </button>
                  <button
                    onClick={() => { setSelected(null); setMessages([]); setShowCfg(false); }}
                    className="p-1.5 rounded-lg hover:bg-[#0D1530] transition-colors"
                    style={{ color: t.txtFaint }}
                  >
                    <X size={14} strokeWidth={2} />
                  </button>
                </div>
              </div>

              {/* Config Panel */}
              <AnimatePresence>
                {showCfg && (
                  <ConfigPanel
                    agentId={selected.id}
                    config={cfg}
                    onChange={patch => patchAgentCfg(selected.id, patch)}
                    onSave={saveCurrentCfg}
                    onClose={() => setShowCfg(false)}
                  />
                )}
              </AnimatePresence>

              {/* Capabilities chips */}
              {!showCfg && (
                <div className="px-5 py-3 border-b border-[#0F1D35] flex-shrink-0">
                  <div className="flex flex-wrap gap-2">
                    {selected.capabilities.map(c => (
                      <span key={c} className="text-[10px] font-semibold px-2 py-0.5 bg-[#0D1530] border border-[#162440] rounded-full" style={{ color: t.txtDim }}>{c}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                {messages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center gap-3">
                    <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center', selected.bgColor)}>
                      <selected.icon size={24} strokeWidth={1.5} style={{ color: selected.color }} />
                    </div>
                    <div>
                      <p className="text-[14px] font-bold" style={{ color: t.txt }}>{displayName}</p>
                      <p className="text-[12px] mt-1 max-w-xs" style={{ color: t.txtFaint }}>{selected.description}</p>
                    </div>
                    {/* reasoning badge */}
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: 10, fontWeight: 700, color: t.ai, background: `${t.ai}10`, border: `1px solid ${t.ai}20`, borderRadius: 999, padding: '2px 8px' }}>
                        {cfg.reasoning === 'deep' ? '🔮 Extended reasoning' : cfg.reasoning === 'fast' ? '⚡ Fast mode' : '⚖ Balanced'}
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: t.accent, background: `${t.accent}10`, border: `1px solid ${t.accent}20`, borderRadius: 999, padding: '2px 8px' }}>
                        {cfg.outputStyle}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2 w-full max-w-sm">
                      {selected.capabilities.slice(0, 4).map(c => (
                        <button key={c} onClick={() => setInput(c)}
                          className="text-[11px] text-left px-3 py-2 bg-[#07101F] border border-[#0F1D35] rounded-xl hover:border-[#162440] transition-colors"
                          style={{ color: t.txtDim }}>
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((msg, i) => (
                  <div key={i} className={cn('flex gap-3', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
                    <div
                      className={cn(
                        'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold',
                        msg.role === 'user' ? 'bg-[#6D5DFD]/20' : selected.bgColor
                      )}
                      style={msg.role === 'user' ? { color: t.aiLight } : undefined}
                    >
                      {msg.role === 'user' ? 'U' : (msg.isThinking
                        ? <Brain size={12} strokeWidth={2} style={{ color: selected.color, animation: 'pulse 1.5s ease-in-out infinite' }} />
                        : <selected.icon size={12} strokeWidth={2} style={{ color: selected.color }} />
                      )}
                    </div>
                    <div
                      className={cn(
                        'max-w-[80%] rounded-2xl px-4 py-3 text-[12px] leading-relaxed',
                        msg.role === 'user'
                          ? 'bg-[#6D5DFD]/15'
                          : msg.isThinking
                            ? 'bg-[#07101F] border border-[#6D5DFD]/20'
                            : 'bg-[#07101F] border border-[#0F1D35]'
                      )}
                      style={{ color: msg.role === 'user' ? t.txt : msg.isThinking ? t.ai : t.txtDim }}
                    >
                      {msg.isThinking ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px]" style={{ color: t.ai }}>🔮 Thinking deeply…</span>
                          <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: t.ai, animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: t.ai, animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: t.ai, animationDelay: '300ms' }} />
                        </div>
                      ) : (
                        <>
                          <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                          <p className="text-[9px] mt-1" style={{ color: t.txtFaint }}>{msg.timestamp}</p>
                        </>
                      )}
                    </div>
                  </div>
                ))}

                {loading && !messages.some(m => m.isThinking) && (
                  <div className="flex gap-3">
                    <div className={cn('w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0', selected.bgColor)}>
                      <RefreshCw size={12} className="animate-spin" strokeWidth={2} style={{ color: selected.color }} />
                    </div>
                    <div className="bg-[#07101F] border border-[#0F1D35] rounded-2xl px-4 py-3 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: t.txtFaint, animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: t.txtFaint, animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: t.txtFaint, animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {error && (
                <div className="px-5 py-2 flex items-center gap-2 bg-[#FF5C7A]/8 border-t border-[#FF5C7A]/15 flex-shrink-0">
                  <AlertCircle size={12} strokeWidth={2} style={{ color: t.error }} />
                  <p className="text-[11px]" style={{ color: t.error }}>{error}</p>
                </div>
              )}

              {/* Input */}
              <div className="px-5 py-4 border-t border-[#0F1D35] flex-shrink-0">
                <div className="flex items-end gap-2">
                  <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder={`Ask ${displayName}…`}
                    rows={2}
                    className="flex-1 px-4 py-3 bg-[#07101F] border border-[#0F1D35] rounded-xl text-[13px] placeholder:text-[#4A5578] focus:outline-none focus:border-[#162440] resize-none"
                    style={{ color: t.txt }}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || loading}
                    className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all',
                      input.trim() && !loading
                        ? 'bg-accent shadow-[0_4px_12px_rgba(34,255,170,0.3)]'
                        : 'bg-[#07101F] border border-[#0F1D35]'
                    )}
                    style={{ color: input.trim() && !loading ? t.bg : t.txtFaint }}
                  >
                    <Send size={14} strokeWidth={2.5} />
                  </button>
                </div>
                <p className="text-[10px] mt-2" style={{ color: t.txtFaint }}>Enter to send · Shift+Enter for new line</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
