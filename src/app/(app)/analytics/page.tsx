"use client";

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
import { RequirePlan } from "@/components/auth/require-plan";
import { PageHeader, StatCard } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { clients, deals, invoices, kpi, revenueSeries, tasks } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/utils";

export default function AnalyticsPage() {
  const conversion =
    Math.round(
      (deals.filter((d) => d.stage === "won").length / Math.max(deals.length, 1)) *
        100
    ) || 0;

  return (
    <RequirePlan feature="analytics" title="Analytics — plan Growth+">
    <div>
      <PageHeader
        title="Analytics"
        description="Executive dashboard with export stubs."
        actions={
          <>
            <Button variant="outline">Export CSV</Button>
            <Button variant="outline">Export PDF</Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue MTD" value={formatCurrency(kpi.revenue)} />
        <StatCard label="MRR" value={formatCurrency(kpi.mrr)} />
        <StatCard label="Pipeline" value={formatCurrency(kpi.pipeline)} />
        <StatCard label="Win rate" value={`${conversion}%`} />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue trend</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip />
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
            <CardTitle>Module volume</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { name: "Clients", value: clients.length },
                  { name: "Invoices", value: invoices.length },
                  { name: "Tasks", value: tasks.length },
                  { name: "Deals", value: deals.length },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#C4A574" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>AI summary</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Growth is steady with {formatCurrency(kpi.pipeline)} in open pipeline.
          Collection risk is concentrated in one overdue invoice. Task load is
          manageable with {kpi.tasksDue} open items across active projects.
        </CardContent>
      </Card>
    </div>
    </RequirePlan>
  );
}
