import { NextResponse } from "next/server";
import { enrichSession, requireSession } from "@/lib/auth/auth-service";
import {
  getCompanyPayrollTaxDefaults,
  listEmployeeDossiers,
  updateCompanyPayrollTaxDefaults,
  upsertEmployeeDossier,
} from "@/lib/payroll/employee-service";
import { canApp } from "@/lib/workforce/types";
import type { Role } from "@/types";
import type { ContractType } from "@/lib/payroll/tax-config";

export const runtime = "nodejs";

export async function GET() {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  const enriched = await enrichSession(session);

  if (!canApp(enriched.role, "payroll:read") && !canApp(enriched.role, "accounting:read")) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const includeSin =
    canApp(enriched.role, "payroll:manage") || canApp(enriched.role, "accounting:manage");

  const [employees, payrollDefaults] = await Promise.all([
    listEmployeeDossiers(enriched.companyId, includeSin),
    getCompanyPayrollTaxDefaults(enriched.companyId),
  ]);

  return NextResponse.json({ employees, payrollDefaults });
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  const enriched = await enrichSession(session);

  const body = await request.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "upsert";

  if (action === "company_taxes") {
    if (!canApp(enriched.role, "payroll:manage")) {
      return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    }
    const result = await updateCompanyPayrollTaxDefaults(
      enriched.companyId,
      body.payrollDefaults ?? body.tax ?? {}
    );
    if ("error" in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  }

  if (!canApp(enriched.role, "payroll:manage") && !canApp(enriched.role, "accounting:manage")) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const result = await upsertEmployeeDossier(enriched.companyId, {
    id: typeof body.id === "string" ? body.id : undefined,
    name: typeof body.name === "string" ? body.name : "",
    email: typeof body.email === "string" ? body.email : "",
    role: body.role as Role | undefined,
    jobTitle: typeof body.jobTitle === "string" ? body.jobTitle : undefined,
    hourlyRate: typeof body.hourlyRate === "number" ? body.hourlyRate : undefined,
    overtimeRate: typeof body.overtimeRate === "number" ? body.overtimeRate : undefined,
    phone: typeof body.phone === "string" ? body.phone : undefined,
    sinNumber: typeof body.sinNumber === "string" ? body.sinNumber : undefined,
    dateOfBirth: typeof body.dateOfBirth === "string" ? body.dateOfBirth : undefined,
    hireDate: typeof body.hireDate === "string" ? body.hireDate : undefined,
    contractType: body.contractType as ContractType | undefined,
    addressLine1: typeof body.addressLine1 === "string" ? body.addressLine1 : undefined,
    addressLine2: typeof body.addressLine2 === "string" ? body.addressLine2 : undefined,
    city: typeof body.city === "string" ? body.city : undefined,
    province: typeof body.province === "string" ? body.province : undefined,
    postalCode: typeof body.postalCode === "string" ? body.postalCode : undefined,
    country: typeof body.country === "string" ? body.country : undefined,
    emergencyName: typeof body.emergencyName === "string" ? body.emergencyName : undefined,
    emergencyPhone: typeof body.emergencyPhone === "string" ? body.emergencyPhone : undefined,
    notes: typeof body.notes === "string" ? body.notes : undefined,
    payrollTax: body.payrollTax,
  });

  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
