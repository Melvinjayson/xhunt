import { NextRequest, NextResponse } from 'next/server';
import type { TrustGuardianInput, TrustGuardianOutput } from '@/lib/agents/types';
import { requireTenantAgent } from '@/lib/agents/auth';
import { runHeuristicCheck, persistConstitutionalCheck } from '@/lib/xil/constitution';
import { runGovernedAgent } from '@/lib/xil/agent-runner';

export async function POST(req: NextRequest) {
  const agentAuth = await requireTenantAgent();
  if (!agentAuth.ok) return agentAuth.response;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 503 });
  }

  let input: TrustGuardianInput;
  try {
    input = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { proposedAction, actionType, context, stakeholders } = input;

  if (!proposedAction || !actionType) {
    return NextResponse.json({ error: 'proposedAction and actionType are required' }, { status: 400 });
  }

  // Run lightweight heuristic check first
  const heuristic = runHeuristicCheck(proposedAction, context ?? {});

  const userPrompt = `Evaluate this proposed platform action against the X-Hunt Constitutional Framework.

Proposed Action: ${proposedAction}
Action Type: ${actionType}
Stakeholders: ${JSON.stringify(stakeholders ?? [])}
Context: ${JSON.stringify(context ?? {}, null, 2)}

Pre-screening flags (from heuristic): ${heuristic.redFlags.length ? heuristic.redFlags.join('; ') : 'None'}

Apply the full 7-question constitutional test. Assess double materiality.
Detect all anti-patterns. Map stakeholder impact.
Reason about 10-year horizon consequences.

Your verdict carries weight. Be rigorous. Be honest. Prioritize trust over growth.

Return a JSON object matching the TrustGuardianOutput schema exactly. No markdown, no code fences — raw JSON only.`;

  try {
    // Route through the governed runner for provenance logging, but skip the
    // pre-check gate: trust-guardian is the evaluator, so it must be allowed to
    // assess actions the heuristic would otherwise reject. It persists its own
    // (richer) constitutional check below.
    const result = await runGovernedAgent({
      agentId: 'trust-guardian',
      objective: `Evaluate ${actionType}: ${proposedAction}`,
      userPrompt,
      context: context ?? {},
      userId: agentAuth.userId,
      skipConstitutionalGate: true,
    });
    if (!result.ok) {
      return NextResponse.json({ error: 'Trust Guardian agent failed' }, { status: 500 });
    }
    const output = result.data as TrustGuardianOutput;

    // Persist the constitutional check from the AI assessment
    const checkId = await persistConstitutionalCheck(
      {
        helpsFlourist:           output.constitutional_assessment.helps_flourish,
        strengthensTrust:        output.constitutional_assessment.strengthens_trust,
        createsValue:            output.constitutional_assessment.creates_value,
        improvesEcosystem:       output.constitutional_assessment.improves_ecosystem,
        isFair:                  output.constitutional_assessment.is_fair,
        isSustainable:           output.constitutional_assessment.is_sustainable,
        proudIn10Years:          output.constitutional_assessment.proud_in_10_years,
        constitutionalScore:     output.constitutional_assessment.score,
        financialMaterialityScore: output.financial_materiality.score,
        financialMaterialityNotes: output.financial_materiality.analysis,
        impactMaterialityScore:    output.impact_materiality.score,
        impactMaterialityNotes:    output.impact_materiality.analysis,
        redFlags:   output.red_flags,
        verdict:    output.verdict,
        conditions: output.conditions,
      },
      actionType,
      proposedAction,
      context ?? {},
      'trust-guardian'
    );

    return NextResponse.json({ output, constitutionalCheckId: checkId });
  } catch (err) {
    console.error('[trust-guardian]', err);
    return NextResponse.json({ error: 'Trust Guardian agent failed' }, { status: 500 });
  }
}
