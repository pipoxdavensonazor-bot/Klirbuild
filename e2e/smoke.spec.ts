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
    await expect(page.getByRole("heading", { name: /Connexion|Vérification/i })).toBeVisible();
  });

  test("login → dashboard when credentials provided", async ({ page }) => {
    const email = process.env.SMOKE_EMAIL?.trim();
    const password = process.env.SMOKE_PASSWORD?.trim();
    test.skip(!email || !password, "SMOKE_EMAIL / SMOKE_PASSWORD non définis");

    await page.goto("/login");
    await page.getByPlaceholder("Email").fill(email!);
    await page.getByPlaceholder("Mot de passe").fill(password!);
    await page.getByRole("button", { name: /^(Continuer|Valider)$/i }).click();
    await page.waitForURL(/dashboard|2fa|login/i, { timeout: 30_000 });
    if (page.url().includes("login")) {
      // 2FA step on same form
      test.skip(true, "Compte smoke avec 2FA — utilisez un compte sans 2FA");
    }
    await expect(page).toHaveURL(/dashboard/i);
  });
});
