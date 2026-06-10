'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, Zap, Brain, Target, TrendingUp, Sparkles, Network, BarChart3,
  Play, ChevronRight, MessageSquare, Send, X, RefreshCw, Check,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/cn';

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
    color: 'text-[#22FFAA]',
    bgColor: 'bg-[#22FFAA]/10',
    status: 'active',
    lastRun: '2 min ago',
    tasksCompleted: 147,
    confidence: 94,
  },
  {
    id: 'outcome-planner',
    name: 'Outcome Planner',
    role: 'Outcome Strategy',
    description: 'Maps organizational objectives to measurable outcomes and creates roadmaps for achievement.',
    capabilities: ['Outcome mapping', 'Success metrics', 'ROI forecasting', 'Roadmap generation'],
    apiPath: '/api/agents/outcome-planner',
    icon: TrendingUp,
    color: 'text-[#6D5DFD]',
    bgColor: 'bg-[#6D5DFD]/10',
    status: 'active',
    lastRun: '5 min ago',
    tasksCompleted: 89,
    confidence: 91,
  },
  {
    id: 'experience-designer',
    name: 'Experience Designer',
    role: 'Engagement Design',
    description: 'Designs reward structures, motivation sequences, and participant journey experiences.',
    capabilities: ['Reward design', 'Journey mapping', 'Motivation optimization', 'Engagement scoring'],
    apiPath: '/api/agents/experience-designer',
    icon: Sparkles,
    color: 'text-[#FFB84D]',
    bgColor: 'bg-[#FFB84D]/10',
    status: 'active',
    lastRun: '12 min ago',
    tasksCompleted: 203,
    confidence: 88,
  },
  {
    id: 'behavioral-analyst',
    name: 'Behavioral Analyst',
    role: 'Behavioral Intelligence',
    description: 'Analyzes participant behavior patterns, identifies drop-off signals, and recommends friction reduction.',
    capabilities: ['Behavior analysis', 'Drop-off detection', 'Pattern recognition', 'Friction scoring'],
    apiPath: '/api/agents/behavioral-analyst',
    icon: Brain,
    color: 'text-[#FF5C7A]',
    bgColor: 'bg-[#FF5C7A]/10',
    status: 'idle',
    lastRun: '1 hour ago',
    tasksCompleted: 312,
    confidence: 87,
  },
  {
    id: 'knowledge-agent',
    name: 'Knowledge Agent',
    role: 'Organizational Intelligence',
    description: 'Builds and maintains the organizational knowledge graph connecting users, skills, missions, and outcomes.',
    capabilities: ['Graph construction', 'Skill mapping', 'Relationship inference', 'Knowledge synthesis'],
    apiPath: '/api/agents/knowledge-agent',
    icon: Network,
    color: 'text-[#22FFAA]',
    bgColor: 'bg-[#22FFAA]/8',
    status: 'idle',
    lastRun: '3 hours ago',
    tasksCompleted: 76,
    confidence: 82,
  },
  {
    id: 'insight-analyst',
    name: 'Insight Analyst',
    role: 'Intelligence Briefings',
    description: 'Generates daily operational briefings with risks, opportunities, and recommended actions for leadership.',
    capabilities: ['Daily briefings', 'Risk identification', 'Opportunity detection', 'Action recommendations'],
    apiPath: '/api/agents/insight-analyst',
    icon: BarChart3,
    color: 'text-[#6D5DFD]',
    bgColor: 'bg-[#6D5DFD]/10',
    status: 'active',
    lastRun: '30 min ago',
    tasksCompleted: 421,
    confidence: 95,
  },
];

interface ChatMessage {
  role: 'user' | 'agent';
  content: string;
  timestamp: string;
}

export default function AgentsPage() {
  const [selected, setSelected] = useState<Agent | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function sendMessage() {
    if (!input.trim() || !selected || loading) return;
    const msg = input.trim();
    setInput('');
    setError('');

    const newMsg: ChatMessage = { role: 'user', content: msg, timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) };
    setMessages((prev) => [...prev, newMsg]);
    setLoading(true);

    try {
      const res = await fetch(selected.apiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: msg }),
      });
      const json = await res.json();
      const text: string = json.content ?? json.message ?? 'I processed your request. Please check the results.';
      setMessages((prev) => [
        ...prev,
        { role: 'agent', content: text, timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) },
      ]);
    } catch {
      setError('Failed to reach the agent. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#6D5DFD]/10 border border-[#6D5DFD]/20 flex items-center justify-center">
            <Bot size={18} className="text-[#6D5DFD]" strokeWidth={1.8} />
          </div>
          <div>
            <h1 className="text-[22px] font-bold text-[#F0F4FF]">AI Agents</h1>
            <p className="text-[#4A5578] text-[12px]">6 intelligent agents · {AGENTS.filter(a => a.status === 'active').length} active</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#22FFAA]/8 border border-[#22FFAA]/15 rounded-xl">
          <div className="w-1.5 h-1.5 rounded-full bg-[#22FFAA] breathe" />
          <span className="text-[11px] font-semibold text-[#22FFAA]">{AGENTS.filter(a => a.status === 'active').length} Agents Running</span>
        </div>
      </div>

      <div className={cn('grid gap-4', selected ? 'grid-cols-5' : 'grid-cols-3')}>

        {/* Agent Cards */}
        <div className={cn('grid gap-4 content-start', selected ? 'col-span-2 grid-cols-1' : 'col-span-3 grid-cols-3')}>
          {AGENTS.map((agent, i) => (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => { setSelected(agent === selected ? null : agent); setMessages([]); setInput(''); setError(''); }}
              className={cn(
                'bg-[#0A1226] border rounded-2xl p-4 cursor-pointer transition-all',
                selected?.id === agent.id
                  ? 'border-[#6D5DFD]/40 bg-[#6D5DFD]/5'
                  : 'border-[#0F1D35] hover:border-[#162440]'
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', agent.bgColor)}>
                  <agent.icon size={18} className={agent.color} strokeWidth={1.8} />
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={cn('w-1.5 h-1.5 rounded-full', agent.status === 'active' ? 'bg-[#22FFAA] breathe' : 'bg-[#4A5578]')} />
                  <span className={cn('text-[10px] font-bold', agent.status === 'active' ? 'text-[#22FFAA]' : 'text-[#4A5578]')}>
                    {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
                  </span>
                </div>
              </div>

              <h3 className="text-[13px] font-bold text-[#F0F4FF] mb-0.5">{agent.name}</h3>
              <p className="text-[10px] font-semibold text-[#4A5578] uppercase tracking-wider mb-2">{agent.role}</p>
              {!selected && (
                <p className="text-[11px] text-[#8B9CC0] line-clamp-2 mb-3">{agent.description}</p>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-[#0F1D35]">
                <div className="flex items-center gap-3 text-[10px] text-[#4A5578]">
                  <span className="tabular-nums">{agent.tasksCompleted} tasks</span>
                  <span className={cn('font-bold', agent.color)}>{agent.confidence}% conf.</span>
                </div>
                {agent.lastRun && <span className="text-[10px] text-[#4A5578]">{agent.lastRun}</span>}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Agent Chat Panel */}
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="col-span-3 bg-[#0A1226] border border-[#0F1D35] rounded-2xl flex flex-col overflow-hidden"
              style={{ height: 'calc(100vh - 200px)' }}
            >
              {/* Chat Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#0F1D35] flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center', selected.bgColor)}>
                    <selected.icon size={16} className={selected.color} strokeWidth={1.8} />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-[#F0F4FF]">{selected.name}</p>
                    <p className="text-[10px] text-[#4A5578]">{selected.role} · {selected.confidence}% confidence</p>
                  </div>
                </div>
                <button onClick={() => { setSelected(null); setMessages([]); }} className="p-1.5 rounded-lg hover:bg-[#0D1530] text-[#4A5578] hover:text-[#8B9CC0] transition-colors">
                  <X size={14} strokeWidth={2} />
                </button>
              </div>

              {/* Capabilities */}
              <div className="px-5 py-3 border-b border-[#0F1D35] flex-shrink-0">
                <div className="flex flex-wrap gap-2">
                  {selected.capabilities.map((c) => (
                    <span key={c} className="text-[10px] font-semibold px-2 py-0.5 bg-[#0D1530] border border-[#162440] rounded-full text-[#8B9CC0]">{c}</span>
                  ))}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                {messages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center gap-3">
                    <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center', selected.bgColor)}>
                      <selected.icon size={24} className={selected.color} strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-[#F0F4FF]">{selected.name}</p>
                      <p className="text-[12px] text-[#4A5578] mt-1 max-w-xs">{selected.description}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2 w-full max-w-sm">
                      {selected.capabilities.slice(0, 4).map((c) => (
                        <button
                          key={c}
                          onClick={() => setInput(c)}
                          className="text-[11px] text-left px-3 py-2 bg-[#07101F] border border-[#0F1D35] rounded-xl text-[#8B9CC0] hover:border-[#162440] hover:text-[#F0F4FF] transition-colors"
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((msg, i) => (
                  <div key={i} className={cn('flex gap-3', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
                    <div className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold',
                      msg.role === 'user' ? 'bg-[#6D5DFD]/20 text-[#A99FFE]' : selected.bgColor
                    )}>
                      {msg.role === 'user' ? 'U' : <selected.icon size={12} className={selected.color} strokeWidth={2} />}
                    </div>
                    <div className={cn(
                      'max-w-[80%] rounded-2xl px-4 py-3 text-[12px] leading-relaxed',
                      msg.role === 'user' ? 'bg-[#6D5DFD]/15 text-[#F0F4FF]' : 'bg-[#07101F] border border-[#0F1D35] text-[#8B9CC0]'
                    )}>
                      {msg.content}
                      <p className="text-[9px] text-[#4A5578] mt-1">{msg.timestamp}</p>
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex gap-3">
                    <div className={cn('w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0', selected.bgColor)}>
                      <RefreshCw size={12} className={cn(selected.color, 'animate-spin')} strokeWidth={2} />
                    </div>
                    <div className="bg-[#07101F] border border-[#0F1D35] rounded-2xl px-4 py-3 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4A5578] animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4A5578] animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4A5578] animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="px-5 py-2 flex items-center gap-2 bg-[#FF5C7A]/8 border-t border-[#FF5C7A]/15 flex-shrink-0">
                  <AlertCircle size={12} className="text-[#FF5C7A]" strokeWidth={2} />
                  <p className="text-[11px] text-[#FF5C7A]">{error}</p>
                </div>
              )}

              {/* Input */}
              <div className="px-5 py-4 border-t border-[#0F1D35] flex-shrink-0">
                <div className="flex items-end gap-2">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder={`Ask ${selected.name}…`}
                    rows={2}
                    className="flex-1 px-4 py-3 bg-[#07101F] border border-[#0F1D35] rounded-xl text-[13px] text-[#F0F4FF] placeholder:text-[#4A5578] focus:outline-none focus:border-[#162440] resize-none"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || loading}
                    className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all',
                      input.trim() && !loading
                        ? 'bg-accent text-[#060a0e] shadow-[0_4px_12px_rgba(34,255,170,0.3)]'
                        : 'bg-[#07101F] border border-[#0F1D35] text-[#4A5578]'
                    )}
                  >
                    <Send size={14} strokeWidth={2.5} />
                  </button>
                </div>
                <p className="text-[10px] text-[#4A5578] mt-2">Press Enter to send · Shift+Enter for new line</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
