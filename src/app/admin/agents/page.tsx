'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Target, TrendingUp, Brain, BookOpen, BarChart3,
  Play, Loader2, AlertCircle, ChevronDown, ChevronUp, CheckCircle2,
  Coins, Compass, Users2, ShieldAlert, Leaf, Wrench, Cpu,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import type { AgentId } from '@/lib/agents/types';

interface AgentDef {
  id: AgentId;
  name: string;
  tagline: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
  badge?: string;
  inputs: Array<{ key: string; label: string; placeholder: string; type: 'text' | 'textarea' | 'number' }>;
  endpoint: string;
}

const AGENT_GROUPS: Array<{ label: string; description: string; agents: AgentDef[] }> = [
  {
    label: 'Experience Intelligence',
    description: 'Design, optimise, and validate mission experiences',
    agents: [
      {
        id: 'mission-architect',
        name: 'Mission Architect',
        tagline: 'Converts goals into missions',
        description: 'Takes an organizational goal and produces a complete mission blueprint — steps, difficulty, rewards, and rationale.',
        icon: Target, color: 'text-[#6D5DFD]', bg: 'bg-[#001a22]', border: 'border-[#0a3040]',
        endpoint: '/api/agents/mission-architect',
        inputs: [
          { key: 'goal', label: 'Goal', placeholder: 'e.g. Increase customer activation', type: 'text' },
          { key: 'audience', label: 'Audience', placeholder: 'e.g. New users', type: 'text' },
          { key: 'industry', label: 'Industry', placeholder: 'e.g. Fintech', type: 'text' },
          { key: 'duration', label: 'Duration', placeholder: 'e.g. 7 Days', type: 'text' },
          { key: 'success_metric', label: 'Success Metric', placeholder: 'e.g. First transaction completed', type: 'text' },
        ],
      },
      {
        id: 'outcome-planner',
        name: 'Outcome Planner',
        tagline: 'Works backwards from outcomes',
        description: 'Takes a desired business outcome and generates a full mission roadmap — milestones, mission sequence, risks, and timeline.',
        icon: TrendingUp, color: 'text-accent', bg: 'bg-accent-light', border: 'border-[#004d2a]',
        endpoint: '/api/agents/outcome-planner',
        inputs: [
          { key: 'desired_outcome', label: 'Desired Outcome', placeholder: 'e.g. Improve retention by 20%', type: 'text' },
          { key: 'current_state', label: 'Current State', placeholder: 'e.g. 60% 30-day retention', type: 'text' },
          { key: 'audience', label: 'Audience', placeholder: 'e.g. Paid subscribers', type: 'text' },
          { key: 'industry', label: 'Industry', placeholder: 'e.g. SaaS', type: 'text' },
          { key: 'timeline_weeks', label: 'Timeline (weeks)', placeholder: '12', type: 'number' },
          { key: 'constraints', label: 'Constraints', placeholder: 'e.g. No email campaigns', type: 'text' },
        ],
      },
      {
        id: 'experience-designer',
        name: 'Experience Designer',
        tagline: 'Optimises engagement & narrative',
        description: 'Reviews an existing mission and rewrites it for maximum engagement, motivation, and storytelling quality.',
        icon: Sparkles, color: 'text-[#818cf8]', bg: 'bg-[#0f0f2a]', border: 'border-[#1a1a3a]',
        endpoint: '/api/agents/experience-designer',
        inputs: [
          { key: 'title', label: 'Mission Title', placeholder: 'Existing mission title', type: 'text' },
          { key: 'story_context', label: 'Story / Description', placeholder: 'Existing story', type: 'textarea' },
          { key: 'audience', label: 'Audience', placeholder: 'Who is this for?', type: 'text' },
          { key: 'steps_json', label: 'Steps (JSON array)', placeholder: '[{"type":"action","instruction":"...","success_criteria":"..."}]', type: 'textarea' },
        ],
      },
      {
        id: 'behavioral-analyst',
        name: 'Behavioral Analyst',
        tagline: 'Diagnoses friction & drop-offs',
        description: 'Analyses user behaviour data for a mission and identifies exactly where friction occurs, with recommendations to lift completion.',
        icon: Brain, color: 'text-[#fb923c]', bg: 'bg-[#1a0f00]', border: 'border-[#2a1800]',
        endpoint: '/api/agents/behavioral-analyst',
        inputs: [
          { key: 'mission_title', label: 'Mission Title', placeholder: 'Mission name', type: 'text' },
          { key: 'total_attempts', label: 'Total Attempts', placeholder: '150', type: 'number' },
          { key: 'total_completions', label: 'Total Completions', placeholder: '87', type: 'number' },
          { key: 'avg_time_minutes', label: 'Avg Time (mins)', placeholder: '32', type: 'number' },
        ],
      },
    ],
  },
  {
    label: 'Analytics & Knowledge',
    description: 'Surface intelligence, patterns, and strategic insights',
    agents: [
      {
        id: 'knowledge-agent',
        name: 'Knowledge Agent',
        tagline: 'Mission intelligence & recommendations',
        description: 'Answers strategic questions about mission design, user engagement patterns, and best practices using its knowledge graph.',
        icon: BookOpen, color: 'text-[#2dd4bf]', bg: 'bg-[#001a1a]', border: 'border-[#002a2a]',
        endpoint: '/api/agents/knowledge-agent',
        inputs: [
          { key: 'query', label: 'Query', placeholder: 'e.g. Which mission types work best for new employee onboarding?', type: 'textarea' },
          { key: 'context', label: 'Context (optional)', placeholder: 'Any relevant context about your org or audience', type: 'textarea' },
        ],
      },
      {
        id: 'insight-analyst',
        name: 'Insight Analyst',
        tagline: 'Executive intelligence reports',
        description: 'Synthesises workspace analytics into an executive intelligence report with findings, opportunities, risks, and recommendations.',
        icon: BarChart3, color: 'text-[#fbbf24]', bg: 'bg-[#2a1a00]', border: 'border-[#3a2500]',
        endpoint: '/api/agents/insight-analyst',
        inputs: [
          { key: 'tenant_name', label: 'Organisation Name', placeholder: 'Acme Corp', type: 'text' },
          { key: 'period_days', label: 'Period (days)', placeholder: '30', type: 'number' },
          { key: 'total_missions', label: 'Total Missions', placeholder: '12', type: 'number' },
          { key: 'active_missions', label: 'Active Missions', placeholder: '8', type: 'number' },
          { key: 'total_users', label: 'Total Users', placeholder: '240', type: 'number' },
          { key: 'total_attempts', label: 'Total Attempts', placeholder: '850', type: 'number' },
          { key: 'total_completions', label: 'Total Completions', placeholder: '623', type: 'number' },
          { key: 'completion_rate_pct', label: 'Completion Rate %', placeholder: '73', type: 'number' },
        ],
      },
    ],
  },
  {
    label: 'Economy Protocol Agents',
    description: 'Coordinate value creation across contribution, trust, identity, and matching primitives',
    agents: [
      {
        id: 'economy-coordinator',
        name: 'Economy Coordinator',
        tagline: 'Participation economy intelligence',
        description: 'Synthesises identity, contribution, and trust signals into actionable coordination intelligence. Evaluates double materiality and enforces anti-objectives.',
        icon: Coins, color: 'text-[#22FFAA]', bg: 'bg-[#001a10]', border: 'border-[#003a20]',
        badge: 'Economy',
        endpoint: '/api/agents/economy-coordinator',
        inputs: [
          { key: 'context', label: 'Context', placeholder: 'opportunity_match | contribution_review | trust_assessment | coordination_design', type: 'text' },
          { key: 'objective', label: 'Objective', placeholder: 'e.g. Find best collaboration opportunities for this user', type: 'textarea' },
          { key: 'currentSkills_json', label: 'Current Skills (JSON array)', placeholder: '["design","research","writing"]', type: 'textarea' },
          { key: 'trustScores_json', label: 'Trust Scores (JSON object)', placeholder: '{"skill":72,"reliability":85,"ethical":90}', type: 'textarea' },
        ],
      },
      {
        id: 'discovery-agent',
        name: 'Discovery Agent',
        tagline: 'Meaningful opportunity discovery',
        description: 'Finds meaningful experiences prioritizing learning value and community impact. Ensures diverse recommendations — never optimises for popularity.',
        icon: Compass, color: 'text-[#2dd4bf]', bg: 'bg-[#001a1a]', border: 'border-[#003030]',
        badge: 'Participant',
        endpoint: '/api/agents/discovery-agent',
        inputs: [
          { key: 'goals_json', label: 'Goals (JSON array)', placeholder: '["learn data analysis","contribute to community"]', type: 'textarea' },
          { key: 'currentSkills_json', label: 'Skills (JSON array)', placeholder: '["python","statistics"]', type: 'textarea' },
          { key: 'interests_json', label: 'Interests (JSON array)', placeholder: '["climate","education","open source"]', type: 'textarea' },
          { key: 'location', label: 'Location (optional)', placeholder: 'e.g. Lagos, Nigeria', type: 'text' },
        ],
      },
      {
        id: 'community-catalyst',
        name: 'Community Catalyst',
        tagline: 'Social capital & collaboration intelligence',
        description: 'Identifies genuine collaboration opportunities and strengthens social capital. Maps feedback loops and second-order effects explicitly.',
        icon: Users2, color: 'text-[#fb923c]', bg: 'bg-[#1a0a00]', border: 'border-[#2a1400]',
        badge: 'Community',
        endpoint: '/api/agents/community-catalyst',
        inputs: [
          { key: 'communityContext', label: 'Community Context', placeholder: 'Describe the community, its goals, and current state', type: 'textarea' },
          { key: 'focusArea', label: 'Focus Area (optional)', placeholder: 'e.g. civic participation, local economy, education', type: 'text' },
        ],
      },
    ],
  },
  {
    label: 'Governance & Constitutional Agents',
    description: 'Protect platform integrity, evaluate sustainability, and design new agents',
    agents: [
      {
        id: 'trust-guardian',
        name: 'Trust Guardian',
        tagline: 'Constitutional alignment evaluator',
        description: 'Evaluates any proposed action against the X-Hunt Constitutional Framework. Applies the 7-question test, double materiality, and anti-pattern detection.',
        icon: ShieldAlert, color: 'text-[#ff5c7a]', bg: 'bg-[#2a0010]', border: 'border-[#3a0018]',
        badge: 'Governance',
        endpoint: '/api/agents/trust-guardian',
        inputs: [
          { key: 'proposedAction', label: 'Proposed Action', placeholder: 'Describe the feature, policy, or decision to evaluate', type: 'textarea' },
          { key: 'actionType', label: 'Action Type', placeholder: 'feature | recommendation | policy | agent_behavior | data_usage | gamification', type: 'text' },
          { key: 'stakeholders_json', label: 'Stakeholders (JSON array)', placeholder: '["users","communities","regulators"]', type: 'textarea' },
        ],
      },
      {
        id: 'sustainability-navigator',
        name: 'Sustainability Navigator',
        tagline: 'Environmental & social impact assessment',
        description: 'Assesses environmental and social sustainability of missions. Evidence-informed SDG alignment scoring. Explicit greenwashing risk analysis.',
        icon: Leaf, color: 'text-[#4ade80]', bg: 'bg-[#001a0a]', border: 'border-[#003018]',
        badge: 'Sustainability',
        endpoint: '/api/agents/sustainability-navigator',
        inputs: [
          { key: 'missionContext', label: 'Mission Context', placeholder: 'Describe the mission and its activities', type: 'textarea' },
          { key: 'activityType', label: 'Activity Type', placeholder: 'e.g. community cleanup, skill-sharing, digital creation', type: 'text' },
          { key: 'participantCount', label: 'Participant Count', placeholder: '50', type: 'number' },
          { key: 'geographicalContext', label: 'Geographical Context', placeholder: 'e.g. urban Lagos, rural Kenya', type: 'text' },
        ],
      },
      {
        id: 'agent-foundry',
        name: 'Agent Foundry',
        tagline: 'Design new constitutional agents',
        description: 'Produces complete agent specifications following the 11-step framework. Auto-registers approved agents pending human review. Admin-only.',
        icon: Wrench, color: 'text-[#a78bfa]', bg: 'bg-[#0f0a1a]', border: 'border-[#1a1030]',
        badge: 'Meta',
        endpoint: '/api/agents/agent-foundry',
        inputs: [
          { key: 'agentName', label: 'Agent Name', placeholder: 'e.g. Local Economy Activator', type: 'text' },
          { key: 'purpose', label: 'Purpose', placeholder: 'What this agent does and why', type: 'textarea' },
          { key: 'category', label: 'Category', placeholder: 'participant_intelligence | community_intelligence | governance | sustainability | analytics', type: 'text' },
          { key: 'problemContext', label: 'Problem Context', placeholder: 'The specific problem this agent solves', type: 'textarea' },
          { key: 'stakeholders_json', label: 'Stakeholders (JSON array)', placeholder: '["local businesses","community members"]', type: 'textarea' },
        ],
      },
    ],
  },
];

function AgentCard({ agent }: { agent: AgentDef }) {
  const [expanded, setExpanded] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');
  const Icon = agent.icon;

  function setValue(key: string, val: string) {
    setValues((p) => ({ ...p, [key]: val }));
    setResult(null);
    setError('');
  }

  async function run() {
    setRunning(true);
    setError('');
    setResult(null);

    try {
      let body: Record<string, unknown> = {};

      if (agent.id === 'experience-designer') {
        let parsedSteps: unknown[] = [];
        try { parsedSteps = JSON.parse(values['steps_json'] ?? '[]'); } catch {}
        body = { title: values['title'], story_context: values['story_context'], audience: values['audience'], steps: parsedSteps };
      } else if (agent.id === 'economy-coordinator') {
        let skills: string[] = [];
        let trustScores: Record<string, number> = {};
        try { skills = JSON.parse(values['currentSkills_json'] ?? '[]'); } catch {}
        try { trustScores = JSON.parse(values['trustScores_json'] ?? '{}'); } catch {}
        body = { context: values['context'], objective: values['objective'], currentSkills: skills, trustScores, contributionHistory: [] };
      } else if (agent.id === 'discovery-agent') {
        let goals: string[] = [];
        let currentSkills: string[] = [];
        let interests: string[] = [];
        try { goals = JSON.parse(values['goals_json'] ?? '[]'); } catch {}
        try { currentSkills = JSON.parse(values['currentSkills_json'] ?? '[]'); } catch {}
        try { interests = JSON.parse(values['interests_json'] ?? '[]'); } catch {}
        body = { goals, currentSkills, interests, location: values['location'] };
      } else if (agent.id === 'community-catalyst') {
        body = { communityContext: values['communityContext'], focusArea: values['focusArea'], activeMissions: [], participantCohort: [] };
      } else if (agent.id === 'trust-guardian') {
        let stakeholders: string[] = [];
        try { stakeholders = JSON.parse(values['stakeholders_json'] ?? '[]'); } catch {}
        body = { proposedAction: values['proposedAction'], actionType: values['actionType'], stakeholders, context: {} };
      } else if (agent.id === 'sustainability-navigator') {
        body = { missionContext: values['missionContext'], activityType: values['activityType'], participantCount: Number(values['participantCount'] ?? 0), geographicalContext: values['geographicalContext'] };
      } else if (agent.id === 'agent-foundry') {
        let stakeholders: string[] = [];
        try { stakeholders = JSON.parse(values['stakeholders_json'] ?? '[]'); } catch {}
        body = { agentName: values['agentName'], purpose: values['purpose'], category: values['category'], problemContext: values['problemContext'], stakeholders };
      } else {
        agent.inputs.forEach(({ key, type }) => {
          const v = values[key] ?? '';
          body[key] = type === 'number' ? Number(v) : v;
        });
      }

      const res = await fetch(agent.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error ?? `Request failed ${res.status}`);
      }

      setResult(await res.json() as Record<string, unknown>);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Agent failed');
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className={cn('bg-[#111927] border rounded-2xl overflow-hidden transition-all', agent.border)}>
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center gap-4 p-5 text-left hover:bg-[#162030] transition-colors"
      >
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', agent.bg)}>
          <Icon size={20} className={agent.color} strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[15px] font-bold text-[#e8f0fe]">{agent.name}</p>
            {agent.badge && (
              <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full border', agent.color,
                agent.bg, agent.border
              )}>{agent.badge}</span>
            )}
            {result !== null && <CheckCircle2 size={14} className="text-accent" strokeWidth={2} />}
          </div>
          <p className="text-[12px] text-[#7a8fa8]">{agent.tagline}</p>
        </div>
        {expanded
          ? <ChevronUp size={16} className="text-[#3d5068] flex-shrink-0" strokeWidth={2} />
          : <ChevronDown size={16} className="text-[#3d5068] flex-shrink-0" strokeWidth={2} />
        }
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t border-[#1c2a3a] pt-4">
              <p className="text-[13px] text-[#7a8fa8] mb-4 leading-relaxed">{agent.description}</p>

              <div className={cn('grid gap-3 mb-4', agent.inputs.length <= 2 ? 'grid-cols-1' : 'grid-cols-2')}>
                {agent.inputs.map(({ key, label, placeholder, type }) => (
                  <div key={key} className={type === 'textarea' ? 'col-span-2' : ''}>
                    <label className="text-[11px] font-bold text-[#7a8fa8] uppercase tracking-wider mb-1.5 block">{label}</label>
                    {type === 'textarea' ? (
                      <textarea
                        value={values[key] ?? ''}
                        onChange={(e) => setValue(key, e.target.value)}
                        placeholder={placeholder}
                        rows={2}
                        className="w-full bg-[#0f1824] border border-[#1c2a3a] rounded-xl px-3 py-2.5 text-[#e8f0fe] placeholder-[#3d5068] text-[13px] focus:outline-none focus:border-accent transition-colors resize-none"
                      />
                    ) : (
                      <input
                        type={type}
                        value={values[key] ?? ''}
                        onChange={(e) => setValue(key, e.target.value)}
                        placeholder={placeholder}
                        className="w-full h-9 bg-[#0f1824] border border-[#1c2a3a] rounded-xl px-3 text-[#e8f0fe] placeholder-[#3d5068] text-[13px] focus:outline-none focus:border-accent transition-colors"
                      />
                    )}
                  </div>
                ))}
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-[#2a0a0a] border border-[#ff5252]/30 rounded-xl px-3 py-2 mb-4">
                  <AlertCircle size={13} className="text-[#ff5252]" strokeWidth={2} />
                  <p className="text-[12px] text-[#ff5252]">{error}</p>
                </div>
              )}

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={run}
                disabled={running}
                className={cn(
                  'flex items-center gap-2 h-9 px-4 rounded-xl font-semibold text-[13px] transition-all disabled:opacity-60 mb-4',
                  agent.bg, agent.color, 'shadow-[0_4px_12px_rgba(0,0,0,0.3)]'
                )}
              >
                {running ? <Loader2 size={14} strokeWidth={2} className="animate-spin" /> : <Play size={14} strokeWidth={2} />}
                {running ? 'Running…' : `Run ${agent.name}`}
              </motion.button>

              {result !== null && (
                <div className="bg-[#0a1020] border border-[#1c2a3a] rounded-xl p-4 max-h-[520px] overflow-y-auto">
                  <p className="text-[10px] font-bold text-[#3d5068] uppercase tracking-wider mb-3">Agent Response</p>
                  <AgentResult agentId={agent.id} result={result} accentColor={agent.color} />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AgentResult({ agentId, result, accentColor }: { agentId: AgentId; result: Record<string, unknown>; accentColor: string }) {
  const r = result;

  if (agentId === 'mission-architect') {
    return (
      <div className="flex flex-col gap-3 text-[13px]">
        <div>
          <p className={cn('text-[16px] font-bold mb-0.5', accentColor)}>{r.title as string}</p>
          <p className="text-[#7a8fa8]">{r.story_context as string}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {((r.tags ?? []) as string[]).map((t) => <span key={t} className="px-2 py-0.5 bg-[#162030] text-[#7a8fa8] rounded-full text-[10px]">{t}</span>)}
        </div>
        <div className="flex flex-col gap-2">
          {((r.steps ?? []) as Array<{ type: string; instruction: string }>).map((s, i) => (
            <div key={i} className="flex gap-2 items-start">
              <span className="text-[10px] text-[#3d5068] font-bold w-5 flex-shrink-0 mt-0.5">#{i + 1}</span>
              <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0',
                s.type === 'action' ? 'text-[#fb923c] bg-[#1a0f00]' :
                  s.type === 'reflection' ? 'text-[#818cf8] bg-[#0f0f2a]' :
                    'text-[#2dd4bf] bg-[#001a1a]'
              )}>{s.type}</span>
              <p className="text-[#e8f0fe]">{s.instruction}</p>
            </div>
          ))}
        </div>
        {r.rationale != null && <p className="text-[12px] text-[#7a8fa8] italic border-t border-[#1c2a3a] pt-3">{String(r.rationale)}</p>}
      </div>
    );
  }

  if (agentId === 'trust-guardian') {
    const o = r.output as Record<string, unknown> ?? r;
    const verdict = o.verdict as string;
    const assessment = o.constitutional_assessment as Record<string, unknown> ?? {};
    return (
      <div className="flex flex-col gap-3 text-[13px]">
        <div className={cn('inline-flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold text-[12px] self-start',
          verdict === 'approved' ? 'bg-[#002918] text-[#22FFAA] border border-[#004d2a]' :
          verdict === 'flagged' ? 'bg-[#2a1a00] text-[#fbbf24] border border-[#3a2500]' :
          'bg-[#2a0a0a] text-[#ff5252] border border-[#3a1010]'
        )}>
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          Verdict: {verdict?.toUpperCase() ?? 'UNKNOWN'}
        </div>
        <p className="text-[#e8f0fe] leading-relaxed">{o.recommendation as string}</p>
        <div className="grid grid-cols-2 gap-1.5">
          {Object.entries(assessment).filter(([k]) => k !== 'score').map(([k, v]) => (
            <div key={k} className={cn('flex items-center gap-1.5 text-[11px]', v ? 'text-[#22FFAA]' : 'text-[#ff5252]')}>
              <span>{v ? '✓' : '✗'}</span>
              <span>{k.replace(/_/g, ' ')}</span>
            </div>
          ))}
        </div>
        {((o.red_flags ?? []) as string[]).length > 0 && (
          <div>
            <p className="text-[11px] font-bold text-[#ff5252] uppercase tracking-wider mb-1">Red Flags</p>
            {((o.red_flags ?? []) as string[]).map((f, i) => <p key={i} className="text-[12px] text-[#7a8fa8]">· {f}</p>)}
          </div>
        )}
      </div>
    );
  }

  if (agentId === 'sustainability-navigator') {
    const score = r.sustainability_score as number;
    return (
      <div className="flex flex-col gap-3 text-[13px]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#001a0a] border-2 border-[#4ade80]/40 flex items-center justify-center">
            <span className="text-[#4ade80] font-bold text-[14px]">{score}</span>
          </div>
          <div>
            <p className="text-[#e8f0fe] font-semibold">Sustainability Score</p>
            <p className="text-[#7a8fa8] text-[11px]">{r.greenwashing_risk as string}</p>
          </div>
        </div>
        {((r.sdg_alignment ?? []) as Array<{ goal: string; score: number }>).slice(0, 4).map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-[#162030] rounded-full overflow-hidden">
              <div className="h-full bg-[#4ade80] rounded-full" style={{ width: `${s.score}%` }} />
            </div>
            <span className="text-[11px] text-[#7a8fa8] w-28 text-right truncate">{s.goal}</span>
          </div>
        ))}
        <pre className="text-[11px] text-[#7a8fa8] whitespace-pre-wrap break-all leading-relaxed border-t border-[#1c2a3a] pt-3">
          {JSON.stringify({ environmental_impact: r.environmental_impact, behavior_incentives: r.behavior_incentives }, null, 2)}
        </pre>
      </div>
    );
  }

  if (agentId === 'knowledge-agent') {
    return (
      <div className="flex flex-col gap-3 text-[13px]">
        <p className="text-[#e8f0fe] leading-relaxed">{r.answer as string}</p>
        <p className="text-[#7a8fa8] text-[12px] italic">{r.reasoning as string}</p>
        {((r.recommendations ?? []) as Array<{ label: string; confidence_pct: number; rationale: string }>).map((rec, i) => (
          <div key={i} className="bg-[#111927] border border-[#1c2a3a] rounded-xl p-3">
            <div className="flex items-center justify-between mb-1">
              <p className={cn('font-bold', accentColor)}>{rec.label}</p>
              <span className="text-[11px] text-[#7a8fa8]">{rec.confidence_pct}%</span>
            </div>
            <p className="text-[#7a8fa8] text-[12px]">{rec.rationale}</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <pre className="text-[11px] text-[#7a8fa8] whitespace-pre-wrap break-all leading-relaxed">
      {JSON.stringify(result, null, 2)}
    </pre>
  );
}

export default function AdminAgentsPage() {
  const totalAgents = AGENT_GROUPS.reduce((acc, g) => acc + g.agents.length, 0);

  return (
    <div className="p-8 max-w-[900px]">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-[#6D5DFD]/15 border border-[#6D5DFD]/25 flex items-center justify-center">
            <Cpu size={18} className="text-[#A99FFE]" strokeWidth={1.8} />
          </div>
          <h1 className="text-[28px] font-bold text-[#e8f0fe]">AI Agent Center</h1>
        </div>
        <p className="text-[#7a8fa8] text-sm mt-0.5 ml-12">
          {totalAgents} specialized agents — constitutionally governed, double-materiality evaluated
        </p>
      </div>

      {/* Agent Groups */}
      <div className="flex flex-col gap-10">
        {AGENT_GROUPS.map(({ label, description, agents }) => (
          <div key={label}>
            <div className="mb-4">
              <h2 className="text-[13px] font-bold text-[#e8f0fe] uppercase tracking-wider">{label}</h2>
              <p className="text-[12px] text-[#4A5578] mt-0.5">{description}</p>
            </div>
            <div className="flex flex-col gap-3">
              {agents.map((agent) => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
