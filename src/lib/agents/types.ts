export type AgentId =
  | 'mission-architect'
  | 'outcome-planner'
  | 'experience-designer'
  | 'behavioral-analyst'
  | 'knowledge-agent'
  | 'insight-analyst';

// ── Mission Architect ─────────────────────────────────────────────────────────

export interface MissionArchitectInput {
  goal: string;
  audience: string;
  industry: string;
  duration: string;
  success_metric: string;
}

export interface MissionArchitectOutput {
  title: string;
  story_context: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimated_time: string;
  tags: string[];
  reward: string;
  steps: Array<{
    type: 'action' | 'reflection' | 'discovery';
    instruction: string;
    success_criteria: string;
  }>;
  rationale: string;
}

// ── Experience Designer ───────────────────────────────────────────────────────

export interface ExperienceDesignerInput {
  title: string;
  story_context: string;
  steps: Array<{
    type: string;
    instruction: string;
    success_criteria: string;
  }>;
  audience?: string;
}

export interface ExperienceDesignerOutput {
  improved_story: string;
  engagement_score: number;
  improvements: Array<{
    step_index: number;
    original: string;
    improved: string;
    reason: string;
  }>;
  narrative_tips: string[];
  motivation_hooks: string[];
}

// ── Behavioral Analyst ────────────────────────────────────────────────────────

export interface BehavioralAnalystInput {
  mission_title: string;
  total_attempts: number;
  total_completions: number;
  step_drop_offs: Array<{ step_index: number; step_label: string; drop_count: number }>;
  avg_time_minutes?: number;
}

export interface BehavioralAnalystOutput {
  friction_score: number;
  top_friction_point: string;
  drop_off_analysis: Array<{
    step_index: number;
    reason: string;
    recommendation: string;
  }>;
  overall_recommendations: string[];
  predicted_lift_pct: number;
}

// ── Outcome Planner ───────────────────────────────────────────────────────────

export interface OutcomePlannerInput {
  desired_outcome: string;
  current_state?: string;
  audience: string;
  industry: string;
  timeline_weeks: number;
  constraints?: string;
}

export interface OutcomePlannerOutput {
  roadmap_title: string;
  outcome_definition: string;
  success_milestones: Array<{
    week: number;
    milestone: string;
    measurement: string;
  }>;
  mission_sequence: Array<{
    phase: number;
    mission_type: string;
    purpose: string;
    estimated_duration: string;
    prerequisite_phase: number | null;
  }>;
  risk_factors: string[];
  predicted_timeline_weeks: number;
  confidence_pct: number;
  key_assumptions: string[];
}

// ── Knowledge Agent ───────────────────────────────────────────────────────────

export interface KnowledgeAgentInput {
  query: string;
  context?: string;
  node_types?: string[];
  max_recommendations?: number;
}

export interface KnowledgeAgentOutput {
  answer: string;
  reasoning: string;
  recommendations: Array<{
    label: string;
    node_type: string;
    relationship: string;
    confidence_pct: number;
    rationale: string;
  }>;
  related_concepts: string[];
  knowledge_gaps: string[];
}

// ── Insight Analyst ───────────────────────────────────────────────────────────

export interface InsightAnalystInput {
  tenant_name: string;
  period_days: number;
  total_missions: number;
  active_missions: number;
  total_users: number;
  total_attempts: number;
  total_completions: number;
  completion_rate_pct: number;
  top_missions: Array<{ title: string; completions: number; rate_pct: number }>;
}

export interface InsightAnalystOutput {
  headline: string;
  summary: string;
  key_findings: string[];
  opportunities: string[];
  risks: string[];
  recommended_actions: string[];
  roi_narrative: string;
}
