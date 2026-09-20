import { describe, expect, it } from "vitest";
import { pickTrackingParams, withTrackingQuery } from "@/lib/marketing/utm";

describe("pickTrackingParams", () => {
  it("keeps utm and click ids, drops unrelated keys", () => {
    const params = new URLSearchParams(
      "utm_source=google&utm_campaign=qc&foo=bar&gclid=abc&lang=en"
    );
    const picked = pickTrackingParams(params);
    expect(picked.get("utm_source")).toBe("google");
    expect(picked.get("utm_campaign")).toBe("qc");
    expect(picked.get("gclid")).toBe("abc");
    expect(picked.get("lang")).toBe("en");
    expect(picked.get("foo")).toBeNull();
  });
});

describe("withTrackingQuery", () => {
  it("appends tracking to CTAs", () => {
    const params = new URLSearchParams("utm_source=meta&utm_medium=cpc");
    expect(withTrackingQuery("/contact", params)).toBe(
      "/contact?utm_source=meta&utm_medium=cpc"
    );
    expect(withTrackingQuery("/login", params)).toBe(
      "/login?utm_source=meta&utm_medium=cpc"
    );
  });

  it("can override lang while keeping UTMs", () => {
    const params = new URLSearchParams("utm_source=google&lang=fr");
    expect(withTrackingQuery("/", params, { lang: "en" })).toBe(
      "/?utm_source=google&lang=en"
    );
  });
});
