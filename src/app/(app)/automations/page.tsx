"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RequirePlan } from "@/components/auth/require-plan";
import { PageHeader, StatCard } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/badge";
import { apiUrl } from "@/lib/api-client";
import type { AutomationDto } from "@/lib/automations/automation-service";
import { recipesForRegion } from "@/lib/markets/automations";
import { useSessionStore } from "@/lib/workforce/session";
import { formatDate } from "@/lib/utils";

const TRIGGERS = [
  { value: "invoice_overdue", label: "Facture en retard" },
  { value: "lead_created", label: "Nouveau lead" },
  { value: "quote_expiring", label: "Soumission expirante" },
  { value: "manual", label: "Manuel" },
];

export default function AutomationsPage() {
  const marketRegion = useSessionStore((s) => s.marketRegion);
  const recipes = recipesForRegion(marketRegion);
  const [automations, setAutomations] = useState<AutomationDto[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState("manual");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function load() {
    void fetch(apiUrl("/api/automations"), { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setAutomations(d.automations ?? []));
  }

  useEffect(() => {
    load();
  }, []);

  async function createWorkflow() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Nom requis.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(apiUrl("/api/automations"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, trigger, active: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Création échouée.");
        return;
      }
      setName("");
      setTrigger("manual");
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau");
    } finally {
      setSaving(false);
    }
  }

  const active = automations.filter((a) => a.active).length;

  return (
    <RequirePlan feature="automations" title="Automatisations — plan Business+">
      <div>
        <PageHeader
          title="Automations"
          description="Workflows en base Postgres — exécution via cron ou manuel."
          actions={
            <>
              <Link href="/auto-pilot">
                <Button variant="outline">Ouvrir Auto-Pilot</Button>
              </Link>
              <Button onClick={() => setShowForm((v) => !v)}>New workflow</Button>
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

        {showForm ? (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Nouveau workflow</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-end gap-3">
              <Input
                placeholder="Nom du workflow"
                className="max-w-xs"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={saving}
              />
              <select
                className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                value={trigger}
                onChange={(e) => setTrigger(e.target.value)}
                disabled={saving}
              >
                {TRIGGERS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <Button onClick={() => void createWorkflow()} disabled={saving}>
                {saving ? "Création…" : "Créer"}
              </Button>
              {error ? <p className="w-full text-sm text-red-600">{error}</p> : null}
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Workflows</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {automations.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucun workflow. Exécutez <code className="text-xs">npm run db:seed</code> ou
                  créez-en un ci-dessus.
                </p>
              ) : null}
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
              <CardTitle>Exécution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                Les workflows actifs s&apos;exécutent via{" "}
                <code className="text-xs">POST /api/cron/automations</code> (CRON_SECRET sur
                Netlify).
              </p>
              <p className="text-xs text-muted-foreground">
                Lancez manuellement depuis l&apos;API ou consultez Auto-Pilot pour les recettes
                avancées.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </RequirePlan>
  );
}
