/**
 * Vérifie la configuration production avant déploiement Netlify.
 * Usage: npm run production:verify
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const root = resolve(process.cwd());
const envLocal = resolve(root, ".env.local");

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  const raw = readFileSync(path, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvFile(envLocal);

type Tier = "core" | "billing" | "optional";

type Check = { name: string; ok: boolean; hint?: string; tier: Tier };

const checks: Check[] = [
  {
    name: "DATABASE_URL",
    ok: Boolean(process.env.DATABASE_URL?.trim()),
    hint: "Netlify Database ou Neon/Supabase",
    tier: "core",
  },
  {
    name: "BETTER_AUTH_SECRET",
    ok: Boolean(process.env.BETTER_AUTH_SECRET?.trim()),
    hint: "Chaîne aléatoire longue (sessions)",
    tier: "core",
  },
  {
    name: "DEMO_AUTH_BYPASS désactivé",
    ok: process.env.DEMO_AUTH_BYPASS !== "true",
    hint: "Ne jamais mettre à true en production",
    tier: "core",
  },
  {
    name: "NEXT_PUBLIC_APP_URL",
    ok: Boolean(process.env.NEXT_PUBLIC_APP_URL?.trim()),
    hint: "https://www.klirline.app",
    tier: "core",
  },
  {
    name: "STRIPE_SECRET_KEY",
    ok: Boolean(process.env.STRIPE_SECRET_KEY?.trim()),
    hint: "sk_test_ ou sk_live_",
    tier: "billing",
  },
  {
    name: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    ok: Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim()),
    hint: "pk_test_ ou pk_live_",
    tier: "billing",
  },
  {
    name: "STRIPE_WEBHOOK_SECRET",
    ok: Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim()),
    hint: "whsec_ depuis Stripe Dashboard ou stripe listen",
    tier: "billing",
  },
  {
    name: "STRIPE_PRICE_IDS (6)",
    ok: [
      "STRIPE_PRICE_STARTER_MONTHLY",
      "STRIPE_PRICE_GROWTH_MONTHLY",
      "STRIPE_PRICE_BUSINESS_MONTHLY",
      "STRIPE_PRICE_STARTER_YEARLY",
      "STRIPE_PRICE_GROWTH_YEARLY",
      "STRIPE_PRICE_BUSINESS_YEARLY",
    ].every((k) => Boolean(process.env[k]?.trim())),
    hint: "npm run stripe:setup",
    tier: "billing",
  },
  {
    name: "CRON_SECRET",
    ok: Boolean(process.env.CRON_SECRET?.trim()),
    hint: "Automations planifiées Netlify",
    tier: "optional",
  },
  {
    name: "OPENAI_API_KEY (Klir AI)",
    ok: Boolean(process.env.OPENAI_API_KEY?.trim()),
    hint: "Recommandé pour IA en direct",
    tier: "optional",
  },
  {
    name: "RESEND_API_KEY (courriels)",
    ok: Boolean(process.env.RESEND_API_KEY?.trim()),
    hint: "Invitations, reset password, factures",
    tier: "optional",
  },
  {
    name: "ZERNIO_API_KEY (marketing réseaux)",
    ok: Boolean(process.env.ZERNIO_API_KEY?.trim()),
    hint: "Publication auto Instagram, Facebook, LinkedIn… via Zernio",
    tier: "optional",
  },
  {
    name: "GOOGLE_CLIENT_ID + SECRET (OAuth)",
    ok: Boolean(
      process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim()
    ),
    hint: "Google Cloud Console → OAuth 2.0",
    tier: "optional",
  },
];

console.log("\n=== KlirBuild — Vérification production ===\n");

function printTier(label: string, tier: Tier) {
  console.log(`\n── ${label} ──\n`);
  for (const c of checks.filter((x) => x.tier === tier)) {
    const icon = c.ok ? "✅" : "❌";
    console.log(`${icon} ${c.name}${c.hint && !c.ok ? ` → ${c.hint}` : ""}`);
  }
}

printTier("Core (obligatoire)", "core");
printTier("Facturation Stripe", "billing");
printTier("Intégrations optionnelles", "optional");

const coreFailed = checks.filter((c) => c.tier === "core" && !c.ok).length;
const billingFailed = checks.filter((c) => c.tier === "billing" && !c.ok).length;
const optionalFailed = checks.filter((c) => c.tier === "optional" && !c.ok).length;

console.log("\n── Résumé ──");
console.log(`Core: ${coreFailed === 0 ? "✅" : `❌ ${coreFailed} manquant(s)`}`);
console.log(`Billing: ${billingFailed === 0 ? "✅" : `❌ ${billingFailed} manquant(s)`}`);
console.log(`Optionnel: ${optionalFailed === 0 ? "✅" : `⚠️  ${optionalFailed} manquant(s)`}`);

const exitCode = coreFailed > 0 ? 1 : billingFailed > 0 ? 1 : 0;
console.log(
  `\n${exitCode === 0 ? "✅ Prêt pour le déploiement (core + billing)" : "⚠️  Corrigez les éléments ❌ ci-dessus"}`
);
console.log("\nÉtapes suivantes :");
console.log("  1. npm run db:push && npm run db:seed");
console.log("  2. Variables sur Netlify → Trigger deploy");
console.log("  3. Webhook Stripe → https://www.klirline.app/api/stripe/webhook");
console.log("  4. Vérifier /api/health → status: ready\n");

process.exit(exitCode);
