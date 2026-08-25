import { describe, expect, it } from "vitest";
import { extractPublicEmails, normalizeEmail } from "@/lib/prospecting/extract-public-email";
import { parsePublicHttpUrl } from "@/lib/prospecting/public-url";
import { parseEdgarAtom } from "@/lib/prospecting/edgar";
import { parseScanInput } from "@/lib/prospecting/parse-input";
import { countriesForRegion } from "@/lib/prospecting/americas";
import { buildWikidataQuery } from "@/lib/prospecting/wikidata";

describe("extractPublicEmails", () => {
  it("prend contact@ du domaine et ignore noreply", () => {
    const html = `
      <a href="mailto:noreply@brand.com">x</a>
      Contact: contact@brand.com
      <img src="https://cdn.sentry.io/foo@sentry.io/x.png" />
    `;
    expect(extractPublicEmails(html, "brand.com")).toEqual(["contact@brand.com"]);
  });

  it("normalise et refuse example.com", () => {
    expect(normalizeEmail("Info@Example.com.")).toBeNull();
    expect(normalizeEmail("hello@klirline.ca")).toBe("hello@klirline.ca");
  });
});

describe("parsePublicHttpUrl", () => {
  it("accepte https public et refuse le loopback", () => {
    expect(parsePublicHttpUrl("https://www.klirline.ca/contact")?.hostname).toBe("www.klirline.ca");
    expect(parsePublicHttpUrl("http://127.0.0.1/secret")).toBeNull();
    expect(parsePublicHttpUrl("http://192.168.1.8")).toBeNull();
    expect(parsePublicHttpUrl("file:///etc/passwd")).toBeNull();
  });
});

describe("parseEdgarAtom", () => {
  it("extrait le nom d’entreprise d’un flux Form D", () => {
    const xml = `
      <feed>
        <entry>
          <title>D - Sunrise Labs Inc (0001888123) (Filer)</title>
          <link href="https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&amp;CIK=0001888123" />
        </entry>
      </feed>
    `;
    const rows = parseEdgarAtom(xml);
    expect(rows[0]?.name).toBe("Sunrise Labs Inc");
    expect(rows[0]?.source).toBe("SEC Form D");
    expect(rows[0]?.website).toBeNull();
  });
});

describe("parseScanInput", () => {
  it("défaut Amériques / tous secteurs / mix", () => {
    const parsed = parseScanInput({});
    expect(parsed).toMatchObject({ region: "americas", sector: "all", focus: "mix" });
  });

  it("refuse une région hors liste", () => {
    expect(parseScanInput({ region: "linkedin" })).toEqual({ error: "Région invalide." });
  });
});

describe("américas + wikidata", () => {
  it("Haïti ne contient que HT", () => {
    expect(countriesForRegion("HT").map((c) => c.iso)).toEqual(["HT"]);
  });

  it("n’injecte que des Q-id whitelistés", () => {
    const q = buildWikidataQuery({
      region: "HT",
      sector: "retail",
      focus: "startups",
      limit: 5,
    });
    expect(q).toContain("wd:Q790");
    expect(q).toContain("wd:Q126793");
    expect(q).not.toContain("linkedin");
  });
});
