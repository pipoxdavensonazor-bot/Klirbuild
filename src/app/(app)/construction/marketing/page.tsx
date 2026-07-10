import Link from "next/link";
import { PageHeader, StatCard } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { marketingCampaigns } from "@/modules/construction-os/mock-data";
import { formatCurrency } from "@/lib/utils";

export default function ConstructionMarketingPage() {
  const spend = marketingCampaigns.reduce((s, c) => s + c.spend, 0);
  const leads = marketingCampaigns.reduce((s, c) => s + c.leads, 0);
  const revenue = marketingCampaigns.reduce((s, c) => s + c.revenue, 0);
  const contracts = marketingCampaigns.reduce((s, c) => s + c.contracts, 0);
  const roi = spend > 0 ? Math.round((revenue / spend) * 10) / 10 : 0;

  return (
    <div>
      <PageHeader
        title="Marketing PME"
        description="Campagnes locales, capture de leads et ROI contrats signés — adapté aux entrepreneurs canadiens."
        actions={
          <>
            <Link href="/social-ads">
              <Button variant="outline">Pubs réseaux sociaux</Button>
            </Link>
            <Button>Nouvelle campagne</Button>
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Dépenses" value={formatCurrency(spend)} />
        <StatCard label="Leads" value={String(leads)} />
        <StatCard label="Contrats" value={String(contracts)} />
        <StatCard label="ROI" value={`${roi}x`} hint={formatCurrency(revenue) + " revenus"} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campagnes</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-2">Campagne</th>
                <th className="py-2">Canal</th>
                <th className="py-2">Statut</th>
                <th className="py-2">Spend</th>
                <th className="py-2">Leads</th>
                <th className="py-2">Contrats</th>
                <th className="py-2">Revenus</th>
                <th className="py-2">CPL</th>
              </tr>
            </thead>
            <tbody>
              {marketingCampaigns.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="py-2 font-medium">{c.name}</td>
                  <td className="py-2 capitalize">{c.channel}</td>
                  <td className="py-2">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="py-2">{formatCurrency(c.spend)}</td>
                  <td className="py-2">{c.leads}</td>
                  <td className="py-2">{c.contracts}</td>
                  <td className="py-2">{formatCurrency(c.revenue)}</td>
                  <td className="py-2">
                    {c.leads
                      ? formatCurrency(Math.round(c.spend / c.leads))
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          {
            title: "Capture web → CRM",
            body: "Formulaires devis reliés au pipeline Construction CRM.",
          },
          {
            title: "Avis & réputation",
            body: "Suivi Google Business Profile et demandes d'avis post-chantier.",
          },
          {
            title: "Emails / SMS",
            body: "Modèles de relance soumission et newsletter clients passés.",
          },
        ].map((item) => (
          <Card key={item.title}>
            <CardHeader>
              <CardTitle className="text-base">{item.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {item.body}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
