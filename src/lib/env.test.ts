import { describe, it, expect, vi, afterEach } from 'vitest';

// getJwtSecretKey caches its result at module scope, so each test resets the module
// registry and manages JWT_SECRET explicitly — order-independent regardless of what
// other test files set on process.env.
const ORIGINAL = process.env.JWT_SECRET;
afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = ORIGINAL;
  vi.resetModules();
});

describe('getJwtSecretKey — fail fast (C2)', () => {
  it('throws when JWT_SECRET is missing', async () => {
    vi.resetModules();
    delete process.env.JWT_SECRET;
    const { getJwtSecretKey } = await import('./env');
    expect(() => getJwtSecretKey()).toThrow(/JWT_SECRET/);
  });

  it('throws when JWT_SECRET is shorter than 32 chars', async () => {
    vi.resetModules();
    process.env.JWT_SECRET = 'too-short';
    const { getJwtSecretKey } = await import('./env');
    expect(() => getJwtSecretKey()).toThrow(/JWT_SECRET/);
  });

  it('returns a key when JWT_SECRET is strong', async () => {
    vi.resetModules();
    process.env.JWT_SECRET = 'a-strong-secret-at-least-32-characters-long';
    const { getJwtSecretKey } = await import('./env');
    const k = getJwtSecretKey();
    expect(k).toBeInstanceOf(Uint8Array);
    expect(k.length).toBeGreaterThan(0);
  });
});
