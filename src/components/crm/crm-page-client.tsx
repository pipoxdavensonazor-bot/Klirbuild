"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader, StatCard } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/badge";
import { apiUrl } from "@/lib/api-client";
import { formatCurrency } from "@/lib/utils";
import type { Deal, Lead } from "@/types";

const stages = ["new", "qualified", "proposal", "negotiation", "won", "lost"] as const;

export function CrmPageClient() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [kpis, setKpis] = useState({ pipeline: 0, openLeads: 0, wonDeals: 0 });
  const [loading, setLoading] = useState(true);
  const [newLead, setNewLead] = useState("");

  async function load() {
    const res = await fetch(apiUrl("/api/crm"), { credentials: "include" });
    const data = await res.json();
    setLeads(data.leads ?? []);
    setDeals(data.deals ?? []);
    setKpis(data.kpis ?? { pipeline: 0, openLeads: 0, wonDeals: 0 });
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function addLead() {
    const name = newLead.trim();
    if (!name) return;
    await fetch(apiUrl("/api/crm"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ entity: "lead", name }),
    });
    setNewLead("");
    await load();
  }

  if (loading) return <p className="p-8 text-muted-foreground">Chargement…</p>;

  return (
    <div>
      <PageHeader
        title="CRM"
        description="Leads, pipeline et croissance — données entreprise."
        actions={
          <>
            <Link href="/clients">
              <Button variant="outline">Clients</Button>
            </Link>
            <Link href="/crm/pipeline">
              <Button>Pipeline</Button>
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Pipeline" value={formatCurrency(kpis.pipeline)} />
        <StatCard label="Leads ouverts" value={String(kpis.openLeads)} />
        <StatCard label="Deals gagnés" value={String(kpis.wonDeals)} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Leads</CardTitle>
            <div className="flex gap-2">
              <Input
                className="h-8 w-40 text-sm"
                placeholder="Nouveau lead…"
                value={newLead}
                onChange={(e) => setNewLead(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void addLead()}
              />
              <Button size="sm" onClick={() => void addLead()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {leads.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun lead — ajoutez-en un ci-dessus.</p>
            ) : (
              leads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{lead.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {lead.source} · Score {lead.score}
                    </p>
                  </div>
                  <StatusBadge status={lead.status} />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {stages.map((stage) => {
              const count = deals.filter((d) => d.stage === stage).length;
              return (
                <div key={stage} className="rounded-lg border border-border p-3">
                  <p className="text-xs capitalize text-muted-foreground">{stage}</p>
                  <p className="mt-1 text-xl font-semibold">{count}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
