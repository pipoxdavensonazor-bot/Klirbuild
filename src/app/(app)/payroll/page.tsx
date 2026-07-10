"use client";

import { useMemo, useState } from "react";
import { RequirePermission } from "@/components/auth/require-permission";
import { RequirePlan } from "@/components/auth/require-plan";
import { PageHeader, StatCard } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import {
  aggregateHoursByEmployee,
  employees,
  payslips as initialPayslips,
  timeEntries,
} from "@/lib/workforce/mock-data";
import { generatePayslip, formatMoney } from "@/lib/workforce/payroll";
import { useSessionStore } from "@/lib/workforce/session";
import { canApp } from "@/lib/workforce/types";
import type { Payslip } from "@/lib/workforce/types";
import { formatDate } from "@/lib/utils";

export default function PayrollPage() {
  return (
    <RequirePermission permission="payroll:read">
      <RequirePlan feature="payroll" title="Paie — plan Growth+">
        <PayrollInner />
      </RequirePlan>
    </RequirePermission>
  );
}

function PayrollInner() {
  const role = useSessionStore((s) => s.role);
  const employeeId = useSessionStore((s) => s.employeeId);
  const canManage = canApp(role, "payroll:manage");
  const [payslips, setPayslips] = useState<Payslip[]>(initialPayslips);
  const [selectedId, setSelectedId] = useState(payslips[0]?.id);
  const [message, setMessage] = useState("");

  const visible = useMemo(() => {
    if (canManage) return payslips;
    return payslips.filter((p) => p.employeeId === employeeId);
  }, [payslips, canManage, employeeId]);

  const selected = visible.find((p) => p.id === selectedId) ?? visible[0];

  const totals = useMemo(() => {
    const draft = visible.filter((p) => p.status === "draft");
    return {
      gross: draft.reduce((s, p) => s + p.grossPay, 0),
      net: draft.reduce((s, p) => s + p.netPay, 0),
      count: draft.length,
    };
  }, [visible]);

  function autoGenerateFromHours() {
    if (!canManage) return;
    const periodStart = "2026-07-07";
    const periodEnd = "2026-07-13";
    const aggregated = aggregateHoursByEmployee(
      timeEntries.filter((e) => e.status === "approved" || e.hoursWorked)
    );

    const generated: Payslip[] = [];
    for (const row of aggregated) {
      const emp = employees.find((e) => e.id === row.employeeId);
      if (!emp || emp.role === "COMPANY_ADMIN") continue;
      const calc = generatePayslip({
        employeeId: emp.id,
        employeeName: emp.name,
        hourlyRate: emp.hourlyRate,
        overtimeRate: emp.overtimeRate,
        regularHours: row.regularHours,
        overtimeHours: row.overtimeHours,
        periodStart,
        periodEnd,
      });
      generated.push({
        id: `pay_auto_${emp.id}_${Date.now()}`,
        employeeId: emp.id,
        employeeName: emp.name,
        periodStart,
        periodEnd,
        regularHours: row.regularHours,
        overtimeHours: row.overtimeHours,
        grossPay: calc.grossPay,
        netPay: calc.netPay,
        lines: calc.lines,
        status: "draft",
        generatedAt: new Date().toISOString(),
      });
    }

    // Also ensure current week drafts for field staff from demo hours
    if (generated.length === 0) {
      for (const emp of employees.filter((e) => e.role === "EMPLOYEE")) {
        const calc = generatePayslip({
          employeeId: emp.id,
          employeeName: emp.name,
          hourlyRate: emp.hourlyRate,
          overtimeRate: emp.overtimeRate,
          regularHours: 32,
          overtimeHours: 2,
          periodStart,
          periodEnd,
        });
        generated.push({
          id: `pay_auto_${emp.id}_${Date.now()}`,
          employeeId: emp.id,
          employeeName: emp.name,
          periodStart,
          periodEnd,
          regularHours: 32,
          overtimeHours: 2,
          grossPay: calc.grossPay,
          netPay: calc.netPay,
          lines: calc.lines,
          status: "draft",
          generatedAt: new Date().toISOString(),
        });
      }
    }

    setPayslips((prev) => [...generated, ...prev]);
    setSelectedId(generated[0]?.id);
    setMessage(
      `${generated.length} bulletins générés automatiquement à partir des heures pointées (CPP, QPP, EI, impôts).`
    );
  }

  function approveAllDrafts() {
    if (!canManage) return;
    setPayslips((prev) =>
      prev.map((p) => (p.status === "draft" ? { ...p, status: "approved" } : p))
    );
    setMessage("Bulletins brouillon approuvés — prêts pour virement / export comptable.");
  }

  return (
    <div>
      <PageHeader
        title="Paie automatique"
        description="Heures pointées → salaires, retenues et bulletins. Moins de travail pour la comptabilité."
        actions={
          canManage ? (
            <>
              <Button variant="outline" onClick={approveAllDrafts}>
                Approuver brouillons
              </Button>
              <Button onClick={autoGenerateFromHours}>Générer depuis pointages</Button>
            </>
          ) : undefined
        }
      />

      {message ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          {message}
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Bulletins (période)" value={String(totals.count)} />
        <StatCard label="Brut à payer" value={formatMoney(totals.gross)} />
        <StatCard label="Net à payer" value={formatMoney(totals.net)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Bulletins</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {visible.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={`w-full rounded-lg border p-3 text-left text-sm transition ${
                  selected?.id === p.id
                    ? "border-brand-400 bg-brand-50/60 dark:bg-brand-900/20"
                    : "border-border hover:bg-slate-50 dark:hover:bg-slate-900"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{p.employeeName}</span>
                  <StatusBadge status={p.status} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDate(p.periodStart)} → {formatDate(p.periodEnd)}
                </p>
                <p className="mt-1 text-sm">
                  {formatMoney(p.netPay)}{" "}
                  <span className="text-xs text-muted-foreground">net</span>
                </p>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>
              {selected
                ? `${selected.employeeName} · ${formatDate(selected.periodStart)}`
                : "Détail"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selected ? (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">Régulier</p>
                    <p className="text-lg font-semibold">{selected.regularHours}h</p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">Temps supp.</p>
                    <p className="text-lg font-semibold">{selected.overtimeHours}h</p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">Brut</p>
                    <p className="text-lg font-semibold">{formatMoney(selected.grossPay)}</p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">Net</p>
                    <p className="text-lg font-semibold">{formatMoney(selected.netPay)}</p>
                  </div>
                </div>

                <table className="min-w-full text-sm">
                  <thead className="text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="py-2">Code</th>
                      <th className="py-2">Description</th>
                      <th className="py-2 text-right">Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.lines.map((line) => (
                      <tr key={line.code + line.label} className="border-t border-border">
                        <td className="py-2 font-mono text-xs">{line.code}</td>
                        <td className="py-2">
                          {line.label}
                          <span className="ml-2 text-[10px] uppercase text-muted-foreground">
                            {line.type}
                          </span>
                        </td>
                        <td className="py-2 text-right font-medium">
                          {formatMoney(line.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Aucun bulletin</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
