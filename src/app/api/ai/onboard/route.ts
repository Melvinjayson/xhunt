import { NextRequest } from 'next/server';
import groq from '@/lib/groq';

export const dynamic = 'force-dynamic';

interface ChatMessage { role: 'user' | 'assistant'; content: string }

// ── IP rate limiter ───────────────────────────────────────────────────────────
// In-memory per instance. For multi-instance deployments, swap for Upstash Redis.
// Max 15 chat requests per IP per hour; max 2 extract requests per IP per hour.
const ipStore = new Map<string, { chat: number; extract: number; resetAt: number }>();

function checkRateLimit(ip: string, mode: 'chat' | 'extract'): { allowed: boolean } {
  const now = Date.now();
  const window = 60 * 60 * 1000; // 1 hour
  const limits = { chat: 15, extract: 2 };

  const entry = ipStore.get(ip);
  if (!entry || now > entry.resetAt) {
    ipStore.set(ip, { chat: 0, extract: 0, resetAt: now + window });
  }

  const rec = ipStore.get(ip)!;
  if (rec[mode] >= limits[mode]) return { allowed: false };

  rec[mode]++;
  return { allowed: true };
}

// Purge stale entries every 100 calls to prevent memory growth
let purgeCount = 0;
function maybePurge() {
  if (++purgeCount % 100 !== 0) return;
  const now = Date.now();
  for (const [key, val] of ipStore) {
    if (now > val.resetAt) ipStore.delete(key);
  }
}

// ── System prompts ────────────────────────────────────────────────────────────

const XENO_CHAT_SYSTEM = `
You are Xeno, the AI guide for X-Hunt — a platform where people earn real money, build marketable skills, and create measurable real-world impact by completing missions for brands, NGOs, governments, startups, and social enterprises.

Your job: have a genuinely warm, perceptive, one-on-one conversation to understand who this person really is — their unique mix of passions, skills, and ambitions — so we can match them with missions that feel made for them.

STRICT RULES:
- Ask exactly ONE question per response. Never bundle two questions.
- Keep each response to 2–3 sentences. Never ramble.
- Acknowledge their specific answer with a brief, genuine reflection before moving on. Mirror their vocabulary and energy.
- If they give a vague or one-word answer, gently probe for a concrete example before moving to the next topic.
- Be warm, curious, and subtly insightful — not a form, not a robot.
- Never say "profile", "data", "extraction", "AI", "algorithm", or "database".
- Do NOT list questions or give a roadmap upfront.
- Read the conversation history carefully — never repeat a topic already covered.
- After they've answered 6 substantive questions (you've covered all 6 topics below), end with EXACTLY this phrase and nothing else:
  "Perfect — I have everything I need to create your Impact DNA. Just give me a moment! ✨"

CONVERSATION FLOW — cover in natural order, adapting to what they share:
1. Passion / excitement — what genuinely lights them up (work, side projects, hobbies, causes)
2. Skills & strengths — what they're good at or proud of (professional, creative, technical, interpersonal)
3. Causes & world problems — what injustices or challenges they'd want to solve if they could
4. Work style — solo vs collaborative, deep focus vs quick tasks, structured vs flexible
5. Time availability — realistically how many hours a week they can commit
6. Goals & success definition — what "winning" means to them (income, skills, impact, recognition, purpose, a mix)
`.trim();

const EXTRACT_SYSTEM = `
You are a deeply empathetic analyst. Based on a real onboarding conversation, extract a personalized impact profile.
Return ONLY valid JSON — no markdown fences, no explanation, no extra text.

JSON schema (all fields required):
{
  "archetype": "one of: Explorer | Builder | Innovator | Mentor | Creator | Analyst | Activist",
  "summary": "2-3 sentence personalized narrative written directly to the person (use 'you'). Reference what they specifically said — their actual passions, skills, and goals. Make it feel like Xeno truly listened and understood them.",
  "strengths": [{"name": "string", "score": <integer 60-99>}],
  "causes": ["string"],
  "personality": ["string"],
  "motivations": ["string"],
  "growthAreas": ["string"],
  "availability": "string like '5-10 hrs/week'",
  "impactScore": <integer 40-95>
}

Rules:
- archetype: choose the one that best captures their dominant drive and way of working
- summary: MUST reference specifics from the conversation — their actual words, passion areas, or stated goals. Never write generic sentences like "You are a passionate person." Be reflective and specific. Example: "Your obsession with sustainable design and grassroots community work shows someone who builds from the ground up — not just dreaming about change, but making it happen. With your background in UX and your drive to make cities more livable, you're perfectly positioned for civic tech and climate missions."
- strengths: 4–6 items, name the specific skill (e.g. "Community Organizing", "Visual Storytelling", "Systems Thinking") — infer from what they described, even if not explicitly labelled. Scores should reflect how strongly they claimed or demonstrated each skill.
- causes: 2–4 items from: Climate, Education, Health, Civic Tech, Circular Economy, Accessibility, Community Development, Sustainability, Arts & Culture, Social Justice, Food Security, Financial Inclusion, Mental Health
- personality: 2–3 traits, each a single descriptor (e.g. "Detail-oriented", "Systems thinker", "Collaborative") — NOT the archetype names
- motivations: 2–3 from: Income, Learning, Career Growth, Volunteering, Networking, Purpose, Recognition, Autonomy, Social Impact
- growthAreas: 2–3 skills they'd benefit from developing but didn't strongly claim
- impactScore: 40-95, higher for deep engagement, clear purpose, and rich answers; lower for vague or minimal responses
`.trim();

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
          ?? req.headers.get('x-real-ip')
          ?? 'unknown';

  try {
    const body = await req.json() as {
      messages: ChatMessage[];
      mode: 'chat' | 'extract';
      userId?: string;
    };
    const { messages, mode } = body;

    // ── Rate limit check ──────────────────────────────────────────────────
    maybePurge();
    const { allowed } = checkRateLimit(ip, mode);
    if (!allowed) {
      return Response.json(
        { error: 'Too many requests. Please wait a moment before continuing.' },
        { status: 429 }
      );
    }

    // ── Message count guard (server-side) ─────────────────────────────────
    // Reject if client sends more than 20 messages in chat mode (10 user + 10 AI)
    if (mode === 'chat' && messages.length > 20) {
      return Response.json(
        { error: 'Session limit reached.' },
        { status: 429 }
      );
    }

    // ── Extract mode ──────────────────────────────────────────────────────
    if (mode === 'extract') {
      const transcript = messages
        .map((m) => `${m.role === 'user' ? 'User' : 'Xeno'}: ${m.content}`)
        .join('\n');

      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: EXTRACT_SYSTEM },
          { role: 'user', content: `Conversation transcript:\n\n${transcript}\n\nExtract the profile JSON now.` },
        ],
        temperature: 0.2,
        max_tokens: 800,
      });

      const raw  = completion.choices[0]?.message?.content?.trim() ?? '{}';
      const json = raw.replace(/^```json?\s*/i, '').replace(/```\s*$/i, '').trim();
      const profile = JSON.parse(json);

      return Response.json({ profile: { ...profile, extractedAt: new Date().toISOString() } });
    }

    // ── Chat mode ─────────────────────────────────────────────────────────
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'system', content: XENO_CHAT_SYSTEM }, ...messages],
      temperature: 0.72,
      max_tokens: 220,
    });

    const reply = completion.choices[0]?.message?.content?.trim()
      ?? "I'm here to help you find the right missions. What are you passionate about?";
    return Response.json({ message: reply });

  } catch (err) {
    console.error('/api/ai/onboard error:', err);
    return Response.json(
      { message: "Something went wrong on my end. What are you most passionate about?" },
      { status: 200 }
    );
  }
}
