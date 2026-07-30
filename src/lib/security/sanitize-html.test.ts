import { describe, expect, it } from "vitest";
import { sanitizeEmailHtml } from "@/lib/security/sanitize-html";

describe("sanitizeEmailHtml", () => {
  it("supprime les scripts et handlers", () => {
    const dirty =
      `<p>Bonjour</p><script>alert(1)</script><img src=x onerror="alert(2)"><a href="javascript:alert(3)">x</a>`;
    const clean = sanitizeEmailHtml(dirty);
    expect(clean).toContain("Bonjour");
    expect(clean.toLowerCase()).not.toContain("<script");
    expect(clean.toLowerCase()).not.toContain("onerror");
    expect(clean.toLowerCase()).not.toContain("javascript:");
  });

  it("conserve le HTML email utile", () => {
    const html = `<p>Facture <strong>#12</strong></p><a href="https://klirline.app">Voir</a>`;
    const clean = sanitizeEmailHtml(html);
    expect(clean).toContain("Facture");
    expect(clean).toContain("<strong>");
    expect(clean).toContain('href="https://klirline.app"');
    expect(clean).toContain('rel="noopener noreferrer nofollow"');
  });
});
