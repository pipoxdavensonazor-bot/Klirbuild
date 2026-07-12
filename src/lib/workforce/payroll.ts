/**
 * Quebec / Canada payroll & sales tax helpers (MVP approximations).
 * Not legal advice — replace with certified payroll engine for production.
 */

import type { PayrollTaxConfig } from "@/lib/payroll/tax-config";
import { DEFAULT_QC_TAX_CONFIG, mergeTaxConfig } from "@/lib/payroll/tax-config";

export type HoursBreakdown = {
  regularHours: number;
  overtimeHours: number;
};

export type PayrollInput = {
  employeeName: string;
  employeeId: string;
  hourlyRate: number;
  overtimeRate: number;
  regularHours: number;
  overtimeHours: number;
  periodStart: string;
  periodEnd: string;
  taxConfig?: Partial<PayrollTaxConfig>;
};

export type PayrollResult = {
  grossPay: number;
  cpp: number;
  ei: number;
  federalTax: number;
  quebecTax: number;
  qpp: number;
  netPay: number;
  employerCpp: number;
  employerEi: number;
  employerQpp: number;
  lines: {
    code: string;
    label: string;
    amount: number;
    type: "earning" | "deduction" | "employer";
  }[];
};

/** Standard QC sales taxes */
export const SALES_TAX = {
  TPS: 0.05, // GST federal
  TVQ: 0.09975, // Quebec
} as const;

export function calcSalesTaxes(subtotal: number) {
  const tps = round2(subtotal * SALES_TAX.TPS);
  const tvq = round2(subtotal * SALES_TAX.TVQ);
  return {
    subtotal: round2(subtotal),
    tps,
    tvq,
    total: round2(subtotal + tps + tvq),
  };
}

export function hoursFromClock(
  clockInAt: string,
  clockOutAt: string,
  breakMinutes = 0,
  totalPauseMs = 0
): number {
  const ms = new Date(clockOutAt).getTime() - new Date(clockInAt).getTime();
  const pauseHours = totalPauseMs / 3_600_000;
  const hours = Math.max(0, ms / 3_600_000 - breakMinutes / 60 - pauseHours);
  return round2(hours);
}

/** Split daily hours: first 8 regular, rest overtime (MVP rule) */
export function splitRegularOvertime(totalHours: number): HoursBreakdown {
  const regularHours = round2(Math.min(totalHours, 8));
  const overtimeHours = round2(Math.max(0, totalHours - 8));
  return { regularHours, overtimeHours };
}

/**
 * Haversine distance in meters between two GPS points.
 */
export function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)));
}

export function isWithinGeofence(
  employee: { lat: number; lng: number },
  site: { lat: number; lng: number; radiusM: number }
) {
  const d = distanceMeters(employee, site);
  return { within: d <= site.radiusM, distanceM: d };
}

/** Simplified CA/QC payroll deductions — taux modifiables via taxConfig */
export function generatePayslip(input: PayrollInput): PayrollResult {
  const regularPay = round2(input.regularHours * input.hourlyRate);
  const overtimePay = round2(input.overtimeHours * input.overtimeRate);
  const grossPay = round2(regularPay + overtimePay);

  const tax = mergeTaxConfig(input.taxConfig);

  const cpp = round2(grossPay * tax.cppEmployeeRate);
  const qpp = round2(grossPay * tax.qppEmployeeRate);
  const ei = round2(grossPay * tax.eiEmployeeRate);
  const federalTax = round2(grossPay * tax.federalTaxRate);
  const quebecTax = round2(grossPay * tax.quebecTaxRate);

  const employerCpp = round2(grossPay * tax.cppEmployerRate);
  const employerQpp = round2(grossPay * tax.qppEmployerRate);
  const employerEi = round2(ei * tax.eiEmployerMultiplier);
  const wsib = tax.wsibRate ? round2(grossPay * tax.wsibRate) : 0;
  const cnesst = tax.cnesstRate ? round2(grossPay * tax.cnesstRate) : 0;

  let extraDeductions = 0;
  let extraEmployer = 0;
  const extraLines: PayrollResult["lines"] = [];

  for (const line of tax.extraDeductions) {
    const amt = line.fixed ?? round2(grossPay * (line.rate ?? 0));
    extraDeductions += amt;
    extraLines.push({
      code: line.code,
      label: line.label,
      amount: -amt,
      type: "deduction",
    });
  }
  for (const line of tax.extraEmployerCharges) {
    const amt = line.fixed ?? round2(grossPay * (line.rate ?? 0));
    extraEmployer += amt;
    extraLines.push({
      code: line.code,
      label: line.label,
      amount: amt,
      type: "employer",
    });
  }

  const deductions = cpp + qpp + ei + federalTax + quebecTax + extraDeductions;
  const netPay = round2(Math.max(0, grossPay - deductions));

  const lines: PayrollResult["lines"] = [
    { code: "REG", label: `Régulier (${input.regularHours}h)`, amount: regularPay, type: "earning" },
    ...(overtimePay > 0
      ? [
          {
            code: "OT",
            label: `Temps supp. (${input.overtimeHours}h)`,
            amount: overtimePay,
            type: "earning" as const,
          },
        ]
      : []),
    { code: "CPP", label: "RPC (employé)", amount: -cpp, type: "deduction" },
    { code: "QPP", label: "RRQ (employé)", amount: -qpp, type: "deduction" },
    { code: "EI", label: "AE (employé)", amount: -ei, type: "deduction" },
    { code: "FED", label: "Impôt fédéral", amount: -federalTax, type: "deduction" },
    { code: "QC", label: "Impôt Québec", amount: -quebecTax, type: "deduction" },
    ...extraLines.filter((l) => l.type === "deduction"),
    { code: "E-CPP", label: "RPC employeur", amount: employerCpp, type: "employer" },
    { code: "E-QPP", label: "RRQ employeur", amount: employerQpp, type: "employer" },
    { code: "E-EI", label: "AE employeur", amount: employerEi, type: "employer" },
    ...(wsib > 0
      ? [{ code: "E-WSIB", label: "CNESST / SST", amount: wsib, type: "employer" as const }]
      : []),
    ...(cnesst > 0
      ? [{ code: "E-FSS", label: "FSS employeur", amount: cnesst, type: "employer" as const }]
      : []),
    ...extraLines.filter((l) => l.type === "employer"),
  ];

  return {
    grossPay,
    cpp,
    ei,
    federalTax,
    quebecTax,
    qpp,
    netPay,
    employerCpp,
    employerEi,
    employerQpp,
    lines,
  };
}

export { DEFAULT_QC_TAX_CONFIG };

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function formatMoney(n: number, currency = "CAD") {
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency,
  }).format(n);
}
