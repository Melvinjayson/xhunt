import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { getJwtSecretKey } from '@/lib/env';

const BACKEND = process.env.NEXT_PUBLIC_AUTH_URL ?? '';

export async function PATCH(req: NextRequest) {
  const token = req.cookies.get('__xhunt_session')?.value;
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await req.json();

  if (BACKEND) {
    const upstream = await fetch(`${BACKEND}/users/me`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    }).catch(() => null);
    if (upstream?.ok) return NextResponse.json(await upstream.json());
  }

  // No backend or backend unreachable — return current identity merged with updates
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey(), { algorithms: ['HS256'] });
    return NextResponse.json({
      id: payload['sub'],
      email: payload['email'],
      display_name: body.display_name ?? (payload['email'] as string | undefined)?.split('@')[0] ?? 'Explorer',
      avatar_url: body.avatar_url ?? null,
      role: payload['app_role'] ?? 'explorer',
      default_surface: body.default_surface ?? payload['surface'] ?? 'home',
      onboarding_complete: (payload['onboarding_complete'] as boolean) ?? false,
      tenant_id: (payload['tenant_id'] as string | null) ?? null,
    });
  } catch {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}
