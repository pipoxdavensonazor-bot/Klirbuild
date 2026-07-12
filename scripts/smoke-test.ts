/**
 * Smoke test post-déploiement — vérifie les endpoints critiques.
 * Usage: npm run smoke:test
 *        SMOKE_BASE_URL=https://www.klirline.app npm run smoke:test
 */
const base =
  process.env.SMOKE_BASE_URL?.trim() ||
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  "http://localhost:3000";

const url = base.replace(/\/$/, "");

type Check = { name: string; ok: boolean; detail?: string };

const results: Check[] = [];

async function get(path: string) {
  const res = await fetch(`${url}${path}`, { redirect: "manual" });
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {
    /* not json */
  }
  return { res, json, text };
}

async function main() {
  console.log(`\n=== Klirline smoke test — ${url} ===\n`);

  try {
    const health = await get("/api/health");
    const status = health.json.status as string | undefined;
    results.push({
      name: "GET /api/health",
      ok: health.res.status === 200 || health.res.status === 503,
      detail: `HTTP ${health.res.status} · status=${status ?? "?"}`,
    });
  } catch (e) {
    results.push({
      name: "GET /api/health",
      ok: false,
      detail: e instanceof Error ? e.message : "Network error",
    });
  }

  try {
    const login = await get("/login");
    results.push({
      name: "GET /login",
      ok: login.res.status === 200,
      detail: `HTTP ${login.res.status}`,
    });
  } catch (e) {
    results.push({
      name: "GET /login",
      ok: false,
      detail: e instanceof Error ? e.message : "Network error",
    });
  }

  try {
    const manifest = await get("/manifest.webmanifest");
    results.push({
      name: "GET /manifest.webmanifest",
      ok: manifest.res.status === 200,
      detail: `HTTP ${manifest.res.status}`,
    });
  } catch (e) {
    results.push({
      name: "GET /manifest.webmanifest",
      ok: false,
      detail: e instanceof Error ? e.message : "Network error",
    });
  }

  try {
    const cron = await fetch(`${url}/api/cron/recurring-invoices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "ping" }),
    });
    results.push({
      name: "POST /api/cron/recurring-invoices (sans secret)",
      ok: cron.status === 401 || cron.status === 200 || cron.status === 503,
      detail: `HTTP ${cron.status} (401 attendu en prod sans CRON_SECRET)`,
    });
  } catch (e) {
    results.push({
      name: "POST /api/cron/recurring-invoices",
      ok: false,
      detail: e instanceof Error ? e.message : "Network error",
    });
  }

  try {
    const webhook = await fetch(`${url}/api/resend/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "ping" }),
    });
    results.push({
      name: "POST /api/resend/webhook (sans signature)",
      ok: webhook.status === 401,
      detail: `HTTP ${webhook.status} (401 attendu sans Svix)`,
    });
  } catch (e) {
    results.push({
      name: "POST /api/resend/webhook",
      ok: false,
      detail: e instanceof Error ? e.message : "Network error",
    });
  }

  for (const r of results) {
    console.log(`${r.ok ? "✅" : "❌"} ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
  }

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${failed === 0 ? "✅ Smoke test OK" : `⚠️  ${failed} échec(s)`}\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
