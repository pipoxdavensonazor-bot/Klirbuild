"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RequirePlan } from "@/components/auth/require-plan";
import { PageHeader, StatCard } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { apiUrl } from "@/lib/api-client";
import type { AutomationDto } from "@/lib/automations/automation-service";
import { recipesForRegion } from "@/lib/markets/automations";
import { useSessionStore } from "@/lib/workforce/session";
import { formatDate } from "@/lib/utils";

export default function AutomationsPage() {
  const marketRegion = useSessionStore((s) => s.marketRegion);
  const recipes = recipesForRegion(marketRegion);
  const [automations, setAutomations] = useState<AutomationDto[]>([]);

  useEffect(() => {
    void fetch(apiUrl("/api/automations"), { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setAutomations(d.automations ?? []));
  }, []);

  const active = automations.filter((a) => a.active).length;

  return (
    <RequirePlan feature="automations" title="Automatisations — plan Business+">
      <div>
        <PageHeader
          title="Automations"
          description="Workflows classiques + recettes Auto-Pilot avancées (US / CA / Caraïbes)."
          actions={
            <>
              <Link href="/auto-pilot">
                <Button variant="outline">Ouvrir Auto-Pilot</Button>
              </Link>
              <Button>New workflow</Button>
            </>
          }
        />

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <StatCard label="Active workflows" value={String(active)} />
          <StatCard
            label="Total runs"
            value={String(automations.reduce((s, a) => s + a.runs, 0))}
          />
          <StatCard
            label="Recettes marché"
            value={String(recipes.length)}
            hint="Adaptées au profil"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Workflows</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {automations.map((auto) => (
                <div
                  key={auto.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4"
                >
                  <div>
                    <p className="font-medium">{auto.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Trigger: {auto.trigger}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {auto.runs} runs
                      {auto.lastRunAt ? ` · last ${formatDate(auto.lastRunAt)}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={auto.active ? "active" : "inactive"} />
                    <Button size="sm" variant="outline">
                      Edit
                    </Button>
                  </div>
                </div>
              ))}
              {recipes.slice(0, 4).map((r) => (
                <div
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-brand-300 bg-brand-50/40 p-4 dark:bg-brand-900/20"
                >
                  <div>
                    <p className="font-medium">{r.name}</p>
                    <p className="text-sm text-muted-foreground">{r.description}</p>
                  </div>
                  <StatusBadge status="ready" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Builder canvas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {["Trigger", "Condition", "Action"].map((step, i) => (
                <div
                  key={step}
                  className="rounded-lg border border-dashed border-border bg-slate-50/70 p-4 dark:bg-slate-900/30"
                >
                  <p className="text-xs text-muted-foreground">Step {i + 1}</p>
                  <p className="font-medium">{step}</p>
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                Engine stub: POST /api/cron/automations · Advanced: /auto-pilot
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </RequirePlan>
  );
}
