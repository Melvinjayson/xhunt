import { NextRequest, NextResponse } from 'next/server';
import type { SustainabilityNavigatorInput, SustainabilityNavigatorOutput } from '@/lib/agents/types';
import { requireTenantAgent } from '@/lib/agents/auth';
import { runGovernedAgent } from '@/lib/xil/agent-runner';

export async function POST(req: NextRequest) {
  const agentAuth = await requireTenantAgent();
  if (!agentAuth.ok) return agentAuth.response;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 503 });
  }

  let input: SustainabilityNavigatorInput;
  try {
    input = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const {
    missionContext,
    activityType,
    participantCount,
    geographicalContext,
    currentSDGAlignment,
  } = input;

  if (!missionContext || !activityType) {
    return NextResponse.json({ error: 'missionContext and activityType are required' }, { status: 400 });
  }

  const userPrompt = `Assess the environmental and social sustainability of this mission.

Mission Context: ${missionContext}
Activity Type: ${activityType}
Participant Count: ${participantCount ?? 'unknown'}
${geographicalContext ? `Geographical Context: ${geographicalContext}` : ''}
${currentSDGAlignment?.length ? `Current SDG Alignment Claims: ${currentSDGAlignment.join(', ')}` : ''}

Be evidence-informed, not aspirational. Quantify where possible.
Flag any greenwashing risk explicitly — the greenwashing_risk field must be candid and honest.
Score SDG alignment based on material contribution, not thematic adjacency.
Surface circular economy opportunities that are genuinely actionable.

Return a JSON object matching the SustainabilityNavigatorOutput schema exactly. No markdown, no code fences — raw JSON only.`;

  try {
    const result = await runGovernedAgent({
      agentId: 'sustainability-navigator',
      objective: `Assess sustainability: ${activityType}`,
      userPrompt,
      context: { missionContext, activityType, participantCount, geographicalContext },
      userId: agentAuth.userId,
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: 'Request rejected by constitutional alignment check', redFlags: result.redFlags, conditions: result.conditions },
        { status: 422 },
      );
    }
    return NextResponse.json(result.data as SustainabilityNavigatorOutput);
  } catch (err) {
    console.error('[sustainability-navigator]', err);
    return NextResponse.json({ error: 'Sustainability Navigator agent failed' }, { status: 500 });
  }
}
