// Server-only environment access with production validation
export const env = {
  groqApiKey:             process.env.GROQ_API_KEY ?? '',
  anthropicApiKey:        process.env.ANTHROPIC_API_KEY ?? '',
  stripeSecretKey:        process.env.STRIPE_SECRET_KEY ?? '',
  stripeWebhookSecret:    process.env.STRIPE_WEBHOOK_SECRET ?? '',
  stripeProPriceId:       process.env.STRIPE_PRO_PRICE_ID ?? '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
} as const;

export function assertProductionEnv(): void {
  if (process.env.NODE_ENV !== 'production') return;
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'GROQ_API_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'STRIPE_PRO_PRICE_ID',
  ];
  const missing = required.filter(k => !process.env[k] || process.env[k]?.includes('REPLACE_ME'));
  if (missing.length) {
    throw new Error(`Production env check failed. Missing or placeholder: ${missing.join(', ')}`);
  }
}
