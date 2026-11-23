import { describe, expect, it } from "vitest";
import {
  isResendEmailId,
  normalizeAddress,
  resendReceivingUrl,
} from "./inbound-parse";

describe("normalizeAddress", () => {
  it("extrait l’adresse entre chevrons", () => {
    expect(normalizeAddress("Ada <ada@klirline.ca>")).toBe("ada@klirline.ca");
    expect(normalizeAddress("  ada@klirline.ca  ")).toBe("ada@klirline.ca");
  });

  it("ne s’effondre pas sur une entrée hostile typique ReDoS", () => {
    const attack = "<" + "<=".repeat(5000);
    const started = Date.now();
    expect(normalizeAddress(attack)).toBe(attack.toLowerCase());
    expect(Date.now() - started).toBeLessThan(200);
  });
});

describe("resendReceivingUrl", () => {
  it("accepte un identifiant Resend et fige l’hôte", () => {
    const url = resendReceivingUrl("abc_DEF-123");
    expect(url?.href).toBe("https://api.resend.com/emails/receiving/abc_DEF-123");
    expect(url?.hostname).toBe("api.resend.com");
  });

  it("refuse les id qui permettraient une SSRF", () => {
    expect(isResendEmailId("../x")).toBe(false);
    expect(resendReceivingUrl("../x")).toBeNull();
    expect(resendReceivingUrl("abc@evil.com")).toBeNull();
    expect(resendReceivingUrl("abc/../../evil")).toBeNull();
    expect(resendReceivingUrl("abc?host=evil.com")).toBeNull();
    expect(resendReceivingUrl("")).toBeNull();
  });
});
