import { describe, it, expect, vi } from 'vitest';

// runHeuristicCheck is pure, but the module imports the Supabase server client at
// top level (used by other exports). Stub it so importing here needs no Next runtime.
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({}) }));

const { runHeuristicCheck } = await import('./constitution');

describe('runHeuristicCheck', () => {
  it('rejects reject-severity anti-patterns', () => {
    const r = runHeuristicCheck('maximize engagement and screen time at all costs');
    expect(r.verdict).toBe('rejected');
    expect(r.redFlags.length).toBeGreaterThan(0);
  });

  it('rejects addictive / manipulative designs', () => {
    expect(runHeuristicCheck('build an addictive compulsive loop').verdict).toBe('rejected');
    expect(runHeuristicCheck('use dark patterns and deceptive manipulation').verdict).toBe('rejected');
  });

  it('flags (not rejects) softer anti-patterns like artificial urgency', () => {
    const r = runHeuristicCheck('add artificial urgency and FOMO to the checkout');
    expect(r.redFlags.length).toBeGreaterThan(0);
    expect(r.verdict).not.toBe('approved');
  });

  it('approves a values-aligned, benign action', () => {
    const r = runHeuristicCheck(
      'Create an inclusive, accessible community mission that fosters learning and wellbeing',
    );
    expect(r.verdict).toBe('approved');
    expect(r.redFlags).toHaveLength(0);
  });

  it('produces a constitutional score in range 0..7', () => {
    const r = runHeuristicCheck('a neutral mission');
    expect(r.constitutionalScore).toBeGreaterThanOrEqual(0);
    expect(r.constitutionalScore).toBeLessThanOrEqual(7);
  });
});
