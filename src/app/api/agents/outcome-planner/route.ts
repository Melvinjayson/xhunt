import { NextRequest, NextResponse } from 'next/server';
import type { OutcomePlannerInput, OutcomePlannerOutput } from '@/lib/agents/types';
import { requireTenantAgent } from '@/lib/agents/auth';
import { runGovernedAgent } from '@/lib/xil/agent-runner';

export async function POST(req: NextRequest) {
  const auth = await requireTenantAgent();
  if (!auth.ok) return auth.response;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 503 });
  }

  let input: OutcomePlannerInput;
  try {
    input = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { desired_outcome, audience, industry, timeline_weeks, current_state, constraints } = input;
  if (!desired_outcome || !audience || !industry || !timeline_weeks) {
    return NextResponse.json({ error: 'desired_outcome, audience, industry, and timeline_weeks are required' }, { status: 400 });
  }

  const userPrompt = `Design a mission roadmap to achieve the following:

Desired Outcome: ${desired_outcome}
Current State: ${current_state ?? 'Not specified'}
Audience: ${audience}
Industry: ${industry}
Timeline: ${timeline_weeks} weeks
Constraints: ${constraints ?? 'None specified'}

Work backwards from the outcome. Define the milestones, mission sequence, risks, and key assumptions.
Return a JSON object matching the OutcomePlannerOutput schema exactly. Raw JSON only.`;

  try {
    const result = await runGovernedAgent({
      agentId: 'outcome-planner',
      objective: `Plan outcome: ${desired_outcome}`,
      userPrompt,
      context: { desired_outcome, audience, industry, timeline_weeks, constraints },
      userId: auth.userId,
      maxTokens: 3000,
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: 'Request rejected by constitutional alignment check', redFlags: result.redFlags, conditions: result.conditions },
        { status: 422 },
      );
    }
    return NextResponse.json(result.data as OutcomePlannerOutput);
  } catch (err) {
    console.error('[outcome-planner]', err);
    return NextResponse.json({ error: 'Outcome Planner failed to generate roadmap' }, { status: 500 });
  }
}
