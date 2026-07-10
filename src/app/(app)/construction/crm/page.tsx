import { PageHeader, StatCard } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { constructionLeads } from "@/modules/construction-os/mock-data";
import { formatCurrency } from "@/lib/utils";

const stages = ["new", "qualified", "estimate", "negotiation", "won", "lost"] as const;

export default function ConstructionCrmPage() {
  const pipeline = constructionLeads
    .filter((l) => !["won", "lost"].includes(l.stage))
    .reduce((s, l) => s + l.valueEstimate, 0);

  return (
    <div>
      <PageHeader
        title="CRM Construction"
        description="Leads, appels d'offres et pipeline de soumissions pour PME canadiennes."
        actions={<Button>Nouveau lead</Button>}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Leads ouverts" value={String(constructionLeads.filter((l) => !["won", "lost"].includes(l.stage)).length)} />
        <StatCard label="Pipeline" value={formatCurrency(pipeline)} />
        <StatCard label="Sources" value="Ads · SEO · Références" />
      </div>

      <div className="mb-6 flex gap-3 overflow-x-auto pb-2">
        {stages.map((stage) => (
          <Card key={stage} className="min-w-[200px] flex-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm capitalize">{stage}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {constructionLeads
                .filter((l) => l.stage === stage)
                .map((lead) => (
                  <div
                    key={lead.id}
                    className="rounded-lg border border-border bg-slate-50/70 p-3 dark:bg-slate-900/40"
                  >
                    <p className="text-sm font-medium">{lead.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {lead.city} · {lead.projectType}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm font-semibold">
                        {formatCurrency(lead.valueEstimate)}
                      </span>
                      <StatusBadge status={lead.source.toLowerCase().replace(" ", "_")} />
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste leads</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-2">Projet</th>
                <th className="py-2">Source</th>
                <th className="py-2">Étape</th>
                <th className="py-2">Valeur</th>
                <th className="py-2">Owner</th>
              </tr>
            </thead>
            <tbody>
              {constructionLeads.map((lead) => (
                <tr key={lead.id} className="border-t border-border">
                  <td className="py-2">
                    <p className="font-medium">{lead.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {lead.projectType} · {lead.city}
                    </p>
                  </td>
                  <td className="py-2">{lead.source}</td>
                  <td className="py-2">
                    <StatusBadge status={lead.stage} />
                  </td>
                  <td className="py-2">{formatCurrency(lead.valueEstimate)}</td>
                  <td className="py-2">{lead.owner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
