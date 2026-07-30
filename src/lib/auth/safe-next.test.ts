import { describe, expect, it } from "vitest";
import { sanitizeNextPath } from "@/lib/auth/safe-next";

describe("sanitizeNextPath", () => {
  it("accepte les chemins relatifs sûrs", () => {
    expect(sanitizeNextPath("/dashboard")).toBe("/dashboard");
    expect(sanitizeNextPath("/settings?tab=api")).toBe("/settings?tab=api");
  });

  it("bloque les open redirects", () => {
    expect(sanitizeNextPath("//evil.com")).toBe("/dashboard");
    expect(sanitizeNextPath("https://evil.com")).toBe("/dashboard");
    expect(sanitizeNextPath("/\\evil.com")).toBe("/dashboard");
    expect(sanitizeNextPath(null)).toBe("/dashboard");
  });
});
