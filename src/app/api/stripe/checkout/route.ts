export const dynamic = 'force-dynamic';

export async function POST() {
  return Response.json(
    { error: 'Payments are temporarily unavailable. Please check back soon.' },
    { status: 503 }
  );
}
