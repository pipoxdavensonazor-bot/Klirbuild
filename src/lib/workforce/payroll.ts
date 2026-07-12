/**
 * Quebec / Canada payroll & sales tax helpers (MVP approximations).
 * Not legal advice — replace with certified payroll engine for production.
 */

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

/** Simplified CA/QC payroll deductions for demo */
export function generatePayslip(input: PayrollInput): PayrollResult {
  const regularPay = round2(input.regularHours * input.hourlyRate);
  const overtimePay = round2(input.overtimeHours * input.overtimeRate);
  const grossPay = round2(regularPay + overtimePay);

  // Approximate 2026-style rates (illustrative)
  const cpp = round2(grossPay * 0.0595); // employee CPP-ish
  const qpp = round2(grossPay * 0.064); // Quebec Pension (illustrative split)
  const ei = round2(grossPay * 0.0166);
  const federalTax = round2(grossPay * 0.15);
  const quebecTax = round2(grossPay * 0.14);

  const employerCpp = round2(cpp);
  const employerQpp = round2(qpp);
  const employerEi = round2(ei * 1.4);

  const deductions = cpp + qpp + ei + federalTax + quebecTax;
  const netPay = round2(Math.max(0, grossPay - deductions));

  const lines = [
    { code: "REG", label: `Regular (${input.regularHours}h)`, amount: regularPay, type: "earning" as const },
    ...(overtimePay > 0
      ? [
          {
            code: "OT",
            label: `Overtime (${input.overtimeHours}h)`,
            amount: overtimePay,
            type: "earning" as const,
          },
        ]
      : []),
    { code: "CPP", label: "CPP (employee)", amount: -cpp, type: "deduction" as const },
    { code: "QPP", label: "QPP (employee)", amount: -qpp, type: "deduction" as const },
    { code: "EI", label: "EI (employee)", amount: -ei, type: "deduction" as const },
    { code: "FED", label: "Federal income tax", amount: -federalTax, type: "deduction" as const },
    { code: "QC", label: "Quebec income tax", amount: -quebecTax, type: "deduction" as const },
    { code: "E-CPP", label: "Employer CPP", amount: employerCpp, type: "employer" as const },
    { code: "E-QPP", label: "Employer QPP", amount: employerQpp, type: "employer" as const },
    { code: "E-EI", label: "Employer EI", amount: employerEi, type: "employer" as const },
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

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function formatMoney(n: number, currency = "CAD") {
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency,
  }).format(n);
}
