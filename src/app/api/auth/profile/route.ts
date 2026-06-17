import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.NEXT_PUBLIC_AUTH_URL ?? 'http://localhost:8000';

export async function PATCH(req: NextRequest) {
  const token = req.cookies.get('__xhunt_session')?.value;
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await req.json();
  const upstream = await fetch(`${BACKEND}/users/me`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  }).catch(() => null);

  if (!upstream?.ok) {
    const err = await upstream?.json().catch(() => ({ detail: 'Update failed' }));
    return NextResponse.json(err ?? { detail: 'Update failed' }, { status: upstream?.status ?? 500 });
  }

  return NextResponse.json(await upstream.json());
}
