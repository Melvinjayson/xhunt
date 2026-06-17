import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.NEXT_PUBLIC_AUTH_URL ?? 'http://localhost:8000';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('__xhunt_session')?.value;
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const upstream = await fetch(`${BACKEND}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    // Don't cache — always verify with backend
    cache: 'no-store',
  }).catch(() => null);

  if (!upstream?.ok) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  return NextResponse.json(await upstream.json());
}
