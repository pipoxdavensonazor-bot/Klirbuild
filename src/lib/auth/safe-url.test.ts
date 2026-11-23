import { describe, expect, it } from "vitest";
import { isSafeHttpUrl, isSafeMediaUrl } from "@/lib/auth/safe-url";

describe("isSafeHttpUrl", () => {
  it("accepte http(s)", () => {
    expect(isSafeHttpUrl("https://klirline.app/x")).toBe(true);
    expect(isSafeHttpUrl("http://localhost:3000")).toBe(true);
  });

  it("refuse javascript: et chemins relatifs", () => {
    expect(isSafeHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeHttpUrl("/relative")).toBe(false);
    expect(isSafeHttpUrl("")).toBe(false);
  });
});

describe("isSafeMediaUrl", () => {
  it("accepte http(s) et les chemins same-origin", () => {
    expect(isSafeMediaUrl("https://cdn.klirline.app/a.png")).toBe(true);
    expect(isSafeMediaUrl("/uploads/a.png")).toBe(true);
  });

  it("refuse javascript:, data: et les protocol-relative", () => {
    expect(isSafeMediaUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeMediaUrl("data:text/html,<img src=x onerror=alert(1)>")).toBe(false);
    expect(isSafeMediaUrl("//evil.example/x.png")).toBe(false);
    expect(isSafeMediaUrl("")).toBe(false);
  });
});
