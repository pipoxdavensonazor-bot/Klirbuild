import { describe, expect, it } from "vitest";
import { rateLimit } from "@/lib/auth/rate-limit";

describe("rateLimit", () => {
  it("autorise jusqu'à la limite puis bloque", () => {
    const key = `test-${Date.now()}-${Math.random()}`;
    expect(rateLimit({ key, limit: 2, windowMs: 60_000 }).ok).toBe(true);
    expect(rateLimit({ key, limit: 2, windowMs: 60_000 }).ok).toBe(true);
    const blocked = rateLimit({ key, limit: 2, windowMs: 60_000 });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });
});
