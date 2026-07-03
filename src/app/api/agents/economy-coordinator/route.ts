import { NextRequest, NextResponse } from 'next/server';
import type { EconomyCoordinatorInput, EconomyCoordinatorOutput } from '@/lib/agents/types';
import { requireTenantAgent } from '@/lib/agents/auth';
import { runGovernedAgent } from '@/lib/xil/agent-runner';

export async function POST(req: NextRequest) {
  const agentAuth = await requireTenantAgent();
  if (!agentAuth.ok) return agentAuth.response;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 503 });
  }

  let input: EconomyCoordinatorInput;
  try {
    input = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { context, currentSkills, contributionHistory, trustScores, objective } = input;

  if (!context || !objective) {
    return NextResponse.json({ error: 'context and objective are required' }, { status: 400 });
  }

  const userPrompt = `Analyze the following participant profile and produce economic coordination intelligence.

Context: ${context}
Objective: ${objective}

Current Skills: ${JSON.stringify(currentSkills ?? [])}
Contribution History (last entries): ${JSON.stringify(contributionHistory ?? [])}
Trust Scores by Dimension: ${JSON.stringify(trustScores ?? {})}

Evaluate both financial materiality and impact materiality before generating recommendations.
Explicitly check all anti-objectives before finalizing your output.

Return a JSON object matching the EconomyCoordinatorOutput schema exactly. No markdown, no code fences — raw JSON only.`;

  try {
    const result = await runGovernedAgent({
      agentId: 'economy-coordinator',
      objective: `Economic coordination: ${objective}`,
      userPrompt,
      context: { context, objective, currentSkills, trustScores },
      userId: agentAuth.userId,
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: 'Request rejected by constitutional alignment check', redFlags: result.redFlags, conditions: result.conditions },
        { status: 422 },
      );
    }
    return NextResponse.json(result.data as EconomyCoordinatorOutput);
  } catch (err) {
    console.error('[economy-coordinator]', err);
    return NextResponse.json({ error: 'Economy coordinator agent failed' }, { status: 500 });
  }
}
