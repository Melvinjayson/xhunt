import type { AppState, ImpactProfile, VerificationRecord, VerificationStatus } from './types';

const STORAGE_KEY = 'xhunt_v1';

export const initialState: AppState = {
  user: null,
  hunts: [],
  progress: {},
  completedHunts: [],
  streak: 0,
  savedHunts: [],
  verificationStatus: {},
};

export function loadState(): AppState {
  if (typeof window === 'undefined') return initialState;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    return { ...initialState, ...JSON.parse(raw) };
  } catch {
    return initialState;
  }
}

export function saveState(state: AppState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export function clearState(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

/** Toggle a mission saved/unsaved and persist. Returns new saved state. */
export function toggleSavedHunt(huntId: string): boolean {
  const state = loadState();
  const saved = state.savedHunts ?? [];
  const isSaved = saved.includes(huntId);
  const next = isSaved ? saved.filter((id) => id !== huntId) : [...saved, huntId];
  saveState({ ...state, savedHunts: next });
  return !isSaved;
}

/** Set verification status for a hunt and persist. */
export function setVerificationStatus(
  huntId: string,
  status: VerificationStatus,
  extra?: Partial<VerificationRecord>,
): void {
  const state = loadState();
  const existing = state.verificationStatus?.[huntId];
  const record: VerificationRecord = {
    huntId,
    status,
    submittedAt: existing?.submittedAt ?? new Date().toISOString(),
    ...extra,
  };
  saveState({
    ...state,
    verificationStatus: { ...(state.verificationStatus ?? {}), [huntId]: record },
  });
}

/** Get verification record for a hunt, or null. */
export function getVerificationStatus(huntId: string): VerificationRecord | null {
  const state = loadState();
  return state.verificationStatus?.[huntId] ?? null;
}

const PROFILE_KEY = 'xhunt_impact_v1';

export function loadProfile(): ImpactProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as ImpactProfile) : null;
  } catch { return null; }
}

export function saveProfile(p: ImpactProfile): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch {}
}

export function clearProfile(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(PROFILE_KEY);
}
