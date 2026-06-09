export type Role = 'platform_admin' | 'tenant_admin' | 'mission_creator' | 'analyst' | 'participant';
export type MissionStatus = 'draft' | 'active' | 'published' | 'paused' | 'archived';
export type Plan = 'starter' | 'growth' | 'enterprise';
export type RewardType = 'points' | 'badge' | 'coupon' | 'experience' | 'benefit';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface DbTenant {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  plan: Plan;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DbUserProfile {
  id: string;
  tenant_id: string | null;
  role: Role;
  display_name: string | null;
  avatar_url: string | null;
  interests: string[];
  goals: string[];
  onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbMission {
  id: string;
  tenant_id: string;
  created_by: string | null;
  title: string;
  story_context: string | null;
  difficulty: 'easy' | 'medium' | 'hard';
  estimated_time: string | null;
  steps: DbStep[];
  reward: string;
  tags: string[];
  status: MissionStatus;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbStep {
  id: number;
  type: 'action' | 'reflection' | 'discovery';
  instruction: string;
  success_criteria: string;
}

export interface DbMissionProgress {
  id: string;
  user_id: string;
  mission_id: string;
  tenant_id: string | null;
  current_step_index: number;
  completed_steps: number[];
  started_at: string;
  completed_at: string | null;
}

export interface DbRewardEvent {
  id: string;
  user_id: string;
  mission_id: string;
  tenant_id: string | null;
  reward_type: string;
  reward_value: Record<string, unknown>;
  redeemed: boolean;
  issued_at: string;
}

// ── Sprint 2 ──────────────────────────────────────────────────────────────────

export interface DbAudienceSegment {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  filters: AudienceFilters;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AudienceFilters {
  roles?: Role[];
  interests?: string[];
  geography?: string[];
  tags?: string[];
}

export interface DbRewardConfig {
  id: string;
  tenant_id: string;
  name: string;
  type: RewardType;
  value: RewardConfigValue;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RewardConfigValue {
  points?: number;
  badge_icon?: string;
  badge_label?: string;
  coupon_code?: string;
  discount_pct?: number;
  description?: string;
}

export interface DbAuditLog {
  id: string;
  tenant_id: string | null;
  user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface DbMissionApproval {
  id: string;
  mission_id: string;
  tenant_id: string;
  status: ApprovalStatus;
  reviewer_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ── Phase 2 ───────────────────────────────────────────────────────────────────

export type KgNodeType = 'user' | 'skill' | 'mission' | 'outcome' | 'reward' | 'organization' | 'industry';
export type KgRelationship = 'completes' | 'requires' | 'develops' | 'unlocks' | 'leads_to' | 'similar_to';
export type OutcomeType = 'skill_acquired' | 'task_completed' | 'product_adopted' | 'behavior_changed' | 'custom';

export interface DbKgNode {
  id: string;
  tenant_id: string | null;
  node_type: KgNodeType;
  label: string;
  properties: Record<string, unknown>;
  created_at: string;
}

export interface DbKgEdge {
  id: string;
  tenant_id: string | null;
  from_node_id: string;
  to_node_id: string;
  relationship: KgRelationship | string;
  weight: number;
  created_at: string;
}

export interface DbMissionScore {
  id: string;
  mission_id: string;
  tenant_id: string | null;
  completion_score: number;
  engagement_score: number;
  retention_score: number;
  outcome_score: number;
  mei: number;
  sample_size: number;
  computed_at: string;
}

export interface DbOutcomeEvent {
  id: string;
  tenant_id: string | null;
  mission_id: string | null;
  user_id: string | null;
  outcome_type: OutcomeType | string;
  outcome_value: Record<string, unknown>;
  measured_at: string;
}

export interface DbOutcomeRoadmap {
  id: string;
  tenant_id: string;
  created_by: string | null;
  desired_outcome: string;
  roadmap: Record<string, unknown>;
  created_at: string;
}
