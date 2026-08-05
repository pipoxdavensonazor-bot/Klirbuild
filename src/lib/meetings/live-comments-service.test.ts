import { describe, expect, it } from "vitest";

describe("live comment sanitizers (inline)", () => {
  it("trims and caps body length", () => {
    const MAX = 500;
    const raw = `  ${"a".repeat(600)}  `;
    const body = raw.trim().slice(0, MAX);
    expect(body.length).toBe(500);
  });

  it("falls back author name", () => {
    const name = "".trim().slice(0, 80) || "Spectateur";
    expect(name).toBe("Spectateur");
  });
});
