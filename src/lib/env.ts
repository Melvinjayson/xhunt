import { z } from 'zod';

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY:  z.string().min(1),
  GROQ_API_KEY:               z.string().min(1),
  ANTHROPIC_API_KEY:          z.string().optional(),
  STRIPE_SECRET_KEY:          z.string().min(1),
  STRIPE_WEBHOOK_SECRET:      z.string().min(1),
  STRIPE_PRO_PRICE_ID:        z.string().min(1),
  JWT_SECRET:                 z.string().min(32),
  NEXT_PUBLIC_AUTH_URL:       z.string().url(),
  CRON_SECRET:                z.string().min(16).optional(),
  RESEND_API_KEY:             z.string().optional(),
  EMAIL_FROM:                 z.string().optional(),
});

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL:      z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_AUTH_URL:          z.string().url(),
});

export const env = {
  groqApiKey:             process.env.GROQ_API_KEY ?? '',
  anthropicApiKey:        process.env.ANTHROPIC_API_KEY ?? '',
  stripeSecretKey:        process.env.STRIPE_SECRET_KEY ?? '',
  stripeWebhookSecret:    process.env.STRIPE_WEBHOOK_SECRET ?? '',
  stripeProPriceId:       process.env.STRIPE_PRO_PRICE_ID ?? '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  cronSecret:             process.env.CRON_SECRET ?? '',
} as const;

/**
 * The single source of truth for the JWT signing/verification key.
 *
 * There is deliberately NO fallback default: signing or verifying tokens with a
 * publicly known secret would let anyone forge admin JWTs. This throws — in every
 * environment, not just production — if `JWT_SECRET` is missing or too short.
 *
 * Called lazily (at request time, inside auth handlers) rather than at module load
 * so it never breaks `next build`, which does not exercise auth.
 */
let cachedJwtKey: Uint8Array | null = null;
export function getJwtSecretKey(): Uint8Array {
  if (cachedJwtKey) return cachedJwtKey;
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'JWT_SECRET is missing or shorter than 32 characters. Refusing to sign or ' +
      'verify tokens with an insecure secret — set a strong JWT_SECRET.',
    );
  }
  cachedJwtKey = new TextEncoder().encode(secret);
  return cachedJwtKey;
}

export const publicEnv = {
  supabaseUrl:     process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  authUrl:         process.env.NEXT_PUBLIC_AUTH_URL ?? 'http://localhost:8000',
} as const;

export function assertProductionEnv(): void {
  if (process.env.NODE_ENV !== 'production') return;

  const serverResult = serverSchema.safeParse(process.env);
  if (!serverResult.success) {
    const issues = serverResult.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join(', ');
    throw new Error(`Production env validation failed: ${issues}`);
  }

  const publicResult = publicSchema.safeParse(process.env);
  if (!publicResult.success) {
    const issues = publicResult.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join(', ');
    throw new Error(`Production public env validation failed: ${issues}`);
  }
}
