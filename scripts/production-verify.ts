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

type Check = { name: string; ok: boolean; hint?: string };

const checks: Check[] = [
  {
    name: "DATABASE_URL",
    ok: Boolean(process.env.DATABASE_URL?.trim()),
    hint: "Netlify Database ou Neon/Supabase",
  },
  {
    name: "STRIPE_SECRET_KEY",
    ok: Boolean(process.env.STRIPE_SECRET_KEY?.trim()),
    hint: "sk_test_ ou sk_live_",
  },
  {
    name: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    ok: Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim()),
    hint: "pk_test_ ou pk_live_",
  },
  {
    name: "STRIPE_WEBHOOK_SECRET",
    ok: Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim()),
    hint: "whsec_ depuis Stripe Dashboard ou stripe listen",
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
  },
  {
    name: "NEXT_PUBLIC_APP_URL",
    ok: Boolean(process.env.NEXT_PUBLIC_APP_URL?.trim()),
    hint: "https://votre-site.netlify.app",
  },
  {
    name: "BETTER_AUTH_SECRET",
    ok: Boolean(process.env.BETTER_AUTH_SECRET?.trim()),
    hint: "Chaîne aléatoire longue (sessions)",
  },
  {
    name: "DEMO_AUTH_BYPASS=false",
    ok: process.env.DEMO_AUTH_BYPASS === "false",
    hint: "Obligatoire en production",
  },
];

console.log("\n=== KlirBuild — Vérification production ===\n");

let failed = 0;
for (const c of checks) {
  const icon = c.ok ? "✅" : "❌";
  console.log(`${icon} ${c.name}${c.hint && !c.ok ? ` → ${c.hint}` : ""}`);
  if (!c.ok) failed++;
}

console.log(`\n${failed === 0 ? "✅ Prêt pour le déploiement" : `⚠️  ${failed} élément(s) à corriger`}`);
console.log("\nÉtapes suivantes :");
console.log("  1. npm run db:push && npm run db:seed");
console.log("  2. npx netlify link (ou connecter le repo Git)");
console.log("  3. Variables d'env sur Netlify (copier depuis .env.local)");
console.log("  4. npx netlify deploy --prod");
console.log("  5. Webhook Stripe → https://VOTRE-SITE.netlify.app/api/stripe/webhook\n");

process.exit(failed > 0 ? 1 : 0);
