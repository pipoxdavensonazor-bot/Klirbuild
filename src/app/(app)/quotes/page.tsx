import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { quotes } from "@/lib/mock-data";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function QuotesPage() {
  return (
    <div>
      <PageHeader
        title="Quotes"
        description="Create, approve, and convert quotes to invoices."
        actions={<Button>New quote</Button>}
      />
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted-foreground dark:bg-slate-900/50">
            <tr>
              <th className="px-4 py-3">Number</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Valid until</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((quote) => (
              <tr key={quote.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{quote.number}</td>
                <td className="px-4 py-3">{quote.clientName}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={quote.status} />
                </td>
                <td className="px-4 py-3">
                  {formatCurrency(quote.total, quote.currency)}
                </td>
                <td className="px-4 py-3">{formatDate(quote.validUntil)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline">
                      PDF
                    </Button>
                    {quote.status === "approved" ? (
                      <Button size="sm">Convert</Button>
                    ) : (
                      <Button size="sm" variant="secondary">
                        Approve
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        PDF generation and email send are stubbed for MVP · Convert creates an invoice draft.
      </p>
      <div className="mt-4">
        <Link href="/invoices" className="text-sm text-brand-600 hover:underline">
          View invoices →
        </Link>
      </div>
    </div>
  );
}
