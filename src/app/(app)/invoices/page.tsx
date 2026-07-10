import { PageHeader, StatCard } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { invoices } from "@/lib/mock-data";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function InvoicesPage() {
  const overdue = invoices.filter((i) => i.status === "overdue").length;
  const pending = invoices.filter((i) =>
    ["pending", "sent"].includes(i.status)
  ).length;
  const paid = invoices.filter((i) => i.status === "paid").length;

  return (
    <div>
      <PageHeader
        title="Invoices"
        description="Billing status, PDF stubs, and payment readiness."
        actions={<Button>New invoice</Button>}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Paid" value={String(paid)} />
        <StatCard label="Open" value={String(pending)} />
        <StatCard label="Overdue" value={String(overdue)} hint="Needs collection" />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted-foreground dark:bg-slate-900/50">
            <tr>
              <th className="px-4 py-3">Invoice</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Due</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{invoice.number}</td>
                <td className="px-4 py-3">{invoice.clientName}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={invoice.status} />
                </td>
                <td className="px-4 py-3">
                  {formatCurrency(invoice.total, invoice.currency)}
                </td>
                <td className="px-4 py-3">{formatDate(invoice.dueDate)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline">
                      PDF
                    </Button>
                    <Button size="sm" variant="outline">
                      Send
                    </Button>
                    {invoice.status !== "paid" ? (
                      <Button size="sm">Pay</Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
