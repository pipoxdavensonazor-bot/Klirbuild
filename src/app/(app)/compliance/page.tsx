"use client";

import { useMemo } from "react";
import { AlertTriangle, CheckCircle2, Clock3, Shield } from "lucide-react";
import { RequirePlan } from "@/components/auth/require-plan";
import { PageHeader, StatCard } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import {
  complianceCatalog,
  complianceForRegion,
} from "@/lib/markets/compliance";
import { getMarket } from "@/lib/markets/regions";
import { t } from "@/lib/markets/i18n";
import { useSessionStore } from "@/lib/workforce/session";

export default function CompliancePage() {
  return (
    <RequirePlan feature="compliance_hub" title="Conformité régionale — Growth+">
      <ComplianceInner />
    </RequirePlan>
  );
}

function ComplianceInner() {
  const marketRegion = useSessionStore((s) => s.marketRegion);
  const locale = useSessionStore((s) => s.locale);
  const market = getMarket(marketRegion);
  const items = useMemo(() => complianceForRegion(marketRegion), [marketRegion]);

  const overdue = items.filter((i) => i.status === "overdue").length;
  const dueSoon = items.filter((i) => i.status === "due_soon").length;
  const action = items.filter((i) => i.status === "action").length;

  return (
    <div>
      <PageHeader
        title={t(locale, "compliance")}
        description={`Packs actifs pour ${market.label} — CCQ, OSHA, liens, TVA caraïbe, permis, ouragans.`}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Items suivis" value={String(items.length)} />
        <StatCard label="En retard" value={String(overdue)} hint="Action urgente" />
        <StatCard label="Bientôt dus" value={String(dueSoon)} />
        <StatCard label="À traiter" value={String(action)} />
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {market.compliance.map((pack) => {
          const meta = complianceCatalog[pack];
          return (
            <Card key={pack}>
              <CardContent className="flex gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/40">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">{meta.name}</p>
                  <p className="text-xs text-muted-foreground">{meta.description}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>File de conformité + actions auto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border p-4"
            >
              <div className="flex gap-3">
                {item.status === "ok" ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
                ) : item.status === "overdue" ? (
                  <AlertTriangle className="mt-0.5 h-5 w-5 text-red-600" />
                ) : (
                  <Clock3 className="mt-0.5 h-5 w-5 text-amber-600" />
                )}
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {complianceCatalog[item.pack].name} · Owner: {item.owner}
                    {item.dueDate ? ` · Due ${item.dueDate}` : ""}
                  </p>
                  {item.autoAction ? (
                    <p className="mt-1 text-xs text-brand-600 dark:text-brand-300">
                      Auto: {item.autoAction}
                    </p>
                  ) : null}
                </div>
              </div>
              <StatusBadge
                status={
                  item.status === "ok"
                    ? "active"
                    : item.status === "overdue"
                      ? "overdue"
                      : "pending"
                }
              />
            </div>
          ))}
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun pack pour ce marché.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
