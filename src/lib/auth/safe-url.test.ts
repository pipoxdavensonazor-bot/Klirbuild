import { describe, expect, it } from "vitest";
import { isSafeHttpUrl } from "@/lib/auth/safe-url";

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
