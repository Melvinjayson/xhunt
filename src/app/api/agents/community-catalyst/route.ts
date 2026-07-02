import { NextRequest, NextResponse } from 'next/server';
import type { CommunityCatalystInput, CommunityCatalystOutput } from '@/lib/agents/types';
import { requireTenantAgent } from '@/lib/agents/auth';
import { runGovernedAgent } from '@/lib/xil/agent-runner';

export async function POST(req: NextRequest) {
  const agentAuth = await requireTenantAgent();
  if (!agentAuth.ok) return agentAuth.response;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 503 });
  }

  let input: CommunityCatalystInput;
  try {
    input = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { communityContext, activeMissions, participantCohort, focusArea } = input;

  if (!communityContext) {
    return NextResponse.json({ error: 'communityContext is required' }, { status: 400 });
  }

  const userPrompt = `Analyze this community and identify meaningful collaboration opportunities.

Community Context: ${communityContext}
${focusArea ? `Focus Area: ${focusArea}` : ''}

Active Missions (${activeMissions?.length ?? 0}):
${JSON.stringify(activeMissions ?? [], null, 2)}

Participant Cohort Sample (${participantCohort?.length ?? 0} participants):
${JSON.stringify(participantCohort?.slice(0, 20) ?? [], null, 2)}

Identify genuine shared interests. Design strategies that build durable relationships, not just platform engagement.
Map all feedback loops. Name the risks explicitly. Consider what happens to this community if the platform disappeared.

Return a JSON object matching the CommunityCatalystOutput schema exactly. No markdown, no code fences — raw JSON only.`;

  try {
    const result = await runGovernedAgent({
      agentId: 'community-catalyst',
      objective: `Catalyze community collaboration${focusArea ? `: ${focusArea}` : ''}`,
      userPrompt,
      context: { communityContext, focusArea, activeMissionCount: activeMissions?.length ?? 0 },
      userId: agentAuth.userId,
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: 'Request rejected by constitutional alignment check', redFlags: result.redFlags, conditions: result.conditions },
        { status: 422 },
      );
    }
    return NextResponse.json(result.data as CommunityCatalystOutput);
  } catch (err) {
    console.error('[community-catalyst]', err);
    return NextResponse.json({ error: 'Community catalyst agent failed' }, { status: 500 });
  }
}
