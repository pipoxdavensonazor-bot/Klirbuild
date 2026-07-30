import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import type { DemoSession } from "@/lib/auth/demo-session";
import type { Role } from "@/types";

const requireCompanyContext = vi.fn();

vi.mock("@/lib/auth/require-company", () => ({
  requireCompanyContext: (...args: unknown[]) => requireCompanyContext(...args),
}));

import {
  forbiddenResponse,
  hasPermission,
  requirePermission,
} from "@/lib/auth/require-permission";

function session(role: Role, email: string): DemoSession {
  return {
    email,
    companyId: "co_1",
    role,
    exp: Date.now() + 60_000,
  };
}

describe("requirePermission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("propage le 401 de requireCompanyContext", async () => {
    const unauthorized = NextResponse.json({ error: "auth" }, { status: 401 });
    requireCompanyContext.mockResolvedValue(unauthorized);
    const result = await requirePermission("company:manage");
    expect(result).toBe(unauthorized);
  });

  it("refuse un employé sans company:manage", async () => {
    requireCompanyContext.mockResolvedValue({
      companyId: "co_1",
      session: session("FIELD_WORKER", "worker@example.com"),
    });
    const result = await requirePermission("company:manage");
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(403);
  });

  it("autorise COMPANY_ADMIN pour company:manage et settings:manage", async () => {
    const ctx = {
      companyId: "co_1",
      session: session("COMPANY_ADMIN", "admin@example.com"),
    };
    requireCompanyContext.mockResolvedValue(ctx);
    await expect(requirePermission("company:manage")).resolves.toEqual(ctx);
    await expect(requirePermission("settings:manage")).resolves.toEqual(ctx);
  });

  it("refuse SAFETY_OFFICER pour company:manage malgré settings:manage", async () => {
    const ctx = {
      companyId: "co_1",
      session: session("SAFETY_OFFICER", "safety@example.com"),
    };
    requireCompanyContext.mockResolvedValue(ctx);
    const result = await requirePermission("company:manage");
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(403);
    expect(hasPermission(ctx, "settings:manage")).toBe(true);
  });

  it("forbiddenResponse renvoie 403 JSON", async () => {
    const res = forbiddenResponse("Nope");
    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ error: "Nope" });
  });
});
