import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';
import { MOCK_HUNTS } from '@/lib/mockHunts';
import { validateHuntsArray } from '@/lib/schemas';

const HUNT_SCHEMA_EXAMPLE = `{
  "id": "unique-kebab-slug",
  "title": "Hunt Title (5-8 words max)",
  "story_context": "2-3 sentences of rich narrative context that emotionally grounds the user.",
  "difficulty": "easy | medium | hard",
  "estimated_time": "30 min",
  "steps": [
    {
      "id": 1,
      "type": "action | reflection | discovery",
      "instruction": "Specific, real-world executable instruction (1-3 sentences).",
      "success_criteria": "Concrete signal the user uses to know this step is done."
    }
  ],
  "reward": "Compelling reward name (e.g. 'Urban Pioneer Explorer Badge + 150 XP')",
  "tags": ["tag1", "tag2", "tag3"]
}`;

export async function POST(req: NextRequest) {
  try {
    const { interests, goals } = await req.json();

    if (!process.env.ANTHROPIC_API_KEY) {
      const shuffled = [...MOCK_HUNTS].sort(() => Math.random() - 0.5);
      return Response.json({ hunts: shuffled.slice(0, 6) });
    }

    const client = new Anthropic();

    const prompt = `You are the Hunt Generation Engine for X-hunt — an AI-native experience platform that transforms real-world engagement into guided, narrative-driven missions.

Generate exactly 4 personalized Hunts for a user with:
- Interests: ${interests.join(', ')}
- Goals: ${goals.join(', ')}

RULES (non-negotiable):
1. Return ONLY a raw JSON array. No markdown. No explanation. No code fences.
2. Each Hunt MUST have 4-5 steps. Never fewer than 4, never more than 5.
3. Step types must be distributed: at least 1 "action", 1 "reflection", 1 "discovery" per hunt.
4. Every instruction must be executable in the physical world — not digital tasks.
5. Each step.id must be sequential integers starting from 1.
6. difficulty must be exactly one of: easy, medium, hard (lowercase).
7. Tags must be lowercase, single words or hyphenated.

Hunt schema:
${HUNT_SCHEMA_EXAMPLE}

Generate hunts that feel emotionally alive — narratively rich, not generic checklists. Each should have a distinct voice and setting.`;

    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 4500,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      return Response.json({ hunts: MOCK_HUNTS.slice(0, 4) });
    }

    // Strip any markdown fences the model might add despite instructions
    const raw = content.text
      .trim()
      .replace(/^```(?:json)?\n?/, '')
      .replace(/\n?```$/, '');

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error('JSON parse failed, falling back to mock hunts');
      return Response.json({ hunts: MOCK_HUNTS.slice(0, 4) });
    }

    // Zod validate — filters out any malformed hunts
    const rawArray = Array.isArray(parsed) ? parsed : (parsed as { hunts?: unknown[] })?.hunts ?? [];
    const validHunts = validateHuntsArray(
      rawArray.map((h: unknown, i: number) => ({
        ...(h as object),
        id: (h as { id?: string }).id || `hunt-ai-${Date.now()}-${i}`,
        createdAt: new Date().toISOString(),
      }))
    );

    if (validHunts.length === 0) {
      console.error('No valid hunts after Zod validation, falling back to mock');
      return Response.json({ hunts: MOCK_HUNTS.slice(0, 4) });
    }

    // Merge AI hunts with 2 curated ones for variety
    const combined = [...validHunts, ...MOCK_HUNTS.slice(0, 2)];
    return Response.json({ hunts: combined });
  } catch (err) {
    console.error('Hunt generation error:', err);
    return Response.json({ hunts: MOCK_HUNTS });
  }
}
