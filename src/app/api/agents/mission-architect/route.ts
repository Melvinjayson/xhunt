import { NextRequest, NextResponse } from 'next/server';
import type { MissionArchitectInput, MissionArchitectOutput } from '@/lib/agents/types';
import { requireTenantAgent } from '@/lib/agents/auth';
import { runGovernedAgent } from '@/lib/xil/agent-runner';

export async function POST(req: NextRequest) {
  const auth = await requireTenantAgent();
  if (!auth.ok) return auth.response;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 503 });
  }

  let input: MissionArchitectInput;
  try {
    input = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { goal, audience, industry, duration, success_metric } = input;
  if (!goal || !audience || !industry || !duration || !success_metric) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const userPrompt = `Design a mission for the following objective:

Goal: ${goal}
Target Audience: ${audience}
Industry: ${industry}
Duration: ${duration}
Success Metric: ${success_metric}

Return a JSON object matching the MissionArchitectOutput schema exactly. No markdown, no code fences — raw JSON only.`;

  try {
    const result = await runGovernedAgent({
      agentId: 'mission-architect',
      objective: `Design mission: ${goal}`,
      userPrompt,
      context: { goal, audience, industry, duration, success_metric },
      userId: auth.userId,
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: 'Request rejected by constitutional alignment check', redFlags: result.redFlags, conditions: result.conditions },
        { status: 422 },
      );
    }
    return NextResponse.json(result.data as MissionArchitectOutput);
  } catch (err) {
    console.error('[mission-architect]', err);
    return NextResponse.json({ error: 'Agent failed to generate mission' }, { status: 500 });
  }
}
