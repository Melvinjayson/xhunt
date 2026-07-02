import { NextRequest, NextResponse } from 'next/server';
import type { KnowledgeAgentInput, KnowledgeAgentOutput } from '@/lib/agents/types';
import { requireTenantAgent } from '@/lib/agents/auth';
import { runGovernedAgent } from '@/lib/xil/agent-runner';

export async function POST(req: NextRequest) {
  const auth = await requireTenantAgent();
  if (!auth.ok) return auth.response;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 503 });
  }

  let input: KnowledgeAgentInput;
  try {
    input = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { query, context, node_types, max_recommendations = 5 } = input;
  if (!query?.trim()) {
    return NextResponse.json({ error: 'query is required' }, { status: 400 });
  }

  const userPrompt = `Answer the following question about mission strategy and provide recommendations:

Query: ${query}
Context: ${context ?? 'No additional context provided'}
Relevant Node Types: ${node_types?.length ? node_types.join(', ') : 'all'}
Max Recommendations: ${max_recommendations}

Return a JSON object matching the KnowledgeAgentOutput schema exactly. Raw JSON only.`;

  try {
    const result = await runGovernedAgent({
      agentId: 'knowledge-agent',
      objective: `Knowledge query: ${query}`,
      userPrompt,
      context: { query, node_types, max_recommendations },
      userId: auth.userId,
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: 'Request rejected by constitutional alignment check', redFlags: result.redFlags, conditions: result.conditions },
        { status: 422 },
      );
    }
    return NextResponse.json(result.data as KnowledgeAgentOutput);
  } catch (err) {
    console.error('[knowledge-agent]', err);
    return NextResponse.json({ error: 'Knowledge Agent failed to respond' }, { status: 500 });
  }
}
