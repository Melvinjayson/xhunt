import { NextResponse } from 'next/server';

const BACKEND = process.env.NEXT_PUBLIC_AUTH_URL ?? '';

// Fire-and-forget ping to wake the Render.com backend before the user submits credentials.
export async function GET() {
  if (BACKEND) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 5_000);
    fetch(`${BACKEND}/health`, { signal: ac.signal })
      .catch(() => {})
      .finally(() => clearTimeout(timer));
  }
  return NextResponse.json({ ok: true });
}
