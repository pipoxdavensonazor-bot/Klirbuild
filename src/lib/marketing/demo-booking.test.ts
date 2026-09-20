import { describe, expect, it } from "vitest";
import { DEMO_INBOX } from "@/lib/marketing/demo-request";
import {
  DEMO_MAILTO_SUBJECT,
  demoBookingHref,
  demoMailtoFallback,
  isExternalDemoBooking,
  resolveDemoBookingUrl,
} from "@/lib/marketing/demo-booking";

describe("resolveDemoBookingUrl", () => {
  it("falls back to mailto when the env var is unset", () => {
    const href = resolveDemoBookingUrl(undefined);
    expect(href).toBe(demoMailtoFallback());
    expect(href.startsWith(`mailto:${DEMO_INBOX}?`)).toBe(true);
    expect(href).toContain(encodeURIComponent(DEMO_MAILTO_SUBJECT));
    expect(resolveDemoBookingUrl("")).toBe(demoMailtoFallback());
  });

  it("uses a safe https override when set", () => {
    expect(resolveDemoBookingUrl("https://calendly.com/other/30min")).toBe(
      "https://calendly.com/other/30min"
    );
    expect(resolveDemoBookingUrl("javascript:alert(1)")).toBe(demoMailtoFallback());
    expect(resolveDemoBookingUrl("http://evil.test")).toBe(demoMailtoFallback());
  });
});

describe("demoBookingHref", () => {
  it("puts UTMs in the mailto body when Calendly is unset", () => {
    const href = demoBookingHref(
      new URLSearchParams("utm_source=google&utm_campaign=qc&lang=fr")
    );
    expect(href.startsWith(`mailto:${DEMO_INBOX}?`)).toBe(true);
    expect(decodeURIComponent(href)).toContain("utm_source=google");
    expect(isExternalDemoBooking(href)).toBe(false);
  });

  it("appends UTM params to an https booking URL", () => {
    const href = demoBookingHref(
      new URLSearchParams("utm_source=google&utm_campaign=qc&lang=fr"),
      "https://calendly.com/contact-klirline-klirbuild/30min"
    );
    expect(href).toContain("calendly.com/contact-klirline-klirbuild/30min");
    expect(href).toContain("utm_source=google");
    expect(href).not.toContain("lang=fr");
    expect(isExternalDemoBooking(href)).toBe(true);
  });
});
