/**
 * Smoke test post-déploiement — endpoints critiques + flux CRM optionnel.
 * Usage: npm run smoke:test
 *        SMOKE_BASE_URL=https://klirline.app npm run smoke:test
 * Flux login→client→devis→facture si SMOKE_EMAIL + SMOKE_PASSWORD définis.
 */
const base =
  process.env.SMOKE_BASE_URL?.trim() ||
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  "http://localhost:3000";

const url = base.replace(/\/$/, "");

type Check = { name: string; ok: boolean; detail?: string };

const results: Check[] = [];

function collectCookies(res: Response, jar: Map<string, string>) {
  const anyHeaders = res.headers as Headers & {
    getSetCookie?: () => string[];
  };
  const list =
    typeof anyHeaders.getSetCookie === "function"
      ? anyHeaders.getSetCookie()
      : [];
  const single = res.headers.get("set-cookie");
  const all = list.length ? list : single ? [single] : [];
  for (const raw of all) {
    const part = raw.split(";")[0];
    if (!part) continue;
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    jar.set(part.slice(0, eq).trim(), part.slice(eq + 1).trim());
  }
}

function cookieHeader(jar: Map<string, string>) {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

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
    const checks = (health.json.checks || {}) as Record<
      string,
      { ok?: boolean }
    >;
    results.push({
      name: "GET /api/health",
      ok: health.res.status === 200 || health.res.status === 503,
      detail: `HTTP ${health.res.status} · status=${status ?? "?"}`,
    });
    results.push({
      name: "health.checks.stripePrices présent",
      ok: Boolean(checks.stripePrices),
      detail: checks.stripePrices
        ? `ok=${Boolean(checks.stripePrices.ok)}`
        : "manquant",
    });
    results.push({
      name: "health.checks.authSecret présent",
      ok: Boolean(checks.authSecret),
      detail: checks.authSecret
        ? `ok=${Boolean(checks.authSecret.ok)}`
        : "manquant",
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
    const bad = await fetch(`${url}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "smoke-invalid@example.com",
        password: "wrong-password-xyz",
      }),
    });
    results.push({
      name: "POST /api/auth/login (identifiants invalides)",
      ok: bad.status === 401 || bad.status === 429,
      detail: `HTTP ${bad.status}`,
    });
  } catch (e) {
    results.push({
      name: "POST /api/auth/login (identifiants invalides)",
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

  const smokeEmail = process.env.SMOKE_EMAIL?.trim();
  const smokePassword = process.env.SMOKE_PASSWORD?.trim();
  if (!smokeEmail || !smokePassword) {
    results.push({
      name: "CRM login → client → devis → facture",
      ok: true,
      detail: "skipped (définir SMOKE_EMAIL + SMOKE_PASSWORD)",
    });
  } else {
    try {
      const jar = new Map<string, string>();
      const loginRes = await fetch(`${url}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: smokeEmail, password: smokePassword }),
      });
      collectCookies(loginRes, jar);
      const loginJson = (await loginRes.json().catch(() => ({}))) as {
        requires2fa?: boolean;
        error?: string;
        ok?: boolean;
      };
      if (loginJson.requires2fa) {
        results.push({
          name: "CRM login → client → devis → facture",
          ok: false,
          detail: "Compte avec 2FA — utilisez un compte smoke sans 2FA",
        });
      } else if (!loginRes.ok) {
        results.push({
          name: "CRM login → client → devis → facture",
          ok: false,
          detail: `Login HTTP ${loginRes.status}: ${loginJson.error || "?"}`,
        });
      } else {
        const cookie = cookieHeader(jar);
        const stamp = Date.now();
        const clientRes = await fetch(`${url}/api/clients`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: cookie,
          },
          body: JSON.stringify({
            name: `Smoke Client ${stamp}`,
            email: `smoke+${stamp}@example.com`,
            status: "lead",
          }),
        });
        const clientJson = (await clientRes.json().catch(() => ({}))) as {
          client?: { id?: string };
          error?: string;
        };
        const clientId = clientJson.client?.id;
        if (!clientRes.ok || !clientId) {
          results.push({
            name: "CRM login → client → devis → facture",
            ok: false,
            detail: `Client HTTP ${clientRes.status}: ${clientJson.error || "?"}`,
          });
        } else {
          const quoteRes = await fetch(`${url}/api/quotes`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Cookie: cookie,
            },
            body: JSON.stringify({
              clientId,
              total: 100,
              description: `Smoke quote ${stamp}`,
              marketRegion: "CA-QC",
            }),
          });
          const quoteJson = (await quoteRes.json().catch(() => ({}))) as {
            quote?: { id?: string };
            error?: string;
          };
          const invoiceRes = await fetch(`${url}/api/invoices`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Cookie: cookie,
            },
            body: JSON.stringify({
              clientId,
              total: 150,
              description: `Smoke invoice ${stamp}`,
              marketRegion: "CA-QC",
            }),
          });
          const invoiceJson = (await invoiceRes.json().catch(() => ({}))) as {
            invoice?: { id?: string };
            error?: string;
          };
          const ok =
            quoteRes.ok &&
            Boolean(quoteJson.quote?.id) &&
            invoiceRes.ok &&
            Boolean(invoiceJson.invoice?.id);
          results.push({
            name: "CRM login → client → devis → facture",
            ok,
            detail: ok
              ? `quote=${quoteJson.quote?.id} invoice=${invoiceJson.invoice?.id}`
              : `quote HTTP ${quoteRes.status} (${quoteJson.error || "?"}) · invoice HTTP ${invoiceRes.status} (${invoiceJson.error || "?"})`,
          });
        }
      }
    } catch (e) {
      results.push({
        name: "CRM login → client → devis → facture",
        ok: false,
        detail: e instanceof Error ? e.message : "Network error",
      });
    }
  }

  for (const r of results) {
    console.log(`${r.ok ? "✅" : "❌"} ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
  }

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${failed === 0 ? "✅ Smoke test OK" : `⚠️  ${failed} échec(s)`}\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
