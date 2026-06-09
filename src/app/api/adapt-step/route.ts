import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { StepSchema } from '@/lib/schemas';

const AdaptRequestSchema = z.object({
  huntTitle: z.string(),
  storyContext: z.string(),
  step: StepSchema,
  context: z.enum(['user_skipped', 'user_struggling', 'user_failed']),
  userInterests: z.array(z.string()).optional(),
});

const CONTEXT_DESCRIPTIONS = {
  user_skipped: 'The user skipped this step — it felt too demanding, unclear, or inaccessible.',
  user_struggling: 'The user is struggling with this step and needs a more achievable version.',
  user_failed: 'The user attempted this step but was unable to complete it.',
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = AdaptRequestSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: 'Invalid request', details: parsed.error.issues }, { status: 400 });
    }

    const { huntTitle, storyContext, step, context, userInterests } = parsed.data;

    if (!process.env.ANTHROPIC_API_KEY) {
      // Fallback: generate a simpler instruction without AI
      return Response.json({
        adaptedStep: {
          ...step,
          instruction: simplifyInstruction(step.instruction),
          success_criteria: `You made a genuine attempt at this step.`,
        },
      });
    }

    const client = new Anthropic();

    const prompt = `You are the Step Adaptation Engine for X-hunt — a system that makes missions accessible to users who are struggling or stuck.

CONTEXT: ${CONTEXT_DESCRIPTIONS[context]}

HUNT: "${huntTitle}"
Story: "${storyContext}"

CURRENT STEP:
- Type: ${step.type}
- Instruction: "${step.instruction}"
- Success criteria: "${step.success_criteria}"

${userInterests ? `USER INTERESTS: ${userInterests.join(', ')}` : ''}

YOUR TASK:
Rewrite this step to be more achievable while:
1. Keeping the same step type (${step.type})
2. Maintaining narrative coherence with the hunt
3. Reducing scope or effort — not eliminating it entirely
4. Keeping the spirit of what the step is trying to accomplish
5. Making success criteria clear and immediately checkable

Return ONLY a valid JSON object. No markdown. No explanation. Exact schema:
{
  "id": ${step.id},
  "type": "${step.type}",
  "instruction": "...",
  "success_criteria": "..."
}`;

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      return Response.json({ adaptedStep: simplifyStep(step) });
    }

    const raw = content.text
      .trim()
      .replace(/^```(?:json)?\n?/, '')
      .replace(/\n?```$/, '');

    let parsed2: unknown;
    try {
      parsed2 = JSON.parse(raw);
    } catch {
      return Response.json({ adaptedStep: simplifyStep(step) });
    }

    const validated = StepSchema.safeParse({
      ...(parsed2 as object),
      id: step.id,
      type: step.type,
    });

    if (!validated.success) {
      return Response.json({ adaptedStep: simplifyStep(step) });
    }

    return Response.json({ adaptedStep: validated.data });
  } catch (err) {
    console.error('Step adaptation error:', err);
    return Response.json({ error: 'Adaptation failed' }, { status: 500 });
  }
}

function simplifyInstruction(instruction: string): string {
  const sentences = instruction.split(/[.!?]+/).filter(Boolean);
  return sentences[0]?.trim() + '. Take as little as 5 minutes on this.' || instruction;
}

function simplifyStep(step: z.infer<typeof StepSchema>) {
  return {
    ...step,
    instruction: simplifyInstruction(step.instruction),
    success_criteria: 'You made a genuine, mindful attempt at this — that counts.',
  };
}
