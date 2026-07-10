"use client";

import { useMemo, useState } from "react";
import {
  Bot,
  CloudLightning,
  Play,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { RequirePlan } from "@/components/auth/require-plan";
import { PageHeader, StatCard } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { recipesForRegion } from "@/lib/markets/automations";
import { getMarket } from "@/lib/markets/regions";
import { riskLabel, weatherAlertsFor } from "@/lib/markets/weather";
import { t } from "@/lib/markets/i18n";
import { useSessionStore } from "@/lib/workforce/session";
import { cn } from "@/lib/utils";

export default function AutoPilotPage() {
  return (
    <RequirePlan feature="auto_pilot" title="Auto-Pilot — plan Business+">
      <AutoPilotInner />
    </RequirePlan>
  );
}

function AutoPilotInner() {
  const marketRegion = useSessionStore((s) => s.marketRegion);
  const locale = useSessionStore((s) => s.locale);
  const autoPilot = useSessionStore((s) => s.autoPilot);
  const setAutoPilot = useSessionStore((s) => s.setAutoPilot);
  const market = getMarket(marketRegion);
  const recipes = useMemo(() => recipesForRegion(marketRegion), [marketRegion]);
  const weather = useMemo(() => weatherAlertsFor(marketRegion), [marketRegion]);
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(recipes.map((r) => [r.id, r.defaultOn]))
  );
  const [log, setLog] = useState<string[]>([
    "Auto-Pilot prêt — en attente d'événements chantier.",
  ]);

  const activeCount = Object.values(enabled).filter(Boolean).length;

  function runDemo() {
    const on = recipes.filter((r) => enabled[r.id]);
    const lines = on.slice(0, 4).map(
      (r) =>
        `[${new Date().toLocaleTimeString()}] ${r.name} → ${r.actions[0]}`
    );
    if (weather[0]) {
      lines.push(
        `[${new Date().toLocaleTimeString()}] Météo ${riskLabel(weather[0].risk)} → ${weather[0].autoActions[0]}`
      );
    }
    setLog((prev) => [...lines, ...prev].slice(0, 12));
  }

  return (
    <div>
      <PageHeader
        title={t(locale, "autoPilot")}
        description={`Automatisations avancées pour ${market.label} — paie, facturation, conformité, météo.`}
        actions={
          <>
            <Button
              variant={autoPilot ? "default" : "outline"}
              onClick={() => setAutoPilot(!autoPilot)}
            >
              <Zap className="h-4 w-4" />
              {autoPilot ? "Auto-Pilot ON" : "Auto-Pilot OFF"}
            </Button>
            <Button variant="outline" onClick={runDemo}>
              <Play className="h-4 w-4" />
              Simuler cycle
            </Button>
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Recettes actives" value={String(activeCount)} />
        <StatCard label="Marché" value={market.zone.replace("_", " ")} />
        <StatCard
          label="Alertes météo"
          value={String(weather.length)}
          hint={weather[0] ? riskLabel(weather[0].risk) : "N/A"}
        />
        <StatCard
          label="Mode"
          value={autoPilot ? "Autonome" : "Manuel"}
          hint="Business+"
        />
      </div>

      {weather.length > 0 ? (
        <Card className="mb-6 border-amber-200/80 bg-amber-50/40 dark:border-amber-900 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CloudLightning className="h-4 w-4 text-amber-600" />
              Intelligence météo / ouragans
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {weather.map((w) => (
              <div
                key={w.id}
                className="rounded-lg border border-border bg-background/80 p-3 text-sm"
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="font-medium">{w.title}</p>
                  <StatusBadge status={w.risk === "high" ? "overdue" : "active"} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {w.window} · {w.impact}
                </p>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {w.autoActions.map((a) => (
                    <li key={a}>→ {a}</li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent-500" />
              Recettes Auto-Pilot ({recipes.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recipes.map((r) => (
              <div
                key={r.id}
                className={cn(
                  "flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border p-4",
                  !autoPilot && "opacity-60"
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <p className="font-medium">{r.name}</p>
                    {r.advanced ? (
                      <span className="rounded-md bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
                        Advanced
                      </span>
                    ) : null}
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {r.category}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{r.description}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Trigger: {r.trigger}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!autoPilot}
                  onClick={() =>
                    setEnabled((prev) => ({ ...prev, [r.id]: !prev[r.id] }))
                  }
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium",
                    enabled[r.id]
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  )}
                >
                  {enabled[r.id] ? "ON" : "OFF"}
                </button>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bot className="h-4 w-4" />
                Journal d&apos;exécution
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 font-mono text-xs text-muted-foreground">
              {log.map((line, i) => (
                <p key={`${line}-${i}`} className="rounded bg-slate-50 p-2 dark:bg-slate-900">
                  {line}
                </p>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-4 w-4" />
                Différenciation marché
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Auto-Pilot adapte les recettes au profil{" "}
              <strong className="text-foreground">{market.label}</strong> :
              CCQ au Québec, OSHA/liens aux USA, TVA + ouragans aux Caraïbes —
              sans changer d&apos;outil.
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
