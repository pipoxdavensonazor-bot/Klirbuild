/**
 * Interactive helper: prints wrangler secret put commands for production.
 * Does not echo secret values. Pipe values yourself, e.g.:
 *   printf '%s' "$STRIPE_SECRET_KEY" | npx wrangler secret put STRIPE_SECRET_KEY
 */
const SECRETS = [
  "DATABASE_URL",
  "BETTER_AUTH_SECRET",
  "CRON_SECRET",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_STARTER_MONTHLY",
  "STRIPE_PRICE_GROWTH_MONTHLY",
  "STRIPE_PRICE_BUSINESS_MONTHLY",
  "STRIPE_PRICE_STARTER_YEARLY",
  "STRIPE_PRICE_GROWTH_YEARLY",
  "STRIPE_PRICE_BUSINESS_YEARLY",
  "RESEND_API_KEY",
  "RESEND_WEBHOOK_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "DAILY_API_KEY",
  "DAILY_WEBHOOK_SECRET",
  "ZERNIO_API_KEY",
  "OPENAI_API_KEY",
  "OPENAI_MODEL",
  "OPENROUTER_API_KEY",
  "OPENROUTER_MODEL",
  "GEMINI_API_KEY",
  "GEMINI_MODEL",
  "INBOUND_EMAIL_DOMAIN",
  "EMAIL_FROM",
  "RESEND_MANAGED_INBOUND_ADDRESS",
];

const PUBLIC_VARS = [
  "NEXT_PUBLIC_APP_URL=https://klirline.app",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=…",
  "NEXT_PUBLIC_DAILY_DOMAIN=klirbuild.daily.co",
  "DEMO_AUTH_BYPASS=false",
  "UPLOADS_KV_ENABLED=true",
];

console.log("# Cloudflare Worker secrets for klirbuild\n");
console.log("# Vars (non-secret) — also in wrangler.jsonc vars or dashboard:");
for (const v of PUBLIC_VARS) console.log(`#   ${v}`);
console.log("\n# Secrets — run once logged in (`npx wrangler login`):");
for (const name of SECRETS) {
  console.log(`printf '%s' "\${${name}}" | npx wrangler secret put ${name}`);
}
console.log("\n# After Hyperdrive is bound, DATABASE_URL secret is optional (Hyperdrive preferred at runtime).");
