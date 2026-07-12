import { hasDatabase } from "@/lib/auth/auth-service";
import { prisma } from "@/lib/db";
import { payslips as mockPayslips, employees } from "@/lib/workforce/mock-data";

function dec(v: { toNumber(): number } | number) {
  return typeof v === "number" ? v : v.toNumber();
}

export type PayslipDto = {
  id: string;
  employeeId: string;
  employeeName: string;
  periodStart: string;
  periodEnd: string;
  grossPay: number;
  netPay: number;
  status: string;
};

export async function listPayslips(companyId: string): Promise<PayslipDto[]> {
  if (hasDatabase()) {
    const rows = await prisma.payslip.findMany({
      where: { companyId },
      include: { employee: { select: { name: true } } },
      orderBy: { periodStart: "desc" },
      take: 100,
    });
    return rows.map((r) => ({
      id: r.id,
      employeeId: r.employeeId,
      employeeName: r.employee.name,
      periodStart: r.periodStart.toISOString().slice(0, 10),
      periodEnd: r.periodEnd.toISOString().slice(0, 10),
      grossPay: dec(r.grossPay),
      netPay: dec(r.netPay),
      status: r.status,
    }));
  }
  return mockPayslips.map((p) => {
    const emp = employees.find((e) => e.id === p.employeeId);
    return {
      id: p.id,
      employeeId: p.employeeId,
      employeeName: emp?.name ?? "—",
      periodStart: p.periodStart,
      periodEnd: p.periodEnd,
      grossPay: p.grossPay,
      netPay: p.netPay,
      status: p.status,
    };
  });
}

export async function listPayrollEmployees(companyId: string) {
  if (hasDatabase()) {
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
  return employees.map((e) => ({
    id: e.id,
    name: e.name,
    email: e.email,
    hourlyRate: e.hourlyRate,
    jobTitle: e.jobTitle,
  }));
}
