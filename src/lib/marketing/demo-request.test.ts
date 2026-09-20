import { describe, expect, it } from "vitest";
import {
  DEMO_INBOX,
  demoMailto,
  isHoneypotTripped,
  parseDemoRequest,
} from "@/lib/marketing/demo-request";

describe("parseDemoRequest", () => {
  it("requires name, email, company", () => {
    const result = parseDemoRequest({
      name: "",
      email: "ops@gc.test",
      company: "Nordic GC",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = parseDemoRequest({
      name: "Alex",
      email: "not-an-email",
      company: "Nordic GC",
    });
    expect(result.ok).toBe(false);
  });

  it("accepts a valid request and builds mailto with UTM", () => {
    const result = parseDemoRequest({
      name: "Alex Tremblay",
      email: "alex@nordic.test",
      company: "Nordic GC",
      lang: "fr",
      tracking: { utm_source: "google", utm_campaign: "qc" },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const mailto = demoMailto(result.value);
    expect(mailto.startsWith(`mailto:${DEMO_INBOX}?`)).toBe(true);
    expect(mailto).toContain(encodeURIComponent("Démo KlirBuild 30 min"));
    expect(decodeURIComponent(mailto)).toContain("utm_source=google");
  });
});

describe("honeypot", () => {
  it("trips when website is filled", () => {
    expect(isHoneypotTripped({ name: "x", email: "a@b.c", company: "c", website: "http://spam" })).toBe(
      true
    );
    expect(isHoneypotTripped({ name: "x", email: "a@b.c", company: "c" })).toBe(false);
  });
});
