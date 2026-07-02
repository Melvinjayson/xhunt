import { NextRequest, NextResponse } from 'next/server';
import type { InsightAnalystInput, InsightAnalystOutput } from '@/lib/agents/types';
import { requireTenantAgent } from '@/lib/agents/auth';
import { runGovernedAgent } from '@/lib/xil/agent-runner';

export async function POST(req: NextRequest) {
  const auth = await requireTenantAgent();
  if (!auth.ok) return auth.response;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 503 });
  }

  let input: InsightAnalystInput;
  try {
    input = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const {
    tenant_name, period_days, total_missions, active_missions,
    total_users, total_attempts, total_completions, completion_rate_pct, top_missions,
  } = input;

  if (!tenant_name) {
    return NextResponse.json({ error: 'tenant_name is required' }, { status: 400 });
  }

  const userPrompt = `Generate an executive intelligence report for the following workspace:

Organisation: ${tenant_name}
Reporting Period: Last ${period_days} days
Total Missions: ${total_missions} (${active_missions} active)
Total Users: ${total_users}
Total Attempts: ${total_attempts}
Total Completions: ${total_completions} (${completion_rate_pct}% rate)

Top Performing Missions:
${top_missions.length > 0
  ? top_missions.map((m, i) => `${i + 1}. "${m.title}" — ${m.completions} completions, ${m.rate_pct}% rate`).join('\n')
  : '(none yet)'}

Return a JSON object matching the InsightAnalystOutput schema exactly. Raw JSON only.`;

  try {
    const result = await runGovernedAgent({
      agentId: 'insight-analyst',
      objective: `Intelligence report for ${tenant_name}`,
      userPrompt,
      context: { tenant_name, period_days, total_missions, total_users, completion_rate_pct },
      userId: auth.userId,
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: 'Request rejected by constitutional alignment check', redFlags: result.redFlags, conditions: result.conditions },
        { status: 422 },
      );
    }
    return NextResponse.json(result.data as InsightAnalystOutput);
  } catch (err) {
    console.error('[insight-analyst]', err);
    return NextResponse.json({ error: 'Agent failed to generate report' }, { status: 500 });
  }
}
