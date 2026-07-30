import { createHmac } from "crypto";
import { afterEach, describe, expect, it } from "vitest";
import {
  createSignedOAuthState,
  sanitizeOAuthNext,
  verifySignedOAuthState,
} from "@/lib/auth/oauth-state";

describe("oauth signed state", () => {
  const prev = process.env.BETTER_AUTH_SECRET;

  afterEach(() => {
    if (prev === undefined) delete process.env.BETTER_AUTH_SECRET;
    else process.env.BETTER_AUTH_SECRET = prev;
  });

  it("sanitizeOAuthNext bloque les open redirects", () => {
    expect(sanitizeOAuthNext("/dashboard")).toBe("/dashboard");
    expect(sanitizeOAuthNext("/settings?tab=api")).toBe("/settings?tab=api");
    expect(sanitizeOAuthNext("//evil.com")).toBe("/dashboard");
    expect(sanitizeOAuthNext("https://evil.com")).toBe("/dashboard");
    expect(sanitizeOAuthNext("/\\evil.com")).toBe("/dashboard");
  });

  it("signe et vérifie un state valide", () => {
    process.env.BETTER_AUTH_SECRET = "test-secret-at-least-32-characters!!";
    const state = createSignedOAuthState("/billing");
    const verified = verifySignedOAuthState(state);
    expect(verified.ok).toBe(true);
    if (verified.ok) {
      expect(verified.payload.next).toBe("/billing");
      expect(verified.payload.nonce).toHaveLength(32);
      expect(verified.payload.exp).toBeGreaterThan(Date.now());
    }
  });

  it("refuse une signature altérée", () => {
    process.env.BETTER_AUTH_SECRET = "test-secret-at-least-32-characters!!";
    const state = createSignedOAuthState("/dashboard");
    const [body, sig] = state.split(".");
    const flipped = sig!.endsWith("A") ? `${sig!.slice(0, -1)}B` : `${sig!.slice(0, -1)}A`;
    const verified = verifySignedOAuthState(`${body}.${flipped}`);
    expect(verified).toEqual({ ok: false, error: "State OAuth falsifié." });
  });

  it("refuse un state unsigned legacy base64", () => {
    process.env.BETTER_AUTH_SECRET = "test-secret-at-least-32-characters!!";
    const legacy = Buffer.from(JSON.stringify({ next: "/dashboard" })).toString(
      "base64url"
    );
    const verified = verifySignedOAuthState(legacy);
    expect(verified.ok).toBe(false);
  });

  it("refuse un state expiré", () => {
    process.env.BETTER_AUTH_SECRET = "test-secret-at-least-32-characters!!";
    const payload = {
      next: "/dashboard",
      nonce: "abc",
      exp: Date.now() - 1000,
    };
    const body = Buffer.from(JSON.stringify(payload))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    const sig = createHmac("sha256", process.env.BETTER_AUTH_SECRET)
      .update(body)
      .digest("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    const verified = verifySignedOAuthState(`${body}.${sig}`);
    expect(verified).toEqual({ ok: false, error: "State OAuth expiré." });
  });
});
