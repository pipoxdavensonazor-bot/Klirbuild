import { NextResponse } from "next/server";
import { enrichSession, requireSession } from "@/lib/auth/auth-service";
import { getEmployeeDossier } from "@/lib/payroll/employee-service";
import { canApp } from "@/lib/workforce/types";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  const enriched = await enrichSession(session);
  const { id } = await ctx.params;

  if (!canApp(enriched.role, "payroll:read") && !canApp(enriched.role, "accounting:read")) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const includeSin =
    canApp(enriched.role, "payroll:manage") || canApp(enriched.role, "accounting:manage");

  const employee = await getEmployeeDossier(enriched.companyId, id, includeSin);
  if (!employee) {
    return NextResponse.json({ error: "Employé introuvable." }, { status: 404 });
  }
  return NextResponse.json({ employee });
}
