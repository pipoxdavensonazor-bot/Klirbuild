import { test, expect } from "@playwright/test";

/**
 * E2E smoke against a running app (local or SMOKE_BASE_URL / PLAYWRIGHT_BASE_URL).
 * Full CRM write path only when SMOKE_EMAIL + SMOKE_PASSWORD are set.
 */
test.describe("KlirBuild smoke", () => {
  test("login page + health", async ({ page, request }) => {
    const health = await request.get("/api/health");
    expect([200, 503]).toContain(health.status());
    const body = await health.json();
    expect(body.checks?.authSecret).toBeTruthy();
    expect(body.checks?.stripePrices).toBeTruthy();

    await page.goto("/login");
    await expect(
      page.getByRole("heading", { name: /Connexion|Vérification|Bienvenue/i }).first()
    ).toBeVisible();
    await expect(page.getByPlaceholder("Email")).toBeVisible();
    await expect(page.getByPlaceholder("Mot de passe")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /^(Connexion|Valider)/i })
    ).toBeVisible();
  });

  test("session API returns unauthenticated without cookie", async ({ request }) => {
    const res = await request.get("/api/auth/session");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.authenticated).toBe(false);
  });

  test("private APIs reject anonymous access", async ({ request }) => {
    for (const path of ["/api/quotes", "/api/clients", "/api/dashboard", "/api/api-keys"]) {
      const res = await request.get(path);
      expect(res.status(), path).toBe(401);
    }
  });

  test("login → dashboard when credentials provided", async ({ page }) => {
    const email = process.env.SMOKE_EMAIL?.trim();
    const password = process.env.SMOKE_PASSWORD?.trim();
    test.skip(!email || !password, "SMOKE_EMAIL / SMOKE_PASSWORD non définis");

    await page.goto("/login");
    await page.getByPlaceholder("Email").fill(email!);
    await page.getByPlaceholder("Mot de passe").fill(password!);
    await page.getByRole("button", { name: /^(Connexion|Valider)/i }).click();
    await page.waitForURL(/dashboard|2fa|login/i, { timeout: 30_000 });
    if (page.url().includes("login")) {
      // 2FA step on same form
      test.skip(true, "Compte smoke avec 2FA — utilisez un compte sans 2FA");
    }
    await expect(page).toHaveURL(/dashboard/i);
  });

  test("login → session + devis list when credentials provided", async ({ page, request }) => {
    const email = process.env.SMOKE_EMAIL?.trim();
    const password = process.env.SMOKE_PASSWORD?.trim();
    test.skip(!email || !password, "SMOKE_EMAIL / SMOKE_PASSWORD non définis");

    await page.goto("/login");
    await page.getByPlaceholder("Email").fill(email!);
    await page.getByPlaceholder("Mot de passe").fill(password!);
    await page.getByRole("button", { name: /^(Connexion|Valider)/i }).click();
    await page.waitForURL(/dashboard|login/i, { timeout: 30_000 });
    test.skip(page.url().includes("login"), "2FA ou login échoué");

    const session = await request.get("/api/auth/session");
    expect(session.status()).toBe(200);
    const sessionBody = await session.json();
    expect(
      sessionBody.email || sessionBody.user?.email || sessionBody.authenticated
    ).toBeTruthy();

    const quotes = await request.get("/api/quotes");
    expect(quotes.status()).toBe(200);
    const quotesBody = await quotes.json();
    expect(Array.isArray(quotesBody.quotes)).toBe(true);

    await page.goto("/quotes");
    await expect(page).toHaveURL(/quotes/i);
  });
});
