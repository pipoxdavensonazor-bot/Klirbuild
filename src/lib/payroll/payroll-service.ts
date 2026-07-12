import { hasDatabase } from "@/lib/auth/auth-service";
import { prisma } from "@/lib/db";
import { generatePayslip, splitRegularOvertime } from "@/lib/workforce/payroll";
import { getEmployeeTaxConfig } from "@/lib/payroll/employee-service";
import { DATABASE_REQUIRED_MESSAGE } from "@/lib/api/database-guard";

function dec(v: { toNumber(): number } | number) {
  return typeof v === "number" ? v : v.toNumber();
}

export type PayslipDto = {
  id: string;
  employeeId: string;
  employeeName: string;
  periodStart: string;
  periodEnd: string;
  regularHours: number;
  overtimeHours: number;
  grossPay: number;
  netPay: number;
  status: string;
  lines: {
    code: string;
    label: string;
    amount: number;
    type: "earning" | "deduction" | "employer";
  }[];
};

function mapPayslip(row: {
  id: string;
  employeeId: string;
  employee: { name: string };
  periodStart: Date;
  periodEnd: Date;
  regularHours: { toNumber(): number } | number;
  overtimeHours: { toNumber(): number } | number;
  grossPay: { toNumber(): number } | number;
  netPay: { toNumber(): number } | number;
  linesJson: unknown;
  status: string;
}): PayslipDto {
  const lines = Array.isArray(row.linesJson)
    ? (row.linesJson as PayslipDto["lines"])
    : [];
  return {
    id: row.id,
    employeeId: row.employeeId,
    employeeName: row.employee.name,
    periodStart: row.periodStart.toISOString().slice(0, 10),
    periodEnd: row.periodEnd.toISOString().slice(0, 10),
    regularHours: dec(row.regularHours),
    overtimeHours: dec(row.overtimeHours),
    grossPay: dec(row.grossPay),
    netPay: dec(row.netPay),
    status: row.status,
    lines,
  };
}

export async function listPayslips(companyId: string): Promise<PayslipDto[]> {
  if (!hasDatabase()) return [];
  const rows = await prisma.payslip.findMany({
      where: { companyId },
      include: { employee: { select: { name: true } } },
      orderBy: { periodStart: "desc" },
      take: 100,
    });
    return rows.map(mapPayslip);
}

export async function listPayrollEmployees(companyId: string) {
  if (!hasDatabase()) return [];
  const rows = await prisma.employeeProfile.findMany({
      where: { companyId, status: "active" },
      orderBy: { name: "asc" },
    });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      hourlyRate: dec(r.hourlyRate),
    jobTitle: r.jobTitle ?? "",
  }));
}

function aggregateHours(
  entries: {
    employeeId: string;
    employee: { name: string; hourlyRate: { toNumber(): number }; overtimeRate: { toNumber(): number }; role: string };
    hoursWorked: { toNumber(): number } | null;
  }[]
) {
  const map = new Map<
    string,
    {
      employeeId: string;
      employeeName: string;
      hourlyRate: number;
      overtimeRate: number;
      role: string;
      hours: number;
    }
  >();

  for (const e of entries) {
    const hours = e.hoursWorked ? dec(e.hoursWorked) : 0;
    if (hours <= 0) continue;
    const prev = map.get(e.employeeId);
    if (prev) {
      prev.hours += hours;
    } else {
      map.set(e.employeeId, {
        employeeId: e.employeeId,
        employeeName: e.employee.name,
        hourlyRate: dec(e.employee.hourlyRate),
        overtimeRate: dec(e.employee.overtimeRate) || dec(e.employee.hourlyRate) * 1.5,
        role: e.employee.role,
        hours,
      });
    }
  }

  return Array.from(map.values()).map((row) => ({
    ...row,
    ...splitRegularOvertime(row.hours),
  }));
}

export async function generatePayslipsFromTimeEntries(
  companyId: string,
  periodStart: string,
  periodEnd: string
) {
  if (!hasDatabase()) {
    return { error: DATABASE_REQUIRED_MESSAGE as const };
  }

  const start = new Date(periodStart);
  const end = new Date(`${periodEnd}T23:59:59.999Z`);

  const entries = await prisma.timeEntry.findMany({
    where: {
      companyId,
      clockOutAt: { not: null },
      hoursWorked: { not: null },
      clockInAt: { gte: start, lte: end },
      status: { in: ["approved", "clocked_out", "pending_review"] },
    },
    include: {
      employee: {
        select: { name: true, hourlyRate: true, overtimeRate: true, role: true },
      },
    },
  });

  const aggregated = aggregateHours(entries).filter((r) => r.role !== "COMPANY_ADMIN");
  if (!aggregated.length) {
    return { error: "Aucune heure approuvée pour cette période." as const };
  }

  const created: PayslipDto[] = [];
  for (const row of aggregated) {
    const taxConfig = await getEmployeeTaxConfig(companyId, row.employeeId);
    const calc = generatePayslip({
      employeeId: row.employeeId,
      employeeName: row.employeeName,
      hourlyRate: row.hourlyRate,
      overtimeRate: row.overtimeRate,
      regularHours: row.regularHours,
      overtimeHours: row.overtimeHours,
      periodStart,
      periodEnd,
      taxConfig,
    });

    const saved = await prisma.payslip.create({
      data: {
        companyId,
        employeeId: row.employeeId,
        periodStart: start,
        periodEnd: end,
        regularHours: row.regularHours,
        overtimeHours: row.overtimeHours,
        grossPay: calc.grossPay,
        netPay: calc.netPay,
        linesJson: calc.lines,
        status: "draft",
      },
      include: { employee: { select: { name: true } } },
    });
    created.push(mapPayslip(saved));
  }

  return { payslips: created, count: created.length };
}

export async function approveDraftPayslips(companyId: string) {
  if (!hasDatabase()) {
    return { error: "DATABASE_URL requis." as const };
  }
  const result = await prisma.payslip.updateMany({
    where: { companyId, status: "draft" },
    data: { status: "approved" },
  });
  const payslips = await listPayslips(companyId);
  return { updated: result.count, payslips };
}
