import { hasDatabase } from "@/lib/auth/auth-service";
import { prisma } from "@/lib/db";
import type { T4Slip } from "@/lib/reports/types";
import { round2 } from "@/lib/workforce/payroll";

function dec(v: { toNumber(): number } | number) {
  return typeof v === "number" ? v : v.toNumber();
}

function lineAmount(
  lines: { code: string; amount: number }[] | null | undefined,
  code: string
) {
  return Math.abs(lines?.find((l) => l.code === code)?.amount ?? 0);
}

export function availableT4TaxYears() {
  const y = new Date().getFullYear();
  return [y, y - 1, y - 2];
}

export async function buildT4SlipsForCompany(
  companyId: string,
  taxYear: number
): Promise<T4Slip[]> {
  if (!hasDatabase()) return [];

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { name: true, marketRegion: true, employerBn: true },
  });
  if (!company) return [];

  const yearStart = new Date(`${taxYear}-01-01T00:00:00.000Z`);
  const yearEnd = new Date(`${taxYear}-12-31T23:59:59.999Z`);
  const employerBn = company.employerBn?.trim() || "";

  const employees = await prisma.employeeProfile.findMany({
    where: {
      companyId,
      status: "active",
      role: { in: ["EMPLOYEE", "MANAGER"] },
    },
    orderBy: { name: "asc" },
  });

  const slips: T4Slip[] = [];

  for (const emp of employees) {
    const payslipRows = await prisma.payslip.findMany({
      where: {
        companyId,
        employeeId: emp.id,
        status: { in: ["approved", "paid"] },
        periodStart: { gte: yearStart },
        periodEnd: { lte: yearEnd },
      },
    });

    // Pas de données inventées — seuls les bulletins approuvés/payés comptent.
    if (payslipRows.length === 0) continue;

    let employmentIncome = payslipRows.reduce((s, p) => s + dec(p.grossPay), 0);
    let cpp = 0;
    let ei = 0;
    let qpp = 0;
    let incomeTax = 0;

    for (const row of payslipRows) {
      const lines = Array.isArray(row.linesJson)
        ? (row.linesJson as { code: string; amount: number }[])
        : [];
      cpp += lineAmount(lines, "CPP");
      qpp += lineAmount(lines, "QPP");
      ei += lineAmount(lines, "EI");
      incomeTax += lineAmount(lines, "FED") + lineAmount(lines, "QC");
    }

    cpp = round2(cpp);
    ei = round2(ei);
    qpp = round2(qpp);
    incomeTax = round2(incomeTax);
    employmentIncome = round2(employmentIncome);

    const province =
      company.marketRegion?.startsWith("CA-QC") || !company.marketRegion
        ? "QC"
        : company.marketRegion.startsWith("CA-ON")
          ? "ON"
          : company.marketRegion.startsWith("CA-AB")
            ? "AB"
            : "BC";

    slips.push({
      id: `t4_${taxYear}_${emp.id}`,
      taxYear,
      employeeId: emp.id,
      employeeName: emp.name,
      sinMasked: emp.sinMasked ?? "***-***-***",
      employerName: company.name,
      employerBn: employerBn || "BN_MANQUANT",
      province,
      status: employerBn ? "generated" : "draft",
      generatedAt: new Date().toISOString(),
      boxes: [
        { code: "14", label: "Employment income", amount: employmentIncome },
        { code: "16", label: "Employee's CPP contributions", amount: cpp },
        { code: "17", label: "Employee's QPP contributions", amount: qpp },
        { code: "18", label: "Employee's EI premiums", amount: ei },
        { code: "22", label: "Income tax deducted", amount: incomeTax },
        { code: "24", label: "EI insurable earnings", amount: employmentIncome },
        { code: "26", label: "CPP/QPP pensionable earnings", amount: employmentIncome },
        { code: "55", label: "Province of employment", amount: 0 },
      ],
    });
  }

  return slips;
}
