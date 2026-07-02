import { NextRequest, NextResponse } from 'next/server';
import type { ExperienceDesignerInput, ExperienceDesignerOutput } from '@/lib/agents/types';
import { requireTenantAgent } from '@/lib/agents/auth';
import { runGovernedAgent } from '@/lib/xil/agent-runner';

export async function POST(req: NextRequest) {
  const auth = await requireTenantAgent();
  if (!auth.ok) return auth.response;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 503 });
  }

  let input: ExperienceDesignerInput;
  try {
    input = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { title, story_context, steps, audience } = input;
  if (!title || !steps?.length) {
    return NextResponse.json({ error: 'title and steps are required' }, { status: 400 });
  }

  const userPrompt = `Review and improve this mission for maximum engagement:

Title: ${title}
Story: ${story_context ?? '(none)'}
Audience: ${audience ?? 'general'}
Steps:
${steps.map((s, i) => `${i + 1}. [${s.type}] ${s.instruction}`).join('\n')}

Return a JSON object matching the ExperienceDesignerOutput schema exactly. Raw JSON only.`;

  try {
    const result = await runGovernedAgent({
      agentId: 'experience-designer',
      objective: `Improve mission experience: ${title}`,
      userPrompt,
      context: { title, audience, stepCount: steps.length },
      userId: auth.userId,
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: 'Request rejected by constitutional alignment check', redFlags: result.redFlags, conditions: result.conditions },
        { status: 422 },
      );
    }
    return NextResponse.json(result.data as ExperienceDesignerOutput);
  } catch (err) {
    console.error('[experience-designer]', err);
    return NextResponse.json({ error: 'Agent failed to analyse mission' }, { status: 500 });
  }
}
