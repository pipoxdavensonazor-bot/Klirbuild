import { describe, expect, it } from "vitest";
import {
  isNativeUserAgent,
  isPublicPath,
  isUnauthenticatedPublicPath,
} from "@/lib/marketing/public-paths";

describe("isPublicPath", () => {
  it("treats / as public without opening every route", () => {
    expect(isPublicPath("/")).toBe(true);
    expect(isPublicPath("/dashboard")).toBe(false);
    expect(isPublicPath("/construction")).toBe(false);
    expect(isPublicPath("/construction/marketing")).toBe(false);
  });

  it("allows marketing, contact, and existing auth pages", () => {
    expect(isPublicPath("/accueil")).toBe(true);
    expect(isPublicPath("/marketing")).toBe(true);
    expect(isPublicPath("/contact")).toBe(true);
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/register")).toBe(true);
    expect(isPublicPath("/privacy")).toBe(true);
  });
});

describe("isUnauthenticatedPublicPath", () => {
  it("keeps native shells on / behind login", () => {
    expect(isUnauthenticatedPublicPath("/", "Mozilla/5.0")).toBe(true);
    expect(
      isUnauthenticatedPublicPath("/", "Mozilla/5.0 Capacitor/7.0")
    ).toBe(false);
    expect(isUnauthenticatedPublicPath("/accueil", "Mozilla/5.0 Capacitor/7.0")).toBe(
      true
    );
  });

  it("detects Capacitor and Tauri user agents", () => {
    expect(isNativeUserAgent("KlirBuild/1.0 Capacitor")).toBe(true);
    expect(isNativeUserAgent("Tauri/2.0")).toBe(true);
    expect(isNativeUserAgent("Chrome/120")).toBe(false);
  });
});
