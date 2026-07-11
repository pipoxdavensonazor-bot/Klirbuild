/**
 * Crée les produits + prix KlirBuild dans Stripe (mode Test)
 * et met à jour .env.local avec les price_… IDs.
 *
 * Prérequis: STRIPE_SECRET_KEY=sk_test_… dans .env.local
 * Usage: npm run stripe:setup
 */
import fs from "fs";
import path from "path";
import Stripe from "stripe";

const ROOT = process.cwd();
const ENV_PATH = path.join(ROOT, ".env.local");

const PLANS = [
  {
    id: "starter",
    name: "KlirBuild Starter",
    description: "CRM, devis, pointage GPS, marchés CA/US/Caraïbes — 5 users",
    monthly: 7900,
    yearly: 79000,
  },
  {
    id: "growth",
    name: "KlirBuild Growth",
    description: "Construction OS, paie, conformité, IA — 25 users",
    monthly: 14900,
    yearly: 149000,
  },
  {
    id: "business",
    name: "KlirBuild Business",
    description: "Auto-Pilot, pubs réseaux, automatisations — 100 users",
    monthly: 29900,
    yearly: 299000,
  },
] as const;

function loadEnvLocal() {
  if (!fs.existsSync(ENV_PATH)) {
    console.error("❌ .env.local introuvable à:", ENV_PATH);
    process.exit(1);
  }
  const lines = fs.readFileSync(ENV_PATH, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

function upsertEnv(keys: Record<string, string>) {
  let content = fs.readFileSync(ENV_PATH, "utf8");
  for (const [key, value] of Object.entries(keys)) {
    const regex = new RegExp(`^${key}=.*$`, "m");
    const line = `${key}=${value}`;
    if (regex.test(content)) {
      content = content.replace(regex, line);
    } else {
      content += `\n${line}`;
    }
  }
  fs.writeFileSync(ENV_PATH, content.trimEnd() + "\n", "utf8");
}

async function main() {
  loadEnvLocal();

  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secret) {
    console.error(`
❌ STRIPE_SECRET_KEY est vide dans .env.local

Étapes:
1. https://dashboard.stripe.com/test/apikeys
2. Copiez "Secret key" (sk_test_…)
3. Collez dans .env.local → STRIPE_SECRET_KEY=sk_test_…
4. Relancez: npm run stripe:setup
`);
    process.exit(1);
  }

  if (secret.startsWith("rk_")) {
    console.warn(
      "⚠️  Clé restreinte (rk_). Assurez-vous d'avoir: Products (Write), Prices (Write)."
    );
  }
  if (secret.startsWith("sk_live_") || secret.startsWith("rk_live_")) {
    console.error("❌ Utilisez une clé TEST (sk_test_…) pour ce script.");
    process.exit(1);
  }

  const stripe = new Stripe(secret, { apiVersion: "2026-06-24.dahlia" });

  console.log("🔌 Test connexion Stripe…");
  const balance = await stripe.balance.retrieve();
  console.log(`✅ Connecté (devise: ${balance.available[0]?.currency ?? "cad"})`);

  const envUpdates: Record<string, string> = {};

  for (const plan of PLANS) {
    console.log(`\n📦 Produit: ${plan.name}`);

    const product = await stripe.products.create({
      name: plan.name,
      description: plan.description,
      metadata: { klirbuild_plan: plan.id },
    });

    const monthly = await stripe.prices.create({
      product: product.id,
      currency: "cad",
      unit_amount: plan.monthly,
      recurring: { interval: "month" },
      metadata: { klirbuild_plan: plan.id, cycle: "monthly" },
    });

    const yearly = await stripe.prices.create({
      product: product.id,
      currency: "cad",
      unit_amount: plan.yearly,
      recurring: { interval: "year" },
      metadata: { klirbuild_plan: plan.id, cycle: "yearly" },
    });

    const prefix = plan.id.toUpperCase();
    envUpdates[`STRIPE_PRICE_${prefix}_MONTHLY`] = monthly.id;
    envUpdates[`STRIPE_PRICE_${prefix}_YEARLY`] = yearly.id;

    console.log(`   Mensuel: ${monthly.id} (${plan.monthly / 100} CAD/mois)`);
    console.log(`   Annuel:  ${yearly.id} (${plan.yearly / 100} CAD/an)`);
  }

  upsertEnv(envUpdates);
  console.log("\n✅ .env.local mis à jour avec les 6 Price IDs.");
  console.log("\nProchaines étapes:");
  console.log("1. Vérifiez NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_… dans .env.local");
  console.log("2. Redémarrez: npm run dev");
  console.log("3. Ouvrez http://localhost:3000/billing");
  console.log("4. Carte test Stripe: 4242 4242 4242 4242");
}

main().catch((err) => {
  console.error("❌ Erreur:", err instanceof Error ? err.message : err);
  process.exit(1);
});
