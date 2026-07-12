"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, FileText, Printer } from "lucide-react";
import { RequirePermission } from "@/components/auth/require-permission";
import { RequirePlan } from "@/components/auth/require-plan";
import { PageHeader, StatCard } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { apiUrl } from "@/lib/api-client";
import type { T4Slip } from "@/lib/reports/types";
import { formatMoney } from "@/lib/workforce/payroll";
import { canApp } from "@/lib/workforce/types";
import { useSessionStore } from "@/lib/workforce/session";
import { formatDate } from "@/lib/utils";

export default function T4ReportsPage() {
  return (
    <RequirePermission permission={["payroll:manage", "accounting:manage", "payroll:read"]}>
      <RequirePlan feature="t4" title="Rapports T4 — plan Growth+">
        <T4ReportsInner />
      </RequirePlan>
    </RequirePermission>
  );
}

function T4ReportsInner() {
  const role = useSessionStore((s) => s.role);
  const employeeId = useSessionStore((s) => s.employeeId);
  const canManage =
    canApp(role, "payroll:manage") || canApp(role, "accounting:manage");

  const [taxYear, setTaxYear] = useState(new Date().getFullYear());
  const [taxYears, setTaxYears] = useState<number[]>([
    new Date().getFullYear(),
    new Date().getFullYear() - 1,
    new Date().getFullYear() - 2,
  ]);
  const [slips, setSlips] = useState<T4Slip[]>([]);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function load(year: number) {
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/reports/t4?taxYear=${year}`), {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Erreur chargement T4.");
        return;
      }
      setSlips(data.slips ?? []);
      if (data.taxYears?.length) setTaxYears(data.taxYears);
      if (data.slips?.[0]?.id) setSelectedId(data.slips[0].id);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(taxYear);
  }, [taxYear]);

  const visible = useMemo(() => {
    if (canManage) return slips;
    if (!employeeId) return [];
    return slips.filter((s) => s.employeeId === employeeId);
  }, [slips, canManage, employeeId]);

  const selected = visible.find((s) => s.id === selectedId) ?? visible[0];

  const totals = useMemo(() => {
    const income = visible.reduce(
      (s, slip) => s + (slip.boxes.find((b) => b.code === "14")?.amount ?? 0),
      0
    );
    const tax = visible.reduce(
      (s, slip) => s + (slip.boxes.find((b) => b.code === "22")?.amount ?? 0),
      0
    );
    return { income, tax, count: visible.length };
  }, [visible]);

  function regenerate() {
    if (!canManage) return;
    void load(taxYear).then(() => {
      setMessage(
        `${visible.length} feuillet(s) T4 chargé(s) pour ${taxYear} depuis la paie en base.`
      );
    });
  }

  function changeYear(year: number) {
    setTaxYear(year);
    setMessage(`Période fiscale ${year}.`);
  }

  function printSlip() {
    document.body.classList.add("printing-target");
    window.addEventListener(
      "afterprint",
      () => document.body.classList.remove("printing-target"),
      { once: true }
    );
    window.print();
  }

  function exportCsv() {
    if (!visible.length) return;
    const header = [
      "tax_year",
      "employee",
      "sin",
      "box_14",
      "box_16",
      "box_17",
      "box_18",
      "box_22",
      "status",
    ];
    const rows = visible.map((s) => {
      const get = (code: string) =>
        s.boxes.find((b) => b.code === code)?.amount ?? 0;
      return [
        s.taxYear,
        JSON.stringify(s.employeeName),
        s.sinMasked,
        get("14"),
        get("16"),
        get("17"),
        get("18"),
        get("22"),
        s.status,
      ].join(",");
    });
    const blob = new Blob([[header.join(","), ...rows].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `klirline-t4-${taxYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage(`Export CSV T4 ${taxYear} téléchargé.`);
  }

  return (
    <div>
      <PageHeader
        title="Rapports T4"
        description="Feuillets T4 par employé — données dérivées des bulletins de paie en base."
        actions={
          <>
            <select
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
              value={taxYear}
              onChange={(e) => changeYear(Number(e.target.value))}
            >
              {taxYears.map((y) => (
                <option key={y} value={y}>
                  Année {y}
                </option>
              ))}
            </select>
            <Button variant="outline" onClick={exportCsv}>
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            {canManage ? (
              <Button onClick={regenerate} disabled={loading}>
                <FileText className="h-4 w-4" />
                Actualiser depuis la paie
              </Button>
            ) : null}
          </>
        }
      />

      {message ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          {message}
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Feuillets" value={String(totals.count)} />
        <StatCard label="Revenus d'emploi (case 14)" value={formatMoney(totals.income)} />
        <StatCard label="Impôt retenu (case 22)" value={formatMoney(totals.tax)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Employés — {taxYear}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <p className="text-sm text-muted-foreground">Chargement…</p>
            ) : visible.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun employé ou bulletin approuvé pour cette année.
              </p>
            ) : (
              visible.map((slip) => (
                <button
                  key={slip.id}
                  onClick={() => setSelectedId(slip.id)}
                  className={`w-full rounded-lg border p-3 text-left text-sm transition ${
                    selected?.id === slip.id
                      ? "border-brand-400 bg-brand-50/60 dark:bg-brand-900/20"
                      : "border-border hover:bg-slate-50 dark:hover:bg-slate-900"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{slip.employeeName}</span>
                    <StatusBadge status={slip.status} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    NAS {slip.sinMasked} ·{" "}
                    {formatMoney(
                      slip.boxes.find((b) => b.code === "14")?.amount ?? 0
                    )}
                  </p>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>
              {selected
                ? `T4 — ${selected.employeeName} (${selected.taxYear})`
                : "Feuillet T4"}
            </CardTitle>
            {selected ? (
              <Button size="sm" variant="outline" onClick={printSlip}>
                <Printer className="h-3.5 w-3.5" />
                Imprimer
              </Button>
            ) : null}
          </CardHeader>
          <CardContent>
            {selected ? (
              <div className="space-y-4" id="t4-print" data-print-target>
                <div className="hidden print:block">
                  <h1 className="text-lg font-semibold">
                    Feuillet T4 — {selected.employeeName} ({selected.taxYear})
                  </h1>
                </div>
                <div className="grid gap-3 rounded-lg border border-border bg-slate-50/70 p-4 text-sm dark:bg-slate-900/40 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Employeur</p>
                    <p className="font-medium">{selected.employerName}</p>
                    <p className="font-mono text-xs">{selected.employerBn}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Employé</p>
                    <p className="font-medium">{selected.employeeName}</p>
                    <p className="text-xs">NAS {selected.sinMasked}</p>
                    <p className="text-xs">Province : {selected.province}</p>
                  </div>
                  {selected.generatedAt ? (
                    <p className="text-xs text-muted-foreground sm:col-span-2">
                      Généré le {formatDate(selected.generatedAt)}
                    </p>
                  ) : null}
                </div>

                <table className="min-w-full text-sm">
                  <thead className="text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="py-2">Case</th>
                      <th className="py-2">Description</th>
                      <th className="py-2 text-right">Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.boxes
                      .filter((b) => b.code !== "55")
                      .map((box) => (
                        <tr key={box.code} className="border-t border-border">
                          <td className="py-2 font-mono text-xs">{box.code}</td>
                          <td className="py-2">{box.label}</td>
                          <td className="py-2 text-right font-medium">
                            {formatMoney(box.amount)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>

                <p className="text-xs text-muted-foreground">
                  Aperçu T4 à des fins opérationnelles. Validez avec un professionnel
                  avant transmission à l&apos;ARC.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Aucun feuillet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
