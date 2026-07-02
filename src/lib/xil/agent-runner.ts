/**
 * Governed single-agent runner.
 *
 * AGENTS.md mandate: "All agent invocations in XIL must go through the orchestrator."
 * The standalone `/api/agents/*` routes previously each constructed their own
 * `new Anthropic()` and called `messages.create` directly — bypassing the
 * constitutional pre-check and the `xil_routing_log` provenance trail.
 *
 * This helper is the governed entry point for those routes: it runs the same
 * constitutional check the orchestrator runs, invokes the model through a single
 * shared client, and records provenance — without requiring every route to adopt
 * the orchestrator's multi-agent request shape.
 */

import Anthropic from '@anthropic-ai/sdk';
import { AGENT_SYSTEM_PROMPTS } from '@/lib/agents/prompts';
import { runHeuristicCheck, persistConstitutionalCheck, logXILRoute } from './constitution';

const client = new Anthropic();

export const AGENT_FUNCTION: Record<string, string> = {
  'discovery-agent':          'personal',
  'behavioral-analyst':       'personal',
  'community-catalyst':       'community',
  'knowledge-agent':          'community',
  'economy-coordinator':      'marketplace',
  'sustainability-navigator': 'impact',
  'outcome-planner':          'impact',
  'trust-guardian':           'governance',
  'insight-analyst':          'governance',
  'agent-foundry':            'foundry',
  'mission-architect':        'foundry',
  'experience-designer':      'foundry',
};

export interface GovernedAgentRequest {
  /** Key into AGENT_SYSTEM_PROMPTS (e.g. 'discovery-agent'). */
  agentId: string;
  /** Short human description of the request — feeds the constitutional check + log. */
  objective: string;
  /** The full prompt sent to the model. */
  userPrompt: string;
  /** Structured context, also scanned by the constitutional check. */
  context?: Record<string, unknown>;
  userId?: string;
  sessionId?: string;
  maxTokens?: number;
  /**
   * Skip the constitutional pre-check gate (still logs provenance). Use ONLY for
   * agents whose job is to evaluate potentially-problematic actions — notably the
   * trust-guardian, which deliberately receives inputs the heuristic would reject
   * and performs its own deep constitutional assessment. Defaults to false.
   */
  skipConstitutionalGate?: boolean;
}

export type GovernedAgentResult =
  | { ok: true; data: unknown; constitutionalCheckId?: string }
  | { ok: false; rejected: true; redFlags: string[]; conditions: string[]; verdict: string };

/**
 * Run one XIL agent through the constitutional gate with provenance logging.
 * Throws if the agent id is unknown or the model call / JSON parse fails —
 * callers keep their existing try/catch and 5xx handling.
 */
export async function runGovernedAgent(input: GovernedAgentRequest): Promise<GovernedAgentResult> {
  const start = Date.now();
  const { agentId, objective, userPrompt, context = {}, userId, sessionId, maxTokens, skipConstitutionalGate } = input;
  const intelligenceFunction = AGENT_FUNCTION[agentId] ?? 'foundry';

  const systemPrompt = AGENT_SYSTEM_PROMPTS[agentId];
  if (!systemPrompt) throw new Error(`No system prompt registered for agent: ${agentId}`);

  // 1. Constitutional pre-check (same gate the orchestrator applies). Agents that
  //    evaluate problematic actions (trust-guardian) opt out of the *gate* but are
  //    still recorded — they do their own deep assessment downstream.
  let checkId: string | undefined;
  if (!skipConstitutionalGate) {
    const check = runHeuristicCheck(objective, context);
    checkId = await persistConstitutionalCheck(
      check, intelligenceFunction, objective, context, agentId, userId,
    );

    if (check.verdict === 'rejected') {
      const processingMs = Date.now() - start;
      await logXILRoute(
        intelligenceFunction, [], objective, 'Rejected by constitutional check',
        processingMs, checkId, userId, sessionId,
      );
      return {
        ok: false, rejected: true,
        redFlags: check.redFlags, conditions: check.conditions, verdict: check.verdict,
      };
    }
  }

  // 2. Invoke the model through the shared client
  const message = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: maxTokens ?? 2048,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const raw = (message.content[0] as { type: string; text: string }).text.trim();
  const jsonStart = raw.indexOf('{');
  const jsonEnd = raw.lastIndexOf('}');
  const data = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));

  // 3. Provenance
  const processingMs = Date.now() - start;
  await logXILRoute(
    intelligenceFunction, [agentId], objective, JSON.stringify(data).slice(0, 500),
    processingMs, checkId, userId, sessionId,
  );

  return { ok: true, data, constitutionalCheckId: checkId };
}
