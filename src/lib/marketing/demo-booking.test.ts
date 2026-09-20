import { describe, expect, it } from "vitest";
import {
  DEFAULT_DEMO_BOOKING_URL,
  demoBookingHref,
  resolveDemoBookingUrl,
} from "@/lib/marketing/demo-booking";

describe("resolveDemoBookingUrl", () => {
  it("defaults to the KlirBuild Calendly event", () => {
    expect(resolveDemoBookingUrl(undefined)).toBe(DEFAULT_DEMO_BOOKING_URL);
    expect(resolveDemoBookingUrl("")).toBe(DEFAULT_DEMO_BOOKING_URL);
  });

  it("accepts an https override and rejects unsafe values", () => {
    expect(resolveDemoBookingUrl("https://calendly.com/other/15min")).toBe(
      "https://calendly.com/other/15min"
    );
    expect(resolveDemoBookingUrl("javascript:alert(1)")).toBe(DEFAULT_DEMO_BOOKING_URL);
    expect(resolveDemoBookingUrl("http://evil.test")).toBe(DEFAULT_DEMO_BOOKING_URL);
  });
});

describe("demoBookingHref", () => {
  it("appends UTM params for Calendly attribution", () => {
    const href = demoBookingHref(
      new URLSearchParams("utm_source=google&utm_campaign=qc&lang=fr")
    );
    expect(href.startsWith(DEFAULT_DEMO_BOOKING_URL)).toBe(true);
    expect(href).toContain("utm_source=google");
    expect(href).toContain("utm_campaign=qc");
    expect(href).not.toContain("lang=fr");
  });
});
