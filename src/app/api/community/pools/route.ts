import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/server';
import {
  getPools, getPool, createPool, contributeToPool,
  previewDistribution, executeDistribution, getPoolContributions,
  type PoolType, type DistributionMethod, type PoolStatus,
} from '@/lib/economy/community';

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const poolId = searchParams.get('pool_id');
  const view   = searchParams.get('view') ?? 'list';

  if (poolId && view === 'preview') {
    return NextResponse.json(await previewDistribution(poolId));
  }
  if (poolId && view === 'contributions') {
    return NextResponse.json(await getPoolContributions(poolId));
  }
  if (poolId) {
    const pool = await getPool(poolId);
    if (!pool) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(pool);
  }

  const statusParam = searchParams.get('status') as PoolStatus | null;
  const pools = await getPools({
    status: statusParam ?? undefined,
    limit: Number(searchParams.get('limit') ?? 60),
  });
  return NextResponse.json(pools);
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = session.sub;

  const body = await req.json() as Record<string, unknown>;
  const action = body.action as string;

  switch (action) {
    case 'create': {
      const pool = await createPool(userId, {
        name:                body.name                as string,
        description:         body.description         as string | undefined,
        pool_type:           body.pool_type           as PoolType,
        target_amount:       body.target_amount       as number,
        total_pool:          body.total_pool          as number | undefined,
        distribution_method: body.distribution_method as DistributionMethod | undefined,
        distribution_rule:   body.distribution_rule   as Record<string, number> | undefined,
        min_contribution:    body.min_contribution    as number | undefined,
        closes_at:           body.closes_at           as string | undefined,
        tenant_id:           body.tenant_id           as string | undefined,
        mission_id:          body.mission_id          as string | undefined,
      });
      if (!pool) return NextResponse.json({ error: 'Failed to create pool' }, { status: 500 });
      return NextResponse.json(pool, { status: 201 });
    }

    case 'contribute': {
      const pc = await contributeToPool(
        userId,
        body.pool_id as string,
        body.amount as number,
        {
          impactWeight: body.impact_weight as number | undefined,
          ledgerId:     body.ledger_id     as string | undefined,
          trustScore:   body.trust_score   as number | undefined,
          tenantId:     body.tenant_id     as string | undefined,
        }
      );
      if (!pc) return NextResponse.json({ error: 'Failed to contribute' }, { status: 500 });
      return NextResponse.json(pc, { status: 201 });
    }

    case 'distribute': {
      const result = await executeDistribution(body.pool_id as string, userId);
      if (!result) return NextResponse.json({ error: 'Distribution failed or no contributions' }, { status: 500 });
      return NextResponse.json(result);
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }
}
