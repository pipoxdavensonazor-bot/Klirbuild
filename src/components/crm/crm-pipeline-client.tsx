"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/badge";
import { apiUrl } from "@/lib/api-client";
import { formatCurrency } from "@/lib/utils";
import type { Deal, DealStage } from "@/types";

const stages: DealStage[] = [
  "new",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
];

export function CrmPipelineClient() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");

  async function load() {
    const res = await fetch(apiUrl("/api/crm"), { credentials: "include" });
    const data = await res.json();
    setDeals(data.deals ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function addDeal() {
    const t = title.trim();
    if (!t) return;
    await fetch(apiUrl("/api/crm"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ entity: "deal", title: t, stage: "new" }),
    });
    setTitle("");
    await load();
  }

  async function moveDeal(id: string, stage: DealStage) {
    const deal = deals.find((d) => d.id === id);
    if (!deal) return;
    await fetch(apiUrl("/api/crm"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        entity: "deal",
        id,
        title: deal.title,
        clientName: deal.clientName,
        value: deal.value,
        stage,
        owner: deal.owner,
        closeDate: deal.closeDate,
      }),
    });
    await load();
  }

  if (loading) return <p className="p-8 text-muted-foreground">Chargement…</p>;

  return (
    <div>
      <PageHeader
        title="Pipeline commercial"
        description="Opportunités par étape — données réelles."
        actions={
          <div className="flex gap-2">
            <Input
              className="w-48"
              placeholder="Nouvelle opportunité…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void addDeal()}
            />
            <Button onClick={() => void addDeal()}>Ajouter</Button>
          </div>
        }
      />
      <div className="flex gap-4 overflow-x-auto pb-2">
        {stages.map((stage) => (
          <Card key={stage} className="min-w-[240px] flex-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm capitalize">{stage}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {deals
                .filter((d) => d.stage === stage)
                .map((deal) => (
                  <div
                    key={deal.id}
                    className="rounded-lg border border-border bg-slate-50/70 p-3 dark:bg-slate-900/40"
                  >
                    <p className="text-sm font-medium">{deal.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{deal.clientName}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-sm font-semibold">
                        {formatCurrency(deal.value)}
                      </span>
                      <StatusBadge status={deal.stage} />
                    </div>
                    {stage !== "won" && stage !== "lost" ? (
                      <select
                        className="mt-2 h-8 w-full rounded border border-border bg-background text-xs"
                        value={deal.stage}
                        onChange={(e) => void moveDeal(deal.id, e.target.value as DealStage)}
                      >
                        {stages.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    ) : null}
                  </div>
                ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
