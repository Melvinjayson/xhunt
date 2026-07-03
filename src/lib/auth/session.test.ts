import { describe, it, expect, beforeAll } from 'vitest';
import { SignJWT } from 'jose';
import type { NextRequest } from 'next/server';

// A strong secret so getJwtSecretKey() (called lazily inside getSessionUser) is happy.
const SECRET = 'test-secret-at-least-32-characters-long-1234';
process.env.JWT_SECRET = SECRET;
const key = new TextEncoder().encode(SECRET);

// Imported after the env is set; getSessionUser reads the secret lazily anyway.
const { getSessionUser } = await import('./session');

async function sign(claims: Record<string, unknown>): Promise<string> {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(key);
}

/** Minimal NextRequest stand-in — getSessionUser only reads cookies.get + headers.get. */
function makeReq(opts: { cookie?: string; authorization?: string; headers?: Record<string, string> }): NextRequest {
  const h = new Map<string, string>();
  if (opts.authorization) h.set('authorization', opts.authorization);
  for (const [k, v] of Object.entries(opts.headers ?? {})) h.set(k.toLowerCase(), v);
  return {
    cookies: { get: (n: string) => (n === '__xhunt_session' && opts.cookie ? { value: opts.cookie } : undefined) },
    headers: { get: (n: string) => h.get(n.toLowerCase()) ?? null },
  } as unknown as NextRequest;
}

const validClaims = { sub: 'user-1', email: 'a@b.com', app_role: 'tenant_admin', tenant_id: 't-1', type: 'access' };

describe('getSessionUser — authentication', () => {
  let validToken: string;
  beforeAll(async () => { validToken = await sign(validClaims); });

  it('accepts a valid session cookie JWT', async () => {
    const user = await getSessionUser(makeReq({ cookie: validToken }));
    expect(user).toEqual({ id: 'user-1', email: 'a@b.com', role: 'tenant_admin', tenantId: 't-1' });
  });

  it('accepts a valid token via the Authorization: Bearer header (still cryptographically verified)', async () => {
    const user = await getSessionUser(makeReq({ authorization: `Bearer ${validToken}` }));
    expect(user?.id).toBe('user-1');
  });

  it('returns null when there is no cookie and no token', async () => {
    expect(await getSessionUser(makeReq({}))).toBeNull();
  });

  it('rejects a token whose type is not "access"', async () => {
    const refresh = await sign({ ...validClaims, type: 'refresh' });
    expect(await getSessionUser(makeReq({ cookie: refresh }))).toBeNull();
  });

  it('rejects a tampered / unsigned token', async () => {
    expect(await getSessionUser(makeReq({ cookie: validToken + 'x' }))).toBeNull();
    const wrongKey = new TextEncoder().encode('a-different-secret-at-least-32-chars-long');
    const forged = await new SignJWT(validClaims).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('5m').sign(wrongKey);
    expect(await getSessionUser(makeReq({ cookie: forged }))).toBeNull();
  });
});

describe('getSessionUser — must NOT trust identity headers (C1 regression)', () => {
  it('does not authenticate from a spoofed x-user-id header alone', async () => {
    // This is the core auth-bypass regression: a request carrying only a forged
    // x-user-* header (no valid session cookie) must be treated as unauthenticated.
    const req = makeReq({ headers: { 'x-user-id': 'victim-user-id', 'x-user-role': 'platform_admin' } });
    expect(await getSessionUser(req)).toBeNull();
  });

  it('ignores x-user-* headers even when a valid cookie is present (cookie wins)', async () => {
    const token = await sign(validClaims);
    const req = makeReq({
      cookie: token,
      headers: { 'x-user-id': 'evil-override', 'x-user-role': 'platform_admin', 'x-tenant-id': 'evil-tenant' },
    });
    const user = await getSessionUser(req);
    expect(user?.id).toBe('user-1');          // from the verified JWT, not the header
    expect(user?.role).toBe('tenant_admin');
    expect(user?.tenantId).toBe('t-1');
  });
});
