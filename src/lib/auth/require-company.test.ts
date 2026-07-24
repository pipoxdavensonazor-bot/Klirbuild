import { NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/auth-service", () => ({
  requireSession: vi.fn(),
}));

import { requireSession } from "@/lib/auth/auth-service";
import { requireCompanyContext } from "@/lib/auth/require-company";
import { showPlanRoleSimulators } from "@/lib/demo/show-simulators";

describe("requireCompanyContext", () => {
  beforeEach(() => {
    vi.mocked(requireSession).mockReset();
  });

  it("retourne 401 quand requireSession échoue", async () => {
    const unauthorized = NextResponse.json({ error: "Connexion requise" }, { status: 401 });
    vi.mocked(requireSession).mockResolvedValue(unauthorized);
    const result = await requireCompanyContext();
    expect(result).toBe(unauthorized);
  });

  it("retourne companyId depuis la session enrichie", async () => {
    vi.mocked(requireSession).mockResolvedValue({
      email: "alex@klirline.demo",
      companyId: "co_demo",
      role: "COMPANY_ADMIN",
      exp: Date.now() / 1000 + 3600,
    });
    const result = await requireCompanyContext();
    expect(result).toEqual(
      expect.objectContaining({
        companyId: "co_demo",
        session: expect.objectContaining({ email: "alex@klirline.demo" }),
      })
    );
  });
});

describe("showPlanRoleSimulators", () => {
  const prev = process.env.NEXT_PUBLIC_ENABLE_SIMULATORS;

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_ENABLE_SIMULATORS;
  });

  afterEach(() => {
    if (prev === undefined) delete process.env.NEXT_PUBLIC_ENABLE_SIMULATORS;
    else process.env.NEXT_PUBLIC_ENABLE_SIMULATORS = prev;
  });

  it("masque hors comptes démo", () => {
    expect(showPlanRoleSimulators("owner@acme.com")).toBe(false);
    expect(showPlanRoleSimulators("")).toBe(false);
  });

  it("affiche pour @klirline.demo", () => {
    expect(showPlanRoleSimulators("alex@klirline.demo")).toBe(true);
  });

  it("affiche si flag public activé", () => {
    process.env.NEXT_PUBLIC_ENABLE_SIMULATORS = "true";
    expect(showPlanRoleSimulators("owner@acme.com")).toBe(true);
  });
});
