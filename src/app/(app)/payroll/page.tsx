"use client";

import { useEffect, useMemo, useState } from "react";
import { RequirePermission } from "@/components/auth/require-permission";
import { RequirePlan } from "@/components/auth/require-plan";
import { PageHeader, StatCard } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { apiUrl } from "@/lib/api-client";
import { formatMoney } from "@/lib/workforce/payroll";
import { useSessionStore } from "@/lib/workforce/session";
import { canApp } from "@/lib/workforce/types";
import type { Payslip } from "@/lib/workforce/types";
import { formatDate } from "@/lib/utils";

type PayslipRow = Payslip & { employeeName: string };

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
  const [payslips, setPayslips] = useState<PayslipRow[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await fetch(apiUrl("/api/payroll"), { credentials: "include" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Impossible de charger la paie.");
      return;
    }
    const rows: PayslipRow[] = (data.payslips ?? []).map(
      (p: PayslipRow & { lines?: Payslip["lines"] }) => ({
        id: p.id,
        employeeId: p.employeeId,
        employeeName: p.employeeName,
        periodStart: p.periodStart,
        periodEnd: p.periodEnd,
        regularHours: p.regularHours ?? 0,
        overtimeHours: p.overtimeHours ?? 0,
        grossPay: p.grossPay,
        netPay: p.netPay,
        lines: p.lines ?? [],
        status: p.status as Payslip["status"],
        generatedAt: p.generatedAt ?? new Date().toISOString(),
      })
    );
    setPayslips(rows);
    if (rows[0] && !selectedId) setSelectedId(rows[0].id);
  }

  useEffect(() => {
    void load();
  }, []);

  const visible = useMemo(() => {
    if (canManage) return payslips;
    if (!employeeId) return [];
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

  async function autoGenerateFromHours() {
    if (!canManage) return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const periodEnd = new Date().toISOString().slice(0, 10);
      const periodStart = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
      const res = await fetch(apiUrl("/api/payroll"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", periodStart, periodEnd }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Génération échouée.");
        return;
      }
      await load();
      if (data.payslips?.[0]?.id) setSelectedId(data.payslips[0].id);
      setMessage(
        `${data.count ?? 0} bulletin(s) généré(s) depuis les heures pointées en base.`
      );
    } catch {
      setError("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  }

  async function approveAllDrafts() {
    if (!canManage) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(apiUrl("/api/payroll"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve_drafts" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Approbation échouée.");
        return;
      }
      await load();
      setMessage(`${data.updated ?? 0} bulletin(s) approuvé(s).`);
    } catch {
      setError("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Paie automatique"
        description="Heures pointées → salaires, retenues et bulletins (base de données)."
        actions={
          canManage ? (
            <>
              <Button variant="outline" onClick={approveAllDrafts} disabled={loading}>
                Approuver brouillons
              </Button>
              <Button onClick={autoGenerateFromHours} disabled={loading}>
                Générer depuis pointages
              </Button>
            </>
          ) : undefined
        }
      />

      {message ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
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
            {visible.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun bulletin. Pointez des heures puis générez la paie.
              </p>
            ) : (
              visible.map((p) => (
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
              ))
            )}
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
