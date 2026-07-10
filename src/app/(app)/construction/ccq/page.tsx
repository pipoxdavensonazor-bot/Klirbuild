import { AlertTriangle, BadgeCheck } from "lucide-react";
import { PageHeader, StatCard } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import {
  ccqDeclarations,
  ccqWorkers,
} from "@/modules/construction-os/mock-data";
import {
  COMPETENCY_LABELS,
  TRADE_LABELS,
} from "@/modules/construction-os/types";
import { formatDate } from "@/lib/utils";

export default function CcqPage() {
  const alerts = ccqWorkers.filter(
    (w) =>
      !w.apprenticeshipRatioOk ||
      new Date(w.cardExpires) < new Date("2026-08-01") ||
      Boolean(w.trainingDue)
  );

  return (
    <div>
      <PageHeader
        title="CCQ — Conformité Québec"
        description="Métiers, cartes de compétence, heures déclarables et alertes. Aide à la conformité — ne remplace pas les outils officiels CCQ."
        actions={
          <>
            <Button variant="outline">Exporter heures</Button>
            <Button>Préparer déclaration</Button>
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Travailleurs suivis"
          value={String(ccqWorkers.length)}
          icon={<BadgeCheck className="h-4 w-4" />}
        />
        <StatCard
          label="Alertes"
          value={String(alerts.length)}
          hint="Carte / formation / ratio"
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <StatCard
          label="Heures période"
          value={String(ccqWorkers.reduce((s, w) => s + w.hoursThisPeriod, 0))}
        />
      </div>

      {alerts.length > 0 ? (
        <div className="mb-6 space-y-2">
          {alerts.map((w) => (
            <div
              key={w.id}
              className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
            >
              <strong>{w.name}</strong> —{" "}
              {!w.apprenticeshipRatioOk
                ? "Ratio apprenti à vérifier. "
                : null}
              {new Date(w.cardExpires) < new Date("2026-08-01")
                ? `Carte expire le ${formatDate(w.cardExpires)}. `
                : null}
              {w.trainingDue
                ? `Formation due le ${formatDate(w.trainingDue)}.`
                : null}
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Travailleurs & métiers</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2">Nom</th>
                  <th className="py-2">Métier</th>
                  <th className="py-2">Statut</th>
                  <th className="py-2">Carte</th>
                  <th className="py-2">Heures</th>
                </tr>
              </thead>
              <tbody>
                {ccqWorkers.map((w) => (
                  <tr key={w.id} className="border-t border-border">
                    <td className="py-2">
                      <p className="font-medium">{w.name}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">
                        {w.ccqNumber}
                      </p>
                    </td>
                    <td className="py-2">{TRADE_LABELS[w.trade]}</td>
                    <td className="py-2">{COMPETENCY_LABELS[w.competency]}</td>
                    <td className="py-2">{formatDate(w.cardExpires)}</td>
                    <td className="py-2">{w.hoursThisPeriod}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Déclarations d&apos;heures</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {ccqDeclarations.map((d) => (
              <div
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    {d.workerName} · {TRADE_LABELS[d.trade]}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {d.jobName} · semaine se terminant {formatDate(d.weekEnding)} ·{" "}
                    {d.hours}h
                  </p>
                </div>
                <StatusBadge status={d.status} />
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Les heures peuvent être alimentées automatiquement depuis le pointage
              GPS (Core) par chantier et métier.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
