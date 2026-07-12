"use client";

import Link from "next/link";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CheckSquare,
  FileText,
  FolderKanban,
  Globe2,
  Sparkles,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { PageHeader, StatCard } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { activities, kpi, revenueSeries } from "@/lib/mock-data";
import { formatMoney } from "@/lib/markets/currency";
import { t } from "@/lib/markets/i18n";
import { getMarket } from "@/lib/markets/regions";
import { useSessionStore } from "@/lib/workforce/session";
import { TimeclockDashboardWidget } from "@/components/dashboard/timeclock-dashboard-widget";
import { TeamChatDashboardWidget } from "@/components/dashboard/team-chat-dashboard-widget";
import { formatDate } from "@/lib/utils";

export default function DashboardPage() {
  const marketRegion = useSessionStore((s) => s.marketRegion);
  const currency = useSessionStore((s) => s.currency);
  const locale = useSessionStore((s) => s.locale);
  const autoPilot = useSessionStore((s) => s.autoPilot);
  const market = getMarket(marketRegion);

  return (
    <div>
      <PageHeader
        title={t(locale, "dashboard")}
        description={`${market.label} · ${currency} · ${market.invoiceLabel}`}
        actions={
          <>
            <Link href="/markets">
              <Button variant="outline">
                <Globe2 className="h-4 w-4" />
                Marchés
              </Button>
            </Link>
            <Link href="/auto-pilot">
              <Button variant="outline">
                <Zap className="h-4 w-4" />
                Auto-Pilot
              </Button>
            </Link>
            <Link href="/ai">
              <Button>Ask Klir AI</Button>
            </Link>
          </>
        }
      />

      <Card className="mb-6 border-brand-200 bg-gradient-to-r from-brand-50/80 to-accent-50/40 dark:from-brand-950/40 dark:to-brand-900/20">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
          <div>
            <p className="font-semibold text-foreground">
              KlirBuild — unique CA · US · Caraïbes
            </p>
            <p className="text-muted-foreground">{t(locale, "uniquePitch")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-md bg-white/80 px-2 py-1 text-xs font-medium dark:bg-black/30">
              Taxes: {market.taxLines.map((x) => x.code).join("+")}
            </span>
            <span className="rounded-md bg-white/80 px-2 py-1 text-xs font-medium dark:bg-black/30">
              Auto-Pilot: {autoPilot ? "ON" : "OFF"}
            </span>
            <span className="rounded-md bg-white/80 px-2 py-1 text-xs font-medium dark:bg-black/30">
              Retainage {market.retainageDefault * 100}%
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <TimeclockDashboardWidget />
        <TeamChatDashboardWidget />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Revenue (MTD)"
          value={formatMoney(kpi.revenue, currency)}
          hint={`${market.id} · market-aware`}
          icon={<Wallet className="h-4 w-4" />}
        />
        <StatCard
          label="Open invoices"
          value={String(kpi.invoicesOpen)}
          hint="1 overdue"
          icon={<FileText className="h-4 w-4" />}
        />
        <StatCard
          label="Clients"
          value={String(kpi.clients)}
          hint="1 new lead"
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          label="Active projects"
          value={String(kpi.projects)}
          hint="On track"
          icon={<FolderKanban className="h-4 w-4" />}
        />
        <StatCard
          label="Open tasks"
          value={String(kpi.tasksDue)}
          hint="2 due this week"
          icon={<CheckSquare className="h-4 w-4" />}
        />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Revenue</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueSeries}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1A365D" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#1A365D" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#1A365D"
                  fill="url(#rev)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent-500" />
              AI Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Pipeline {formatMoney(kpi.pipeline, currency)} on {market.label}. Tax
              stack {market.taxLines.map((x) => x.name).join(" + ")}. Auto-Pilot can
              convert change orders → {market.invoiceLabel}.
            </p>
            <p>
              Focus: collect overdue, run compliance hub, and simulate Auto-Pilot
              for {market.zone.replace("_", " ")}.
            </p>
            <Link href="/ai" className="block">
              <Button variant="outline" className="w-full">
                Open full assistant
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {activities.map((item) => (
              <div
                key={item.id}
                className="flex gap-3 border-b border-border pb-3 last:border-0 last:pb-0"
              >
                <div className="mt-1 h-2 w-2 rounded-full bg-brand-500" />
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {formatDate(item.at)}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {[
              ["Marchés US/CA/CB", "/markets"],
              ["Auto-Pilot", "/auto-pilot"],
              ["Conformité", "/compliance"],
              ["New quote", "/quotes"],
              ["New invoice", "/invoices"],
              ["Build automation", "/automations"],
            ].map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="rounded-lg border border-border px-3 py-3 text-sm transition hover:border-brand-300 hover:bg-brand-50/50 dark:hover:bg-brand-900/20"
              >
                {label}
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
