import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { clients } from "@/lib/mock-data";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function ClientsPage() {
  return (
    <div>
      <PageHeader
        title="Clients"
        description="Customer directory with search-ready table layout."
        actions={<Button>New client</Button>}
      />

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted-foreground dark:bg-slate-900/50">
              <tr>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Industry</th>
                <th className="px-4 py-3 font-medium">Owner</th>
                <th className="px-4 py-3 font-medium">LTV</th>
                <th className="px-4 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id} className="border-t border-border hover:bg-slate-50/70 dark:hover:bg-slate-900/30">
                  <td className="px-4 py-3">
                    <Link href={`/clients/${client.id}`} className="font-medium text-brand-600 hover:underline">
                      {client.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{client.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={client.status} />
                  </td>
                  <td className="px-4 py-3">{client.industry}</td>
                  <td className="px-4 py-3">{client.owner}</td>
                  <td className="px-4 py-3">{formatCurrency(client.lifetimeValue)}</td>
                  <td className="px-4 py-3">{formatDate(client.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
