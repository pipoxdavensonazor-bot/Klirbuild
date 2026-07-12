import { hasDatabase } from "@/lib/auth/auth-service";
import { prisma } from "@/lib/db";
import {
  CONTRACT_TYPES,
  maskSin,
  mergeTaxConfig,
  parseTaxConfig,
  type ContractType,
  type PayrollTaxConfig,
} from "@/lib/payroll/tax-config";
import type { Role } from "@/types";

function dec(v: { toNumber(): number } | number) {
  return typeof v === "number" ? v : v.toNumber();
}

export type EmployeeDossierDto = {
  id: string;
  name: string;
  email: string;
  role: Role;
  jobTitle: string;
  hourlyRate: number;
  overtimeRate: number;
  status: string;
  phone: string;
  sinNumber?: string;
  sinMasked: string;
  dateOfBirth: string;
  hireDate: string;
  contractType: ContractType;
  contractLabel: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  emergencyName: string;
  emergencyPhone: string;
  notes: string;
  payrollTax: PayrollTaxConfig;
  dossierComplete: boolean;
  dossierMissing: string[];
};

function contractLabel(value: string) {
  return CONTRACT_TYPES.find((c) => c.value === value)?.label ?? value;
}

function computeDossierComplete(row: {
  name: string;
  email: string;
  sinNumber: string | null;
  sinMasked: string | null;
  dateOfBirth: Date | null;
  hireDate: Date | null;
  contractType: string;
  addressLine1: string | null;
  city: string | null;
  postalCode: string | null;
  province: string | null;
}): { complete: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!row.name?.trim()) missing.push("Nom");
  if (!row.email?.trim()) missing.push("Courriel");
  if (!row.sinNumber?.trim() && !row.sinMasked?.trim()) missing.push("NAS");
  if (!row.dateOfBirth) missing.push("Date de naissance");
  if (!row.hireDate) missing.push("Date d'embauche");
  if (!row.contractType) missing.push("Type de contrat");
  if (!row.addressLine1?.trim()) missing.push("Adresse");
  if (!row.city?.trim()) missing.push("Ville");
  if (!row.province?.trim()) missing.push("Province");
  if (!row.postalCode?.trim()) missing.push("Code postal");
  return { complete: missing.length === 0, missing };
}

function mapEmployee(
  row: {
    id: string;
    name: string;
    email: string;
    role: Role;
    jobTitle: string | null;
    hourlyRate: { toNumber(): number } | number;
    overtimeRate: { toNumber(): number } | number;
    status: string;
    phone: string | null;
    sinNumber: string | null;
    sinMasked: string | null;
    dateOfBirth: Date | null;
    hireDate: Date | null;
    contractType: string;
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    province: string | null;
    postalCode: string | null;
    country: string | null;
    emergencyName: string | null;
    emergencyPhone: string | null;
    notes: string | null;
    payrollTaxJson: unknown;
    dossierComplete: boolean;
  },
  companyTax?: Partial<PayrollTaxConfig> | null,
  includeSin = false
): EmployeeDossierDto {
  const dossier = computeDossierComplete(row);
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    jobTitle: row.jobTitle ?? "",
    hourlyRate: dec(row.hourlyRate),
    overtimeRate: dec(row.overtimeRate),
    status: row.status,
    phone: row.phone ?? "",
    sinNumber: includeSin ? row.sinNumber ?? undefined : undefined,
    sinMasked: row.sinMasked ?? (row.sinNumber ? maskSin(row.sinNumber) : ""),
    dateOfBirth: row.dateOfBirth?.toISOString().slice(0, 10) ?? "",
    hireDate: row.hireDate?.toISOString().slice(0, 10) ?? "",
    contractType: (row.contractType as ContractType) || "full_time",
    contractLabel: contractLabel(row.contractType),
    addressLine1: row.addressLine1 ?? "",
    addressLine2: row.addressLine2 ?? "",
    city: row.city ?? "",
    province: row.province ?? "QC",
    postalCode: row.postalCode ?? "",
    country: row.country ?? "CA",
    emergencyName: row.emergencyName ?? "",
    emergencyPhone: row.emergencyPhone ?? "",
    notes: row.notes ?? "",
    payrollTax: mergeTaxConfig(companyTax, parseTaxConfig(row.payrollTaxJson)),
    dossierComplete: row.dossierComplete || dossier.complete,
    dossierMissing: dossier.missing,
  };
}

async function getCompanyTaxDefaults(companyId: string) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { payrollDefaultsJson: true },
  });
  return parseTaxConfig(company?.payrollDefaultsJson) ?? undefined;
}

export async function listEmployeeDossiers(companyId: string, includeSin = false) {
  if (!hasDatabase()) return [];
  const companyTax = await getCompanyTaxDefaults(companyId);
  const rows = await prisma.employeeProfile.findMany({
    where: { companyId, status: { not: "terminated" } },
    orderBy: { name: "asc" },
  });
  return rows.map((r) => mapEmployee(r, companyTax, includeSin));
}

export async function getEmployeeDossier(
  companyId: string,
  id: string,
  includeSin = false
) {
  if (!hasDatabase()) return null;
  const companyTax = await getCompanyTaxDefaults(companyId);
  const row = await prisma.employeeProfile.findFirst({
    where: { id, companyId },
  });
  return row ? mapEmployee(row, companyTax, includeSin) : null;
}

export async function getEmployeeTaxConfig(companyId: string, employeeId: string) {
  const companyTax = await getCompanyTaxDefaults(companyId);
  const row = await prisma.employeeProfile.findFirst({
    where: { id: employeeId, companyId },
    select: { payrollTaxJson: true },
  });
  return mergeTaxConfig(companyTax, parseTaxConfig(row?.payrollTaxJson));
}

export async function upsertEmployeeDossier(
  companyId: string,
  input: {
    id?: string;
    name: string;
    email: string;
    role?: Role;
    jobTitle?: string;
    hourlyRate?: number;
    overtimeRate?: number;
    phone?: string;
    sinNumber?: string;
    dateOfBirth?: string;
    hireDate?: string;
    contractType?: ContractType;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    country?: string;
    emergencyName?: string;
    emergencyPhone?: string;
    notes?: string;
    payrollTax?: Partial<PayrollTaxConfig>;
  }
) {
  if (!hasDatabase()) return { error: "DATABASE_URL requis." as const };
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  if (!name || !email) return { error: "Nom et courriel requis." as const };

  const sinMasked = input.sinNumber ? maskSin(input.sinNumber) : undefined;

  type DossierData = {
    name: string;
    email: string;
    role: Role;
    jobTitle: string | null;
    hourlyRate: number;
    overtimeRate: number;
    phone: string | null;
    dateOfBirth: Date | null;
    hireDate: Date | null;
    contractType: string;
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    province: string | null;
    postalCode: string | null;
    country: string | null;
    emergencyName: string | null;
    emergencyPhone: string | null;
    notes: string | null;
    sinNumber?: string | null;
    sinMasked?: string | null;
    payrollTaxJson?: Partial<PayrollTaxConfig>;
  };

  const dossierFields: DossierData = {
    name,
    email,
    role: input.role ?? "EMPLOYEE",
    jobTitle: input.jobTitle?.trim() || null,
    hourlyRate: input.hourlyRate ?? 35,
    overtimeRate: input.overtimeRate ?? (input.hourlyRate ?? 35) * 1.5,
    phone: input.phone?.trim() || null,
    dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
    hireDate: input.hireDate ? new Date(input.hireDate) : null,
    contractType: input.contractType ?? "full_time",
    addressLine1: input.addressLine1?.trim() || null,
    addressLine2: input.addressLine2?.trim() || null,
    city: input.city?.trim() || null,
    province: input.province?.trim() || "QC",
    postalCode: input.postalCode?.trim() || null,
    country: input.country?.trim() || "CA",
    emergencyName: input.emergencyName?.trim() || null,
    emergencyPhone: input.emergencyPhone?.trim() || null,
    notes: input.notes?.trim() || null,
    ...(input.payrollTax ? { payrollTaxJson: input.payrollTax } : {}),
  };

  if (input.sinNumber !== undefined) {
    dossierFields.sinNumber = input.sinNumber.replace(/\s/g, "") || null;
    dossierFields.sinMasked = sinMasked ?? null;
  }

  const dossierCheck = computeDossierComplete({
    name,
    email,
    sinNumber: dossierFields.sinNumber ?? null,
    sinMasked: dossierFields.sinMasked ?? null,
    dateOfBirth: dossierFields.dateOfBirth,
    hireDate: dossierFields.hireDate,
    contractType: dossierFields.contractType,
    addressLine1: dossierFields.addressLine1,
    city: dossierFields.city,
    postalCode: dossierFields.postalCode,
    province: dossierFields.province,
  });

  if (input.id) {
    const existing = await prisma.employeeProfile.findFirst({
      where: { id: input.id, companyId },
    });
    if (!existing) return { error: "Employé introuvable." as const };

    const checkRow = {
      name,
      email,
      sinNumber: dossierFields.sinNumber ?? existing.sinNumber,
      sinMasked: dossierFields.sinMasked ?? existing.sinMasked,
      dateOfBirth: dossierFields.dateOfBirth ?? existing.dateOfBirth,
      hireDate: dossierFields.hireDate ?? existing.hireDate,
      contractType: dossierFields.contractType ?? existing.contractType,
      addressLine1: dossierFields.addressLine1 ?? existing.addressLine1,
      city: dossierFields.city ?? existing.city,
      postalCode: dossierFields.postalCode ?? existing.postalCode,
      province: dossierFields.province ?? existing.province,
    };
    const finalCheck = computeDossierComplete(checkRow);

    const updateData = { ...dossierFields, dossierComplete: finalCheck.complete };
    if (input.sinNumber === undefined) {
      delete updateData.sinNumber;
      delete updateData.sinMasked;
    }

    const row = await prisma.employeeProfile.update({
      where: { id: input.id },
      data: updateData,
    });
    const companyTax = await getCompanyTaxDefaults(companyId);
    return { employee: mapEmployee(row, companyTax, true) };
  }

  const row = await prisma.employeeProfile.create({
    data: {
      companyId,
      ...dossierFields,
      sinNumber: dossierFields.sinNumber ?? null,
      sinMasked: dossierFields.sinMasked ?? null,
      dossierComplete: dossierCheck.complete,
    },
  });
  const companyTax = await getCompanyTaxDefaults(companyId);
  return { employee: mapEmployee(row, companyTax, true) };
}

export async function updateCompanyPayrollTaxDefaults(
  companyId: string,
  tax: Partial<PayrollTaxConfig>
) {
  if (!hasDatabase()) return { error: "DATABASE_URL requis." as const };
  const merged = mergeTaxConfig(null, tax);
  await prisma.company.update({
    where: { id: companyId },
    data: { payrollDefaultsJson: merged },
  });
  return { payrollDefaults: merged };
}

export async function getCompanyPayrollTaxDefaults(companyId: string) {
  return mergeTaxConfig(await getCompanyTaxDefaults(companyId));
}
