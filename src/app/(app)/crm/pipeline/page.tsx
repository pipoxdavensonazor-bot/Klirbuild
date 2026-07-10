import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { deals } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/utils";

const stages = ["new", "qualified", "proposal", "negotiation", "won", "lost"] as const;

export default function PipelinePage() {
  return (
    <div>
      <PageHeader
        title="Sales pipeline"
        description="Kanban view of open and closed opportunities."
      />
      <div className="flex gap-4 overflow-x-auto pb-2">
        {stages.map((stage) => (
          <Card key={stage} className="min-w-[240px] flex-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm capitalize">{stage}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {deals
                .filter((d) => d.stage === stage)
                .map((deal) => (
                  <div
                    key={deal.id}
                    className="rounded-lg border border-border bg-slate-50/70 p-3 dark:bg-slate-900/40"
                  >
                    <p className="text-sm font-medium">{deal.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{deal.clientName}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-sm font-semibold">
                        {formatCurrency(deal.value)}
                      </span>
                      <StatusBadge status={deal.stage} />
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
