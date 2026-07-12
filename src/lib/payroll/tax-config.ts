/**
 * Configuration des retenues et charges employeur (QC/CA).
 * Taux modifiables par ouvrier ou par défaut entreprise.
 */

export type PayrollTaxLine = {
  code: string;
  label: string;
  rate?: number;
  fixed?: number;
  type: "deduction" | "employer";
};

export type PayrollTaxConfig = {
  cppEmployeeRate: number;
  cppEmployerRate: number;
  qppEmployeeRate: number;
  qppEmployerRate: number;
  eiEmployeeRate: number;
  eiEmployerMultiplier: number;
  federalTaxRate: number;
  quebecTaxRate: number;
  wsibRate?: number;
  cnesstRate?: number;
  extraDeductions: PayrollTaxLine[];
  extraEmployerCharges: PayrollTaxLine[];
};

export const DEFAULT_QC_TAX_CONFIG: PayrollTaxConfig = {
  cppEmployeeRate: 0.0595,
  cppEmployerRate: 0.0595,
  qppEmployeeRate: 0.064,
  qppEmployerRate: 0.064,
  eiEmployeeRate: 0.0166,
  eiEmployerMultiplier: 1.4,
  federalTaxRate: 0.15,
  quebecTaxRate: 0.14,
  wsibRate: 0.0125,
  cnesstRate: 0.0145,
  extraDeductions: [],
  extraEmployerCharges: [],
};

export const CONTRACT_TYPES = [
  { value: "full_time", label: "Temps plein" },
  { value: "part_time", label: "Temps partiel" },
  { value: "contract", label: "Contractuel" },
  { value: "seasonal", label: "Saisonnier" },
  { value: "apprentice", label: "Apprenti" },
] as const;

export type ContractType = (typeof CONTRACT_TYPES)[number]["value"];

export function maskSin(sin: string): string {
  const digits = sin.replace(/\D/g, "");
  if (digits.length < 3) return "***-***-***";
  const last = digits.slice(-3);
  return `***-***-${last}`;
}

export function mergeTaxConfig(
  companyDefaults?: Partial<PayrollTaxConfig> | null,
  employeeOverrides?: Partial<PayrollTaxConfig> | null
): PayrollTaxConfig {
  const base = { ...DEFAULT_QC_TAX_CONFIG, ...companyDefaults, ...employeeOverrides };
  return {
    ...DEFAULT_QC_TAX_CONFIG,
    ...base,
    extraDeductions: [
      ...(companyDefaults?.extraDeductions ?? []),
      ...(employeeOverrides?.extraDeductions ?? []),
    ],
    extraEmployerCharges: [
      ...(companyDefaults?.extraEmployerCharges ?? []),
      ...(employeeOverrides?.extraEmployerCharges ?? []),
    ],
  };
}

export function parseTaxConfig(raw: unknown): PayrollTaxConfig | null {
  if (!raw || typeof raw !== "object") return null;
  return mergeTaxConfig(raw as Partial<PayrollTaxConfig>);
}

export function taxConfigFields(): {
  key: keyof PayrollTaxConfig;
  label: string;
  hint: string;
  step: number;
}[] {
  return [
    { key: "cppEmployeeRate", label: "RPC employé", hint: "Ex: 0.0595 = 5.95%", step: 0.0001 },
    { key: "cppEmployerRate", label: "RPC employeur", hint: "Charge patronale RPC", step: 0.0001 },
    { key: "qppEmployeeRate", label: "RRQ employé", hint: "Régime Québec", step: 0.0001 },
    { key: "qppEmployerRate", label: "RRQ employeur", hint: "Charge patronale RRQ", step: 0.0001 },
    { key: "eiEmployeeRate", label: "AE employé", hint: "Assurance-emploi", step: 0.0001 },
    { key: "eiEmployerMultiplier", label: "Multiplicateur AE employeur", hint: "Ex: 1.4", step: 0.01 },
    { key: "federalTaxRate", label: "Impôt fédéral", hint: "Retenue à la source", step: 0.01 },
    { key: "quebecTaxRate", label: "Impôt Québec", hint: "Retenue provinciale", step: 0.01 },
    { key: "wsibRate", label: "CNESST / SST", hint: "Santé-sécurité travail", step: 0.0001 },
    { key: "cnesstRate", label: "FSS employeur", hint: "Fonds services sociaux", step: 0.0001 },
  ];
}
