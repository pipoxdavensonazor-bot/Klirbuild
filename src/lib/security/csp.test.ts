import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy, securityHeaders } from "@/lib/security/csp";

describe("csp", () => {
  it("inclut les directives critiques", () => {
    const csp = buildContentSecurityPolicy();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("https://*.daily.co");
  });

  it("expose Content-Security-Policy dans securityHeaders", () => {
    const headers = securityHeaders();
    expect(headers["Content-Security-Policy"]).toContain("object-src 'none'");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["Cross-Origin-Resource-Policy"]).toBe("same-site");
  });
});
