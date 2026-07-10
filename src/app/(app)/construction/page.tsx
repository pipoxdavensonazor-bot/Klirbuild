import Link from "next/link";
import {
  HardHat,
  FileSpreadsheet,
  FileDiff,
  Users,
  BadgeCheck,
  CreditCard,
  Megaphone,
  Bot,
  AlertTriangle,
} from "lucide-react";
import { PageHeader, StatCard } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { constructionKpis, constructionJobs } from "@/modules/construction-os/mock-data";
import { formatCurrency } from "@/lib/utils";

const pillars = [
  {
    href: "/construction/jobs",
    title: "ERP Chantier",
    desc: "Jobs, coûts, avancement, matériaux",
    icon: HardHat,
  },
  {
    href: "/construction/estimates",
    title: "Estimés",
    desc: "Soumissions + TPS/TVQ",
    icon: FileSpreadsheet,
  },
  {
    href: "/construction/change-orders",
    title: "Ordres de changement",
    desc: "Approbations & extras",
    icon: FileDiff,
  },
  {
    href: "/construction/crm",
    title: "CRM Construction",
    desc: "Leads & pipeline soumissions",
    icon: Users,
  },
  {
    href: "/construction/ccq",
    title: "CCQ",
    desc: "Métiers, cartes, heures",
    icon: BadgeCheck,
  },
  {
    href: "/construction/payments",
    title: "Paiements",
    desc: "Progress billing & retenues",
    icon: CreditCard,
  },
  {
    href: "/construction/marketing",
    title: "Marketing",
    desc: "Campagnes & ROI PME",
    icon: Megaphone,
  },
  {
    href: "/construction/ai",
    title: "IA Chantier",
    desc: "Résumés, risques, brouillons",
    icon: Bot,
  },
];

export default function ConstructionHubPage() {
  const kpi = constructionKpis();

  return (
    <div>
      <PageHeader
        title="Construction OS"
        description="ERP + CRM + IA + CCQ + Paiements + Marketing pour PME de construction au Canada."
        actions={
          <>
            <Link href="/timeclock">
              <Button variant="outline">Pointage GPS</Button>
            </Link>
            <Link href="/construction/jobs">
              <Button>Ouvrir chantiers</Button>
            </Link>
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Chantiers actifs"
          value={String(kpi.activeJobs)}
          hint={formatCurrency(kpi.contractBacklog) + " backlog"}
        />
        <StatCard
          label="Pipeline CRM"
          value={formatCurrency(kpi.pipeline)}
          hint={`${kpi.openChangeOrders} OC ouverts`}
        />
        <StatCard
          label="Alertes CCQ"
          value={String(kpi.ccqAlerts)}
          hint="Cartes / formation / ratios"
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <StatCard
          label="Retenues ouvertes"
          value={formatCurrency(kpi.holdbackOpen)}
          hint={`Marketing ROI ${formatCurrency(kpi.mktRevenue)}`}
        />
      </div>

      {kpi.marginRisk > 0 ? (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          {kpi.marginRisk} chantier(s) approchent le budget avant 90 % d&apos;avancement —
          voir Job Costing.
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {pillars.map((p) => {
          const Icon = p.icon;
          return (
            <Link
              key={p.href}
              href={p.href}
              className="rounded-xl border border-border bg-card p-4 shadow-soft transition hover:border-brand-300 hover:bg-brand-50/40 dark:hover:bg-brand-900/20"
            >
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/40">
                <Icon className="h-4 w-4" />
              </div>
              <p className="font-semibold">{p.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
            </Link>
          );
        })}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Chantiers récents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {constructionJobs.slice(0, 4).map((job) => (
            <div
              key={job.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"
            >
              <div>
                <p className="text-sm font-medium">
                  {job.number} · {job.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {job.city}, {job.province} · {job.clientName}
                </p>
              </div>
              <div className="text-right text-sm">
                <p className="font-semibold">{job.progressPct}%</p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(job.actualCost)} / {formatCurrency(job.budgetCost)}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
