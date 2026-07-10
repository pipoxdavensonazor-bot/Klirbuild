import { PageHeader, StatCard } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { changeOrders } from "@/modules/construction-os/mock-data";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function ChangeOrdersPage() {
  const open = changeOrders.filter((c) =>
    ["draft", "submitted"].includes(c.status)
  );
  const approvedValue = changeOrders
    .filter((c) => c.status === "approved" || c.status === "invoiced")
    .reduce((s, c) => s + c.amount, 0);

  return (
    <div>
      <PageHeader
        title="Ordres de changement"
        description="Extras, conditions imprévues, approbation client — traçabilité complète."
        actions={<Button>Nouvel OC</Button>}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="OC ouverts" value={String(open.length)} />
        <StatCard label="Valeur approuvée" value={formatCurrency(approvedValue)} />
        <StatCard label="Total OC" value={String(changeOrders.length)} />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-muted-foreground dark:bg-slate-900/50">
            <tr>
              <th className="px-4 py-3">N°</th>
              <th className="px-4 py-3">Chantier</th>
              <th className="px-4 py-3">Titre</th>
              <th className="px-4 py-3">Montant</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">Dates</th>
            </tr>
          </thead>
          <tbody>
            {changeOrders.map((co) => (
              <tr key={co.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{co.number}</td>
                <td className="px-4 py-3">{co.jobName}</td>
                <td className="px-4 py-3">
                  <p>{co.title}</p>
                  <p className="text-xs text-muted-foreground">{co.reason}</p>
                </td>
                <td className="px-4 py-3">{formatCurrency(co.amount)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={co.status} />
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {co.submittedAt ? `Soumis ${formatDate(co.submittedAt)}` : "—"}
                  {co.approvedAt ? (
                    <>
                      <br />
                      Approuvé {formatDate(co.approvedAt)}
                    </>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
