/**
 * Vérifie la config Stripe (.env.local + connexion API)
 * Usage: npm run stripe:verify
 */
import fs from "fs";
import path from "path";
import Stripe from "stripe";

const ENV_PATH = path.join(process.cwd(), ".env.local");

function loadEnvLocal() {
  if (!fs.existsSync(ENV_PATH)) return;
  for (const line of fs.readFileSync(ENV_PATH, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    process.env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
}

const PRICE_KEYS = [
  "STRIPE_PRICE_STARTER_MONTHLY",
  "STRIPE_PRICE_GROWTH_MONTHLY",
  "STRIPE_PRICE_BUSINESS_MONTHLY",
  "STRIPE_PRICE_STARTER_YEARLY",
  "STRIPE_PRICE_GROWTH_YEARLY",
  "STRIPE_PRICE_BUSINESS_YEARLY",
] as const;

async function main() {
  loadEnvLocal();

  const checks: { label: string; ok: boolean; hint?: string }[] = [];

  const sk = process.env.STRIPE_SECRET_KEY?.trim();
  const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
  checks.push({
    label: "STRIPE_SECRET_KEY",
    ok: Boolean(sk),
    hint: sk?.includes("test") ? "mode test ✓" : sk ? "vérifiez mode test" : "sk_test_…",
  });
  checks.push({
    label: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    ok: Boolean(pk),
    hint: pk?.includes("test") ? "mode test ✓" : "pk_test_…",
  });

  for (const key of PRICE_KEYS) {
    checks.push({
      label: key,
      ok: Boolean(process.env[key]?.trim()),
    });
  }

  console.log("\n── KlirBuild · Vérification Stripe ──\n");
  for (const c of checks) {
    console.log(`${c.ok ? "✅" : "❌"} ${c.label}${c.hint ? ` (${c.hint})` : ""}`);
  }

  if (!sk) {
    console.log("\n→ Remplissez .env.local puis relancez npm run stripe:verify\n");
    process.exit(1);
  }

  try {
    const stripe = new Stripe(sk, { apiVersion: "2026-06-24.dahlia" });
    await stripe.balance.retrieve();
    console.log("\n✅ Connexion API Stripe OK");
  } catch (e) {
    console.log("\n❌ Connexion refusée:", e instanceof Error ? e.message : e);
    process.exit(1);
  }

  const missingPrices = PRICE_KEYS.filter((k) => !process.env[k]?.trim());
  if (missingPrices.length) {
    console.log(`\n⚠️  ${missingPrices.length} Price ID(s) manquant(s) → npm run stripe:setup\n`);
    process.exit(1);
  }

  console.log("\n🎉 Stripe prêt pour /billing\n");
}

main();
