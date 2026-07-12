"use client";

import { useEffect, useMemo, useState } from "react";
import { RequirePermission } from "@/components/auth/require-permission";
import { RequirePlan } from "@/components/auth/require-plan";
import { PageHeader, StatCard } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiUrl } from "@/lib/api-client";
import { formatMoney } from "@/lib/markets/currency";
import { calcMarketTaxes, getMarket } from "@/lib/markets/regions";
import { PayrollWorkersPanel } from "@/components/payroll/employee-dossier-form";
import { useSessionStore } from "@/lib/workforce/session";
import { canApp } from "@/lib/workforce/types";
import { formatDate } from "@/lib/utils";

export default function AccountingPage() {
  return (
    <RequirePermission permission={["accounting:read", "accounting:manage"]}>
      <RequirePlan feature="accounting" title="Comptabilité — plan Growth+">
        <AccountingInner />
      </RequirePlan>
    </RequirePermission>
  );
}

function AccountingInner() {
  const role = useSessionStore((s) => s.role);
  const canManagePersonnel =
    canApp(role, "accounting:manage") || canApp(role, "payroll:manage");
  const marketRegion = useSessionStore((s) => s.marketRegion);
  const currency = useSessionStore((s) => s.currency);
  const market = getMarket(marketRegion);
  const [subtotal, setSubtotal] = useState("1000");
  const [ledgerAccounts, setLedgerAccounts] = useState<
    { id: string; code: string; name: string; balance: number; type: string }[]
  >([]);
  const [journalEntries, setJournalEntries] = useState<
    {
      id: string;
      date: string;
      memo: string;
      reference: string;
      debitAccount: string;
      creditAccount: string;
      amount: number;
      taxCode?: string;
      taxAmount?: number;
    }[]
  >([]);

  useEffect(() => {
    void fetch(apiUrl("/api/accounting"), { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.accounts?.length) setLedgerAccounts(d.accounts);
        if (d.entries?.length) setJournalEntries(d.entries);
      });
  }, []);

  const taxPreview = useMemo(() => {
    const n = Number(subtotal) || 0;
    return calcMarketTaxes(n, marketRegion);
  }, [subtotal, marketRegion]);

  const revenue = ledgerAccounts.find((a) => a.code === "4000")?.balance ?? 0;
  const payrollExp = ledgerAccounts.find((a) => a.code === "5000")?.balance ?? 0;
  const taxPayable = ledgerAccounts.find((a) => a.code === "2100")?.balance ?? 0;
  const cash = ledgerAccounts.find((a) => a.code === "1000")?.balance ?? 0;

  return (
    <div>
      <PageHeader
        title="Comptabilité & taxes"
        description={`Grand livre + taxes ${market.label} (${currency}) — régime ${market.payrollRegime}.`}
        actions={<Button variant="outline">Exporter CSV</Button>}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Encaisse" value={formatMoney(cash, currency)} />
        <StatCard label="Revenus" value={formatMoney(revenue, currency)} />
        <StatCard label="Charges paie" value={formatMoney(payrollExp, currency)} />
        <StatCard
          label="Taxes à remettre"
          value={formatMoney(taxPayable, currency)}
          hint={market.taxLines.map((t) => t.code).join(" / ")}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle>Calculateur — {market.label}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block text-muted-foreground">
                Sous-total ({currency})
              </span>
              <Input
                type="number"
                value={subtotal}
                onChange={(e) => setSubtotal(e.target.value)}
              />
            </label>
            <div className="space-y-2 rounded-lg border border-border p-3 text-sm">
              <div className="flex justify-between">
                <span>Sous-total</span>
                <span>{formatMoney(Number(subtotal) || 0, currency)}</span>
              </div>
              {taxPreview.lines.map((line) => (
                <div key={line.code} className="flex justify-between">
                  <span>
                    {line.name} ({(line.rate * 100).toFixed(3).replace(/\.?0+$/, "")}%)
                  </span>
                  <span>{formatMoney(line.amount, currency)}</span>
                </div>
              ))}
              <div className="flex justify-between border-t border-border pt-2 font-semibold">
                <span>Total TTC</span>
                <span>{formatMoney(taxPreview.total, currency)}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Changez le marché dans Marchés pour basculer TPS/TVQ, sales tax US ou VAT caraïbe.
            </p>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Taux du marché actif + catalogue</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2">Code</th>
                  <th className="py-2">Nom</th>
                  <th className="py-2">Région</th>
                  <th className="py-2">Type</th>
                  <th className="py-2 text-right">Taux</th>
                </tr>
              </thead>
              <tbody>
                {market.taxLines.map((t) => (
                  <tr key={t.code} className="border-t border-border bg-brand-50/40 dark:bg-brand-900/20">
                    <td className="py-2 font-mono text-xs">{t.code}</td>
                    <td className="py-2 font-medium">{t.name}</td>
                    <td className="py-2">{market.id}</td>
                    <td className="py-2">sales (actif)</td>
                    <td className="py-2 text-right">{(t.rate * 100).toFixed(3)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Dossiers personnel (RH / paie)</CardTitle>
            <p className="text-sm text-muted-foreground">
              NAS, adresse, type de contrat, date de naissance et informations employeur requises
              pour la comptabilité et les déclarations (T4, CNESST).
            </p>
          </CardHeader>
          <CardContent>
            <PayrollWorkersPanel canEdit={canManagePersonnel} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Plan comptable</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2">Compte</th>
                  <th className="py-2">Type</th>
                  <th className="py-2 text-right">Solde</th>
                </tr>
              </thead>
              <tbody>
                {ledgerAccounts.map((a) => (
                  <tr key={a.id} className="border-t border-border">
                    <td className="py-2">
                      <span className="font-mono text-xs text-muted-foreground">{a.code}</span>{" "}
                      {a.name}
                    </td>
                    <td className="py-2 capitalize">{a.type}</td>
                    <td className="py-2 text-right font-medium">{formatMoney(a.balance, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Journal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {journalEntries.map((je) => (
              <div key={je.id} className="rounded-lg border border-border p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{je.memo}</p>
                  <span className="font-semibold">{formatMoney(je.amount, currency)}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDate(je.date)} · {je.reference}
                </p>
                <p className="mt-1 text-xs">
                  Dr {je.debitAccount} · Cr {je.creditAccount}
                </p>
                {je.taxAmount ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Taxe {je.taxCode}: {formatMoney(je.taxAmount)}
                  </p>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
