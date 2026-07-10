import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { constructionEstimates } from "@/modules/construction-os/mock-data";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function EstimatesPage() {
  return (
    <div>
      <PageHeader
        title="Estimés & soumissions"
        description="Lignes main-d'œuvre, matériaux, sous-traitance + taxes canadiennes (TPS/TVQ)."
        actions={<Button>Nouvel estimé</Button>}
      />

      <div className="space-y-4">
        {constructionEstimates.map((est) => (
          <Card key={est.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
              <div>
                <CardTitle className="text-base">
                  {est.number} · {est.title}
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {est.clientName} · valide jusqu&apos;au {formatDate(est.validUntil)}
                </p>
              </div>
              <StatusBadge status={est.status} />
            </CardHeader>
            <CardContent>
              {est.lines.length > 0 ? (
                <table className="mb-4 min-w-full text-sm">
                  <thead className="text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="py-2">Description</th>
                      <th className="py-2">Cat.</th>
                      <th className="py-2">Qté</th>
                      <th className="py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {est.lines.map((line) => (
                      <tr key={line.id} className="border-t border-border">
                        <td className="py-2">{line.description}</td>
                        <td className="py-2 capitalize">{line.category}</td>
                        <td className="py-2">
                          {line.qty} {line.unit}
                        </td>
                        <td className="py-2 text-right">
                          {formatCurrency(line.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
              <div className="ml-auto max-w-xs space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Sous-total</span>
                  <span>{formatCurrency(est.subtotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>TPS 5%</span>
                  <span>{formatCurrency(est.tps)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>TVQ 9,975%</span>
                  <span>{formatCurrency(est.tvq)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-2 font-semibold">
                  <span>Total TTC</span>
                  <span>{formatCurrency(est.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
