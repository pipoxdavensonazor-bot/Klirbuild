import type { SocialAccount, SocialAdCampaign, T4Slip } from "@/lib/reports/types";
import { employees, payslips } from "@/lib/workforce/mock-data";
import { generatePayslip, round2 } from "@/lib/workforce/payroll";
import { demoCompany } from "@/lib/mock-data";

export const socialAccounts: SocialAccount[] = [
  {
    id: "sa_meta",
    platform: "meta",
    accountName: "Klirline Construction",
    handle: "@klirline.construction",
    status: "connected",
    adAccountId: "act_104882910",
    currency: "CAD",
    connectedAt: "2026-03-12",
    followers: 4280,
  },
  {
    id: "sa_ig",
    platform: "instagram",
    accountName: "Klirline Construction",
    handle: "@klirline.construction",
    status: "connected",
    adAccountId: "act_104882910",
    currency: "CAD",
    connectedAt: "2026-03-12",
    followers: 6120,
  },
  {
    id: "sa_fb",
    platform: "facebook",
    accountName: "Klirline Construction Inc.",
    handle: "facebook.com/klirline",
    status: "connected",
    adAccountId: "act_104882910",
    currency: "CAD",
    connectedAt: "2026-03-12",
    followers: 2890,
  },
  {
    id: "sa_google",
    platform: "google",
    accountName: "Klirline Ads — CA",
    handle: "customer: 812-440-2291",
    status: "connected",
    adAccountId: "812-440-2291",
    currency: "CAD",
    connectedAt: "2026-02-01",
  },
  {
    id: "sa_li",
    platform: "linkedin",
    accountName: "Klirline Inc.",
    handle: "linkedin.com/company/klirline",
    status: "needs_reauth",
    currency: "CAD",
    connectedAt: "2025-11-20",
    followers: 940,
  },
  {
    id: "sa_tt",
    platform: "tiktok",
    accountName: "Klirline Jobs",
    handle: "@klirlinejobs",
    status: "disconnected",
    currency: "CAD",
  },
];

export const socialAdCampaigns: SocialAdCampaign[] = [
  {
    id: "ad_1",
    name: "Rénovation condo — leads été",
    platform: "meta",
    accountId: "sa_meta",
    objective: "leads",
    status: "active",
    dailyBudget: 75,
    spend: 1840,
    impressions: 128400,
    clicks: 3120,
    leads: 46,
    startDate: "2026-06-01",
  },
  {
    id: "ad_2",
    name: "Search — entrepreneur général Montréal",
    platform: "google",
    accountId: "sa_google",
    objective: "conversions",
    status: "active",
    dailyBudget: 90,
    spend: 2460,
    impressions: 42100,
    clicks: 1880,
    leads: 38,
    startDate: "2026-05-15",
  },
  {
    id: "ad_3",
    name: "Reels avant/après chantier",
    platform: "instagram",
    accountId: "sa_ig",
    objective: "awareness",
    status: "paused",
    dailyBudget: 40,
    spend: 620,
    impressions: 210000,
    clicks: 5400,
    leads: 12,
    startDate: "2026-04-01",
    endDate: "2026-06-30",
  },
  {
    id: "ad_4",
    name: "Recrutement manœuvres CCQ",
    platform: "facebook",
    accountId: "sa_fb",
    objective: "traffic",
    status: "draft",
    dailyBudget: 35,
    spend: 0,
    impressions: 0,
    clicks: 0,
    leads: 0,
    startDate: "2026-07-15",
  },
];

/** Annualize demo payslips into T4-style boxes (illustrative CRA T4). */
export function buildT4Slips(taxYear: number): T4Slip[] {
  const fieldStaff = employees.filter((e) =>
    ["EMPLOYEE", "MANAGER"].includes(e.role)
  );

  return fieldStaff.map((emp) => {
    // Prefer summing existing payslips; else synthesize a year from rates
    const empSlips = payslips.filter(
      (p) => p.employeeId === emp.id && p.status === "paid"
    );
    let employmentIncome = empSlips.reduce((s, p) => s + p.grossPay, 0);
    let cpp = 0;
    let ei = 0;
    let qpp = 0;
    let incomeTax = 0;

    if (employmentIncome < 1000) {
      // ~48 weeks × 40h illustrative year
      const year = generatePayslip({
        employeeId: emp.id,
        employeeName: emp.name,
        hourlyRate: emp.hourlyRate,
        overtimeRate: emp.overtimeRate,
        regularHours: 40 * 48,
        overtimeHours: 40,
        periodStart: `${taxYear}-01-01`,
        periodEnd: `${taxYear}-12-31`,
      });
      employmentIncome = year.grossPay;
      cpp = year.cpp;
      ei = year.ei;
      qpp = year.qpp;
      incomeTax = year.federalTax + year.quebecTax;
    } else {
      // Scale paid period slips to a full year approximation for demo
      const factor = 26 / Math.max(empSlips.length, 1);
      employmentIncome = round2(employmentIncome * factor);
      const sample = generatePayslip({
        employeeId: emp.id,
        employeeName: emp.name,
        hourlyRate: emp.hourlyRate,
        overtimeRate: emp.overtimeRate,
        regularHours: 40,
        overtimeHours: 2,
        periodStart: `${taxYear}-01-01`,
        periodEnd: `${taxYear}-12-31`,
      });
      const ratio = employmentIncome / Math.max(sample.grossPay, 1);
      cpp = round2(sample.cpp * ratio);
      ei = round2(sample.ei * ratio);
      qpp = round2(sample.qpp * ratio);
      incomeTax = round2((sample.federalTax + sample.quebecTax) * ratio);
    }

    return {
      id: `t4_${taxYear}_${emp.id}`,
      taxYear,
      employeeId: emp.id,
      employeeName: emp.name,
      sinMasked: emp.sinMasked,
      employerName: demoCompany.name,
      employerBn: "784562193RP0001",
      province: "QC",
      status: "generated" as const,
      generatedAt: `${taxYear + 1}-02-15T10:00:00`,
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
    };
  });
}

export const t4TaxYears = [2025, 2024, 2023];
