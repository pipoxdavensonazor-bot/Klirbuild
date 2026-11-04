import { describe, expect, it } from "vitest";
import { clientIp, rateLimitMemory, rateLimitWithStore, type RateLimitStore } from "@/lib/auth/rate-limit";

function memoryStore(): RateLimitStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    async get(key) {
      return data.get(key) ?? null;
    },
    async put(key, value) {
      data.set(key, value);
    },
  };
}

describe("clientIp", () => {
  it("préfère CF-Connecting-IP", () => {
    const req = new Request("https://klirline.app/api/x", {
      headers: {
        "cf-connecting-ip": "1.2.3.4",
        "x-forwarded-for": "9.9.9.9, 1.2.3.4",
      },
    });
    expect(clientIp(req)).toBe("1.2.3.4");
  });

  it("utilise le dernier hop XFF (ajouté par le proxy)", () => {
    const req = new Request("https://klirline.app/api/x", {
      headers: { "x-forwarded-for": "9.9.9.9, 8.8.8.8" },
    });
    expect(clientIp(req)).toBe("8.8.8.8");
  });
});

describe("rate limit store", () => {
  it("partage le compteur entre deux appels du même store", async () => {
    const store = memoryStore();
    const input = { key: "login:1.1.1.1", limit: 2, windowMs: 60_000, now: 1_000 };
    expect((await rateLimitWithStore(store, input)).ok).toBe(true);
    expect((await rateLimitWithStore(store, input)).ok).toBe(true);
    const blocked = await rateLimitWithStore(store, input);
    expect(blocked.ok).toBe(false);
  });

  it("le fallback mémoire reste local", () => {
    const key = `mem-${Date.now()}`;
    expect(rateLimitMemory({ key, limit: 1, windowMs: 60_000 }).ok).toBe(true);
    expect(rateLimitMemory({ key, limit: 1, windowMs: 60_000 }).ok).toBe(false);
  });
});
