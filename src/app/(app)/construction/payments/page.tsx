import Link from "next/link";
import { PageHeader, StatCard } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { progressInvoices } from "@/modules/construction-os/mock-data";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function ConstructionPaymentsPage() {
  const open = progressInvoices.filter((i) => i.status !== "paid");
  const holdback = open.reduce((s, i) => s + i.holdback, 0);
  const netDue = open.reduce((s, i) => s + i.netDue, 0);

  return (
    <div>
      <PageHeader
        title="Paiements chantier"
        description="Facturation progressive, retenues de garantie (holdback) et encaissement."
        actions={
          <>
            <Link href="/payments">
              <Button variant="outline">Stripe / abonnements</Button>
            </Link>
            <Button>Nouvelle facture d&apos;avancement</Button>
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Factures ouvertes" value={String(open.length)} />
        <StatCard label="Net à recevoir" value={formatCurrency(netDue)} />
        <StatCard
          label="Retenues (holdback)"
          value={formatCurrency(holdback)}
          hint="Typiquement 10 % au Québec / Canada"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Factures d&apos;avancement</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-2">Facture</th>
                <th className="py-2">Chantier</th>
                <th className="py-2">Période</th>
                <th className="py-2">Montant</th>
                <th className="py-2">Retenue</th>
                <th className="py-2">Net</th>
                <th className="py-2">Statut</th>
                <th className="py-2">Échéance</th>
              </tr>
            </thead>
            <tbody>
              {progressInvoices.map((inv) => (
                <tr key={inv.id} className="border-t border-border">
                  <td className="py-2 font-medium">{inv.number}</td>
                  <td className="py-2">{inv.jobName}</td>
                  <td className="py-2">
                    {inv.periodLabel}
                    <p className="text-xs text-muted-foreground">
                      {inv.completionPct}% complété
                    </p>
                  </td>
                  <td className="py-2">{formatCurrency(inv.amount)}</td>
                  <td className="py-2">{formatCurrency(inv.holdback)}</td>
                  <td className="py-2 font-semibold">
                    {formatCurrency(inv.netDue)}
                  </td>
                  <td className="py-2">
                    <StatusBadge status={inv.status} />
                  </td>
                  <td className="py-2">{formatDate(inv.dueDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="mt-4 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
        Paiement client via Stripe Checkout / Interac (à brancher) · Lien avec
        comptabilité TPS/TVQ Core · Libération de retenue en fin de chantier.
      </div>
    </div>
  );
}
