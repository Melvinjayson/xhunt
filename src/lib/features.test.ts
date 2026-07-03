import { describe, it, expect } from 'vitest';
import { getDefaultConfig, mergeFeatureConfig, MATURITY_DEFAULTS } from './features';

describe('getDefaultConfig', () => {
  it('maps known plans to their tier', () => {
    expect(getDefaultConfig('starter').maturity).toBe('starter');
    expect(getDefaultConfig('growth').maturity).toBe('growth');
    expect(getDefaultConfig('enterprise').maturity).toBe('enterprise');
  });

  it('falls back to starter for unknown plans', () => {
    expect(getDefaultConfig('nonsense').maturity).toBe('starter');
    expect(getDefaultConfig('').maturity).toBe('starter');
  });

  it('gates features by tier — starter locks enterprise-only nav', () => {
    const starter = getDefaultConfig('starter');
    expect(starter.nav.economy).toBe(false);
    expect(starter.nav.governance).toBe(false);
    expect(starter.nav.xilHub).toBe(false);
    // enterprise unlocks them
    const ent = getDefaultConfig('enterprise');
    expect(ent.nav.economy).toBe(true);
    expect(ent.nav.governance).toBe(true);
    expect(ent.nav.xilHub).toBe(true);
  });
});

describe('mergeFeatureConfig', () => {
  it('overrides only the provided nested keys, preserving the rest', () => {
    const base = MATURITY_DEFAULTS.starter;
    const merged = mergeFeatureConfig(base, { nav: { ...base.nav, economy: true } });
    expect(merged.nav.economy).toBe(true);       // overridden
    expect(merged.nav.outcomes).toBe(base.nav.outcomes); // preserved
    expect(merged.features).toEqual(base.features);      // untouched branch preserved
  });

  it('does not mutate the base config', () => {
    const base = getDefaultConfig('starter');
    const snapshot = JSON.parse(JSON.stringify(base));
    mergeFeatureConfig(base, { nav: { ...base.nav, governance: true } });
    expect(base).toEqual(snapshot);
  });
});
