import Link from "next/link";
import { PageHeader, StatCard } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { deals, kpi, leads } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/utils";

const stages = ["new", "qualified", "proposal", "negotiation", "won", "lost"] as const;

export default function CrmPage() {
  return (
    <div>
      <PageHeader
        title="CRM"
        description="Leads, pipeline, and customer growth."
        actions={
          <>
            <Link href="/clients">
              <Button variant="outline">View clients</Button>
            </Link>
            <Link href="/crm/pipeline">
              <Button>Open pipeline</Button>
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Pipeline value" value={formatCurrency(kpi.pipeline)} />
        <StatCard label="Open leads" value={String(leads.length)} />
        <StatCard label="Won deals" value={String(deals.filter((d) => d.stage === "won").length)} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Leads</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {leads.map((lead) => (
              <div
                key={lead.id}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div>
                  <p className="text-sm font-medium">{lead.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {lead.source} · Score {lead.score}
                  </p>
                </div>
                <StatusBadge status={lead.status} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pipeline snapshot</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {stages.map((stage) => {
              const count = deals.filter((d) => d.stage === stage).length;
              return (
                <div key={stage} className="rounded-lg border border-border p-3">
                  <p className="text-xs capitalize text-muted-foreground">{stage}</p>
                  <p className="mt-1 text-xl font-semibold">{count}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
