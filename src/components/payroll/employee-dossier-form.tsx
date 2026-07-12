"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PayrollTaxEditor } from "@/components/payroll/payroll-tax-editor";
import { apiUrl } from "@/lib/api-client";
import {
  CONTRACT_TYPES,
  DEFAULT_QC_TAX_CONFIG,
  type ContractType,
  type PayrollTaxConfig,
} from "@/lib/payroll/tax-config";
import type { EmployeeDossierDto } from "@/lib/payroll/employee-service";
import type { Role } from "@/types";

const ROLES: { value: Role; label: string }[] = [
  { value: "EMPLOYEE", label: "Employé" },
  { value: "FOREMAN", label: "Contremaître" },
  { value: "COMPANY_ADMIN", label: "Administrateur" },
];

type FormState = {
  id?: string;
  name: string;
  email: string;
  role: Role;
  jobTitle: string;
  hourlyRate: string;
  overtimeRate: string;
  phone: string;
  sinNumber: string;
  dateOfBirth: string;
  hireDate: string;
  contractType: ContractType;
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
};

function emptyForm(tax: PayrollTaxConfig): FormState {
  return {
    name: "",
    email: "",
    role: "EMPLOYEE",
    jobTitle: "",
    hourlyRate: "35",
    overtimeRate: "52.5",
    phone: "",
    sinNumber: "",
    dateOfBirth: "",
    hireDate: new Date().toISOString().slice(0, 10),
    contractType: "full_time",
    addressLine1: "",
    addressLine2: "",
    city: "",
    province: "QC",
    postalCode: "",
    country: "CA",
    emergencyName: "",
    emergencyPhone: "",
    notes: "",
    payrollTax: { ...tax },
  };
}

function fromEmployee(e: EmployeeDossierDto): FormState {
  return {
    id: e.id,
    name: e.name,
    email: e.email,
    role: e.role,
    jobTitle: e.jobTitle,
    hourlyRate: String(e.hourlyRate),
    overtimeRate: String(e.overtimeRate),
    phone: e.phone,
    sinNumber: e.sinNumber ?? "",
    dateOfBirth: e.dateOfBirth,
    hireDate: e.hireDate,
    contractType: e.contractType,
    addressLine1: e.addressLine1,
    addressLine2: e.addressLine2,
    city: e.city,
    province: e.province,
    postalCode: e.postalCode,
    country: e.country,
    emergencyName: e.emergencyName,
    emergencyPhone: e.emergencyPhone,
    notes: e.notes,
    payrollTax: { ...e.payrollTax },
  };
}

type Props = {
  employee?: EmployeeDossierDto | null;
  companyTaxDefaults?: PayrollTaxConfig;
  onSaved?: (employee: EmployeeDossierDto) => void;
  onCancel?: () => void;
  showTaxes?: boolean;
};

export function EmployeeDossierForm({
  employee,
  companyTaxDefaults = DEFAULT_QC_TAX_CONFIG,
  onSaved,
  onCancel,
  showTaxes = true,
}: Props) {
  const [form, setForm] = useState<FormState>(
    employee ? fromEmployee(employee) : emptyForm(companyTaxDefaults)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"identite" | "contrat" | "taxes">("identite");

  useEffect(() => {
    setForm(employee ? fromEmployee(employee) : emptyForm(companyTaxDefaults));
  }, [employee, companyTaxDefaults]);

  function patch<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(apiUrl("/api/employees"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: form.id,
          name: form.name,
          email: form.email,
          role: form.role,
          jobTitle: form.jobTitle,
          hourlyRate: Number(form.hourlyRate) || 0,
          overtimeRate: Number(form.overtimeRate) || 0,
          phone: form.phone,
          sinNumber: form.sinNumber || undefined,
          dateOfBirth: form.dateOfBirth || undefined,
          hireDate: form.hireDate || undefined,
          contractType: form.contractType,
          addressLine1: form.addressLine1,
          addressLine2: form.addressLine2,
          city: form.city,
          province: form.province,
          postalCode: form.postalCode,
          country: form.country,
          emergencyName: form.emergencyName,
          emergencyPhone: form.emergencyPhone,
          notes: form.notes,
          payrollTax: form.payrollTax,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Enregistrement échoué.");
        return;
      }
      if (data.employee) onSaved?.(data.employee);
    } catch {
      setError("Erreur réseau.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={tab === "identite" ? "default" : "outline"}
          onClick={() => setTab("identite")}
        >
          Identité & NAS
        </Button>
        <Button
          type="button"
          size="sm"
          variant={tab === "contrat" ? "default" : "outline"}
          onClick={() => setTab("contrat")}
        >
          Contrat & adresse
        </Button>
        {showTaxes ? (
          <Button
            type="button"
            size="sm"
            variant={tab === "taxes" ? "default" : "outline"}
            onClick={() => setTab("taxes")}
          >
            Taxes ouvrier
          </Button>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      ) : null}

      {tab === "identite" ? (
        <Card>
          <CardHeader>
            <CardTitle>Identité</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block text-muted-foreground">Nom complet</span>
              <Input value={form.name} onChange={(e) => patch("name", e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-muted-foreground">Courriel</span>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => patch("email", e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-muted-foreground">Téléphone</span>
              <Input value={form.phone} onChange={(e) => patch("phone", e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-muted-foreground">NAS (confidentiel)</span>
              <Input
                placeholder="123-456-789"
                value={form.sinNumber}
                onChange={(e) => patch("sinNumber", e.target.value)}
              />
              {employee?.sinMasked ? (
                <span className="mt-1 block text-xs text-muted-foreground">
                  Masqué : {employee.sinMasked}
                </span>
              ) : null}
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-muted-foreground">Date de naissance</span>
              <Input
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => patch("dateOfBirth", e.target.value)}
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block text-muted-foreground">Contact d&apos;urgence</span>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  placeholder="Nom"
                  value={form.emergencyName}
                  onChange={(e) => patch("emergencyName", e.target.value)}
                />
                <Input
                  placeholder="Téléphone"
                  value={form.emergencyPhone}
                  onChange={(e) => patch("emergencyPhone", e.target.value)}
                />
              </div>
            </label>
          </CardContent>
        </Card>
      ) : null}

      {tab === "contrat" ? (
        <Card>
          <CardHeader>
            <CardTitle>Contrat & rémunération</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-muted-foreground">Type de contrat</span>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.contractType}
                onChange={(e) => patch("contractType", e.target.value as ContractType)}
              >
                {CONTRACT_TYPES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-muted-foreground">Date d&apos;embauche</span>
              <Input
                type="date"
                value={form.hireDate}
                onChange={(e) => patch("hireDate", e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-muted-foreground">Rôle système</span>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.role}
                onChange={(e) => patch("role", e.target.value as Role)}
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-muted-foreground">Titre de poste</span>
              <Input
                value={form.jobTitle}
                onChange={(e) => patch("jobTitle", e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-muted-foreground">Taux horaire ($)</span>
              <Input
                type="number"
                value={form.hourlyRate}
                onChange={(e) => patch("hourlyRate", e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-muted-foreground">Taux temps supp. ($)</span>
              <Input
                type="number"
                value={form.overtimeRate}
                onChange={(e) => patch("overtimeRate", e.target.value)}
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block text-muted-foreground">Adresse ligne 1</span>
              <Input
                value={form.addressLine1}
                onChange={(e) => patch("addressLine1", e.target.value)}
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block text-muted-foreground">Adresse ligne 2</span>
              <Input
                value={form.addressLine2}
                onChange={(e) => patch("addressLine2", e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-muted-foreground">Ville</span>
              <Input value={form.city} onChange={(e) => patch("city", e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-muted-foreground">Province</span>
              <Input
                value={form.province}
                onChange={(e) => patch("province", e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-muted-foreground">Code postal</span>
              <Input
                value={form.postalCode}
                onChange={(e) => patch("postalCode", e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-muted-foreground">Pays</span>
              <Input value={form.country} onChange={(e) => patch("country", e.target.value)} />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block text-muted-foreground">Notes RH / comptabilité</span>
              <Textarea value={form.notes} onChange={(e) => patch("notes", e.target.value)} />
            </label>
          </CardContent>
        </Card>
      ) : null}

      {tab === "taxes" && showTaxes ? (
        <PayrollTaxEditor
          value={form.payrollTax}
          onChange={(payrollTax) => patch("payrollTax", payrollTax)}
          title="Taxes spécifiques à cet ouvrier"
          description="Remplace les taux par défaut entreprise pour ce dossier uniquement."
        />
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void save()} disabled={saving}>
          {saving ? "Enregistrement…" : employee ? "Mettre à jour le dossier" : "Créer l'employé"}
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Annuler
          </Button>
        ) : null}
      </div>
    </div>
  );
}

type ListProps = {
  canEdit?: boolean;
  compact?: boolean;
};

export function PayrollWorkersPanel({ canEdit = true, compact = false }: ListProps) {
  const [employees, setEmployees] = useState<EmployeeDossierDto[]>([]);
  const [payrollDefaults, setPayrollDefaults] = useState<PayrollTaxConfig>(DEFAULT_QC_TAX_CONFIG);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(apiUrl("/api/employees"), { credentials: "include" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Impossible de charger le personnel.");
        return;
      }
      setEmployees(data.employees ?? []);
      if (data.payrollDefaults) setPayrollDefaults(data.payrollDefaults);
      if (!selectedId && data.employees?.[0]) setSelectedId(data.employees[0].id);
    } catch {
      setError("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const selected = employees.find((e) => e.id === selectedId) ?? null;

  function handleSaved(emp: EmployeeDossierDto) {
    setEmployees((list) => {
      const idx = list.findIndex((e) => e.id === emp.id);
      if (idx >= 0) {
        const next = [...list];
        next[idx] = emp;
        return next;
      }
      return [...list, emp].sort((a, b) => a.name.localeCompare(b.name));
    });
    setSelectedId(emp.id);
    setCreating(false);
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Chargement du personnel…</p>;
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <div className={`grid gap-4 ${compact ? "" : "lg:grid-cols-5"}`}>
        <Card className={compact ? "" : "lg:col-span-2"}>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle>Personnel ({employees.length})</CardTitle>
            {canEdit ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setCreating(true);
                  setSelectedId(null);
                }}
              >
                Ajouter
              </Button>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-2">
            {employees.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun employé enregistré.</p>
            ) : (
              employees.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => {
                    setCreating(false);
                    setSelectedId(e.id);
                  }}
                  className={`w-full rounded-lg border p-3 text-left text-sm transition ${
                    selectedId === e.id && !creating
                      ? "border-brand-400 bg-brand-50/60 dark:bg-brand-900/20"
                      : "border-border hover:bg-slate-50 dark:hover:bg-slate-900"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{e.name}</span>
                    <Badge
                      className={
                        e.dossierComplete
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }
                    >
                      {e.dossierComplete ? "Complet" : "Incomplet"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {e.contractLabel} · {e.jobTitle || "—"}
                  </p>
                  {!e.dossierComplete && e.dossierMissing.length > 0 ? (
                    <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                      Manque : {e.dossierMissing.join(", ")}
                    </p>
                  ) : null}
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {canEdit && (creating || selected) ? (
          <div className={compact ? "" : "lg:col-span-3"}>
            <EmployeeDossierForm
              employee={creating ? null : selected}
              companyTaxDefaults={payrollDefaults}
              onSaved={handleSaved}
              onCancel={
                creating
                  ? () => setCreating(false)
                  : () => setSelectedId(employees[0]?.id ?? null)
              }
            />
          </div>
        ) : selected ? (
          <Card className={compact ? "" : "lg:col-span-3"}>
            <CardHeader>
              <CardTitle>{selected.name}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <p className="text-muted-foreground">NAS</p>
                <p className="font-medium">{selected.sinMasked || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Naissance</p>
                <p className="font-medium">{selected.dateOfBirth || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Contrat</p>
                <p className="font-medium">{selected.contractLabel}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Embauche</p>
                <p className="font-medium">{selected.hireDate || "—"}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-muted-foreground">Adresse</p>
                <p className="font-medium">
                  {[selected.addressLine1, selected.city, selected.province, selected.postalCode]
                    .filter(Boolean)
                    .join(", ") || "—"}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
