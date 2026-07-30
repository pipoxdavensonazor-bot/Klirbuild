import { describe, expect, it } from "vitest";
import { clientIp } from "@/lib/auth/rate-limit";

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
