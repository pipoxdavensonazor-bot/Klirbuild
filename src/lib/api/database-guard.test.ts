import { describe, expect, it } from "vitest";
import {
  apiRequiresDatabase,
  DATABASE_REQUIRED_MESSAGE,
} from "@/lib/api/database-guard";

describe("database-guard", () => {
  it("requires database for business API routes", () => {
    expect(apiRequiresDatabase("/api/clients")).toBe(true);
    expect(apiRequiresDatabase("/api/construction")).toBe(true);
    expect(apiRequiresDatabase("/api/api-keys")).toBe(true);
  });

  it("whitelists health, auth, stripe, cron, uploads", () => {
    expect(apiRequiresDatabase("/api/health")).toBe(false);
    expect(apiRequiresDatabase("/api/auth/login")).toBe(false);
    expect(apiRequiresDatabase("/api/stripe/webhook")).toBe(false);
    expect(apiRequiresDatabase("/api/cron/automations")).toBe(false);
    expect(apiRequiresDatabase("/api/uploads/foo")).toBe(false);
  });

  it("exposes a French database required message", () => {
    expect(DATABASE_REQUIRED_MESSAGE).toContain("DATABASE_URL");
  });
});
