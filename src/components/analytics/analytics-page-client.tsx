"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download } from "lucide-react";
import { PageHeader, StatCard } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiUrl } from "@/lib/api-client";
import type { AnalyticsStats } from "@/lib/analytics/analytics-service";
import { clients, deals, invoices, kpi, revenueSeries, tasks } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/utils";

const fallback: AnalyticsStats = {
  revenueMtd: kpi.revenue,
  mrr: kpi.mrr,
  pipeline: kpi.pipeline,
  winRate:
    Math.round(
      (deals.filter((d) => d.stage === "won").length / Math.max(deals.length, 1)) * 100
    ) || 0,
  revenueSeries,
  moduleVolume: [
    { name: "Clients", value: clients.length },
    { name: "Factures", value: invoices.length },
    { name: "Tâches", value: tasks.length },
    { name: "Deals", value: deals.length },
  ],
  summary: "Chargement des données entreprise…",
  overdueInvoices: 0,
  tasksOpen: kpi.tasksDue,
  activeProjects: kpi.projects,
  leadsOpen: 0,
};

export function AnalyticsPageClient() {
  const [stats, setStats] = useState<AnalyticsStats>(fallback);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch(apiUrl("/api/analytics"), { credentials: "include" })
      .then((r) => r.json())
      .then((data: AnalyticsStats) => {
        if (data && typeof data.revenueMtd === "number") setStats(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function exportCsv() {
    const rows = [
      ["Métrique", "Valeur"],
      ["Revenus MTD", String(stats.revenueMtd)],
      ["Revenu mensuel moyen (3 mois)", String(stats.mrr)],
      ["Pipeline", String(stats.pipeline)],
      ["Taux conversion deals", `${stats.winRate}%`],
      ["Factures en retard", String(stats.overdueInvoices)],
      ["Tâches ouvertes", String(stats.tasksOpen)],
      ["Projets actifs", String(stats.activeProjects)],
      ["Leads ouverts", String(stats.leadsOpen)],
      [],
      ["Mois", "Revenus"],
      ...stats.revenueSeries.map((r) => [r.month, String(r.revenue)]),
      [],
      ["Module", "Volume"],
      ...stats.moduleVolume.map((m) => [m.name, String(m.value)]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `klirbuild-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return <p className="p-8 text-muted-foreground">Chargement des analytics…</p>;
  }

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Tableau exécutif — données réelles de l'entreprise (factures, CRM, projets, tâches)."
        actions={
          <>
            <Button variant="outline" onClick={exportCsv}>
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              Export PDF
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenus MTD" value={formatCurrency(stats.revenueMtd)} />
        <StatCard
          label="Revenu mensuel moy."
          value={formatCurrency(stats.mrr)}
          hint="Moyenne 3 derniers mois"
        />
        <StatCard label="Pipeline" value={formatCurrency(stats.pipeline)} />
        <StatCard label="Taux conversion" value={`${stats.winRate}%`} />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tendance revenus</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.revenueSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0))} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#1A365D"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Volume par module</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.moduleVolume}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#C4A574" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Factures en retard" value={String(stats.overdueInvoices)} />
        <StatCard label="Tâches ouvertes" value={String(stats.tasksOpen)} />
        <StatCard label="Leads ouverts" value={String(stats.leadsOpen)} />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Résumé exécutif</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">{stats.summary}</CardContent>
      </Card>
    </div>
  );
}
