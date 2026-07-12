import { NextResponse } from "next/server";
import { enrichSession, requireSession } from "@/lib/auth/auth-service";
import {
  approveDraftPayslips,
  generatePayslipsFromTimeEntries,
  listPayrollEmployees,
  listPayslips,
} from "@/lib/payroll/payroll-service";
import { canApp } from "@/lib/workforce/types";

export const runtime = "nodejs";

export async function GET() {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  const enriched = await enrichSession(session);

  if (!canApp(enriched.role, "payroll:read")) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const [payslips, employees] = await Promise.all([
    listPayslips(enriched.companyId),
    listPayrollEmployees(enriched.companyId),
  ]);
  return NextResponse.json({ payslips, employees });
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  const enriched = await enrichSession(session);

  if (!canApp(enriched.role, "payroll:manage")) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "";

  if (action === "generate") {
    const periodStart =
      typeof body.periodStart === "string"
        ? body.periodStart
        : new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    const periodEnd =
      typeof body.periodEnd === "string"
        ? body.periodEnd
        : new Date().toISOString().slice(0, 10);

    const result = await generatePayslipsFromTimeEntries(
      enriched.companyId,
      periodStart,
      periodEnd
    );
    if ("error" in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  }

  if (action === "approve_drafts") {
    const result = await approveDraftPayslips(enriched.companyId);
    if ("error" in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: "Action invalide." }, { status: 400 });
}
