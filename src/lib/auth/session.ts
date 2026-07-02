import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { getJwtSecretKey } from '@/lib/env';

export interface SessionUser {
  id: string;
  email: string;
  role: string;
  tenantId: string | null;
}

/**
 * Read the authenticated user from the request by verifying the session JWT.
 *
 * SECURITY: this must NOT trust the `x-user-*` request headers. Those headers are
 * injected by the proxy only for a verified session, but a client can also send
 * them directly; trusting them would be an authentication bypass. We always verify
 * the httpOnly `__xhunt_session` cookie's signature here.
 */
export async function getSessionUser(req: NextRequest): Promise<SessionUser | null> {
  const token = req.cookies.get('__xhunt_session')?.value
    ?? req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey(), { algorithms: ['HS256'] });
    if (payload['type'] !== 'access') return null;
    return {
      id: payload['sub'] as string,
      email: payload['email'] as string ?? '',
      role: (payload['app_role'] as string) ?? (payload['role'] as string) ?? 'explorer',
      tenantId: (payload['tenant_id'] as string) || null,
    };
  } catch {
    return null;
  }
}
