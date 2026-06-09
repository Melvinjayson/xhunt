export type StepType = 'action' | 'reflection' | 'discovery';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Step {
  id: number;
  type: StepType;
  instruction: string;
  success_criteria: string;
}

export interface Hunt {
  id: string;
  title: string;
  story_context: string;
  difficulty: Difficulty;
  estimated_time: string;
  steps: Step[];
  reward: string;
  tags: string[];
  createdAt?: string;
}

export interface HuntProgress {
  huntId: string;
  currentStepIndex: number;
  completedSteps: number[];
  startedAt: string;
  completedAt?: string;
}

export interface UserProfile {
  interests: string[];
  goals: string[];
  location?: string;
  onboardingComplete: boolean;
}

export interface CompletedHunt {
  huntId: string;
  huntTitle: string;
  reward: string;
  completedAt: string;
}

export interface AppState {
  user: UserProfile | null;
  hunts: Hunt[];
  progress: Record<string, HuntProgress>;
  completedHunts: CompletedHunt[];
  streak: number;
}
