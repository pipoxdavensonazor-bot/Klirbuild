import { describe, expect, it } from "vitest";
import {
  isSafeHttpUrl,
  isSafeMediaUrl,
  toSafeHttpUrl,
  toSafeMediaSrc,
} from "@/lib/auth/safe-url";

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

describe("toSafeHttpUrl", () => {
  it("reconstruit href, jamais la valeur brute", () => {
    expect(toSafeHttpUrl("https://klirline.app/x")).toBe("https://klirline.app/x");
    expect(toSafeHttpUrl("  HTTP://Example.COM/a  ")).toBe("http://example.com/a");
    expect(toSafeHttpUrl("javascript:alert(1)")).toBeNull();
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

describe("toSafeMediaSrc", () => {
  it("reconstruit les URL http(s) et les chemins same-origin", () => {
    expect(toSafeMediaSrc("https://cdn.klirline.app/a.png")).toBe(
      "https://cdn.klirline.app/a.png"
    );
    expect(toSafeMediaSrc("/uploads/a.png")).toBe("/uploads/a.png");
    expect(toSafeMediaSrc("/uploads/a.png?x=1#y")).toBe("/uploads/a.png?x=1#y");
    expect(toSafeMediaSrc("/foo/../bar.png")).toBe("/bar.png");
  });

  it("refuse les schémas dangereux et ne renvoie jamais l’entrée brute invalide", () => {
    expect(toSafeMediaSrc("javascript:alert(1)")).toBeNull();
    expect(toSafeMediaSrc("data:text/html,<img src=x onerror=alert(1)>")).toBeNull();
    expect(toSafeMediaSrc("//evil.example/x.png")).toBeNull();
    expect(toSafeMediaSrc("")).toBeNull();
  });
});
