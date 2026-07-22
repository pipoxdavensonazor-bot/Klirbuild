#!/usr/bin/env node
/**
 * Crée produits/prix KlirBuild dans Stripe (mode test) et pousse les secrets Worker.
 * Usage: STRIPE_SECRET_KEY=sk_test_… node scripts/stripe-provision-prod.mjs
 */
import Stripe from "stripe";
import { spawnSync } from "child_process";
import { writeFileSync } from "fs";

const secret = process.env.STRIPE_SECRET_KEY?.trim();
const publishable = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() || "";

if (!secret) {
  console.error("❌ STRIPE_SECRET_KEY manquant");
  console.error("   Exportez sk_test_… puis relancez.");
  process.exit(1);
}
if (secret.startsWith("sk_live_") || secret.startsWith("rk_live_")) {
  console.error("❌ Utilisez une clé TEST (sk_test_…) pour ce script.");
  process.exit(1);
}

const stripe = new Stripe(secret);

const PLANS = [
  { id: "starter", name: "KlirBuild Starter", monthly: 7900, yearly: 79000 },
  { id: "growth", name: "KlirBuild Growth", monthly: 14900, yearly: 149000 },
  { id: "business", name: "KlirBuild Business", monthly: 29900, yearly: 299000 },
];

function putSecret(name, value) {
  if (!value) return;
  const r = spawnSync("npx", ["wrangler", "secret", "put", name], {
    input: value,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout);
    throw new Error(`wrangler secret put ${name} failed`);
  }
  console.log(`✅ Worker secret ${name}`);
}

const out = {};

for (const plan of PLANS) {
  const existing = await stripe.products.search({
    query: `name~"${plan.name}" AND active:"true"`,
    limit: 1,
  });
  let product = existing.data[0];
  if (!product) {
    product = await stripe.products.create({
      name: plan.name,
      metadata: { klirbuild_plan: plan.id },
    });
    console.log(`➕ Product ${plan.name} → ${product.id}`);
  } else {
    console.log(`↩ Product ${plan.name} → ${product.id}`);
  }

  for (const [cycle, amount] of [
    ["MONTHLY", plan.monthly],
    ["YEARLY", plan.yearly],
  ]) {
    const interval = cycle === "MONTHLY" ? "month" : "year";
    const prices = await stripe.prices.list({
      product: product.id,
      active: true,
      limit: 100,
    });
    let price = prices.data.find(
      (p) =>
        p.recurring?.interval === interval &&
        p.unit_amount === amount &&
        p.currency === "cad"
    );
    if (!price) {
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: amount,
        currency: "cad",
        recurring: { interval },
        metadata: { klirbuild_plan: plan.id, cycle: cycle.toLowerCase() },
      });
      console.log(`  ➕ price ${cycle} → ${price.id}`);
    } else {
      console.log(`  ↩ price ${cycle} → ${price.id}`);
    }
    out[`STRIPE_PRICE_${plan.id.toUpperCase()}_${cycle}`] = price.id;
  }
}

writeFileSync(
  ".stripe-prices.generated.json",
  JSON.stringify({ ...out, generatedAt: new Date().toISOString() }, null, 2)
);
console.log("\n📄 .stripe-prices.generated.json écrit");

putSecret("STRIPE_SECRET_KEY", secret);
if (publishable) putSecret("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", publishable);
for (const [k, v] of Object.entries(out)) putSecret(k, v);

console.log("\n✅ Stripe API provisionnée. Créez le webhook:");
console.log("   https://klirline.app/api/stripe/webhook");
console.log("   puis: printf '%s' 'whsec_…' | npx wrangler secret put STRIPE_WEBHOOK_SECRET");
console.log("   puis: npm run deploy");
