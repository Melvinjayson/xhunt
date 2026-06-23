import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'change-this-to-a-long-random-secret-at-least-64-chars',
);

export interface SessionUser {
  id: string;
  email: string;
  role: string;
  tenantId: string | null;
}

/** Read authenticated user from request — uses header set by middleware, falls back to JWT. */
export async function getSessionUser(req: NextRequest): Promise<SessionUser | null> {
  const userId = req.headers.get('x-user-id');
  if (userId) {
    return {
      id: userId,
      email: req.headers.get('x-user-email') ?? '',
      role: req.headers.get('x-user-role') ?? 'explorer',
      tenantId: req.headers.get('x-tenant-id') || null,
    };
  }
  const token = req.cookies.get('__xhunt_session')?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET, { algorithms: ['HS256'] });
    if (payload['type'] !== 'access') return null;
    return {
      id: payload['sub'] as string,
      email: payload['email'] as string ?? '',
      role: (payload['app_role'] as string) ?? 'explorer',
      tenantId: (payload['tenant_id'] as string) || null,
    };
  } catch {
    return null;
  }
}
