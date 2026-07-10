"use client";

import Link from "next/link";
import { PageHeader, StatCard } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { getPlan } from "@/lib/billing/plans";
import { demoCompany, kpi, payments } from "@/lib/mock-data";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useSessionStore } from "@/lib/workforce/session";

export default function PaymentsPage() {
  const planId = useSessionStore((s) => s.plan);
  const plan = getPlan(planId);

  return (
    <div>
      <PageHeader
        title="Payments"
        description="Abonnement KlirBuild + historique des paiements clients."
        actions={
          <Link href="/billing">
            <Button variant="outline">Gérer l&apos;abonnement</Button>
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <StatCard label="MRR" value={formatCurrency(kpi.mrr)} hint={`Plan ${plan.name}`} />
        <StatCard
          label="Subscription"
          value={demoCompany.subscriptionStatus}
          hint={`${plan.name} · trial`}
        />
        <StatCard label="Payments recorded" value={String(payments.length)} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>KlirBuild billing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              Plan actuel: <strong>{plan.name}</strong>
            </p>
            <p className="text-muted-foreground">
              {plan.maxUsers === 9999 ? "Illimité" : plan.maxUsers} users ·{" "}
              {plan.maxJobs === 9999 ? "Illimité" : plan.maxJobs} chantiers ·{" "}
              {plan.maxStorageGb} Go
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href="/billing">
                <Button size="sm">Changer de plan</Button>
              </Link>
              <Button size="sm" variant="outline">
                Portail Stripe
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Client payments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {payments.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm"
              >
                <div>
                  <p className="font-medium">{p.clientName}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.invoiceNumber} · {formatDate(p.createdAt)} · {p.method}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={p.status} />
                  <span className="font-medium">{formatCurrency(p.amount)}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
