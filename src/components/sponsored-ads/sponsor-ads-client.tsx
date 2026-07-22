"use client";

import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiUrl } from "@/lib/api-client";
import { formatMoney } from "@/lib/markets/currency";
import { SPONSORED_AD_PRICING } from "@/lib/sponsored-ads/pricing";

type Campaign = {
  id: string;
  title: string;
  status: string;
  spentCad: string | number;
  totalBudgetCad: string | number;
  impressions: number;
  clicks: number;
};

export function SponsorAdsClient() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    headline: "",
    body: "",
    ctaLabel: "Demander une démo",
    ctaUrl: "https://klirline.app",
    dailyBudgetCad: 25,
    totalBudgetCad: 250,
  });

  async function load() {
    const res = await fetch(apiUrl("/api/sponsored-ads"), {
      credentials: "include",
    });
    if (!res.ok) return;
    const data = await res.json();
    setCampaigns(data.campaigns || []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const res = await fetch(apiUrl("/api/sponsored-ads"), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, submitForReview: true }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(data.error || "Erreur");
      return;
    }
    setMsg("Campagne envoyée pour validation — diffusion après approbation admin.");
    setForm((f) => ({ ...f, title: "", headline: "", body: "" }));
    await load();
  }

  return (
    <div>
      <PageHeader
        title="Pubs sponsorisées"
        description="Diffusez votre marque dans KlirBuild (dashboard des autres entreprises) et générez des leads construction."
      />

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">CPM</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatMoney(SPONSORED_AD_PRICING.defaultCpmCad, "CAD", "fr")}
            <p className="mt-1 text-xs font-normal text-muted-foreground">
              pour 1&nbsp;000 impressions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">CPC</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatMoney(SPONSORED_AD_PRICING.defaultCpcCad, "CAD", "fr")}
            <p className="mt-1 text-xs font-normal text-muted-foreground">
              par clic
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Revenu plateforme</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            KlirBuild Ads est un inventaire propriétaire —{" "}
            {SPONSORED_AD_PRICING.platformFeePct}&nbsp;% du budget dépensé
            revient à Klirline Inc.
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Megaphone className="h-4 w-4" />
              Nouvelle campagne
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={(e) => void submit(e)}>
              {(
                [
                  ["title", "Titre interne"],
                  ["headline", "Accroche"],
                  ["body", "Texte"],
                  ["ctaLabel", "Bouton"],
                  ["ctaUrl", "URL"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="block text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  {key === "body" ? (
                    <textarea
                      className="mt-1 w-full rounded-md border px-3 py-2"
                      rows={3}
                      value={form[key]}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, [key]: e.target.value }))
                      }
                      required
                    />
                  ) : (
                    <input
                      className="mt-1 w-full rounded-md border px-3 py-2"
                      value={form[key]}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, [key]: e.target.value }))
                      }
                      required
                    />
                  )}
                </label>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">
                  <span className="text-muted-foreground">Budget / jour (CAD)</span>
                  <input
                    type="number"
                    min={10}
                    className="mt-1 w-full rounded-md border px-3 py-2"
                    value={form.dailyBudgetCad}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        dailyBudgetCad: Number(e.target.value),
                      }))
                    }
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-muted-foreground">Budget total (CAD)</span>
                  <input
                    type="number"
                    min={50}
                    className="mt-1 w-full rounded-md border px-3 py-2"
                    value={form.totalBudgetCad}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        totalBudgetCad: Number(e.target.value),
                      }))
                    }
                  />
                </label>
              </div>
              {msg ? <p className="text-sm text-emerald-700">{msg}</p> : null}
              <Button type="submit">Soumettre pour diffusion</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mes campagnes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {campaigns.map((c) => (
              <div key={c.id} className="rounded-lg border p-3 text-sm">
                <div className="font-medium">{c.title}</div>
                <div className="text-xs text-muted-foreground">
                  {c.status} · {formatMoney(Number(c.spentCad), "CAD", "fr")} /{" "}
                  {formatMoney(Number(c.totalBudgetCad), "CAD", "fr")} ·{" "}
                  {c.impressions} imp. · {c.clicks} clics
                </div>
              </div>
            ))}
            {!campaigns.length ? (
              <p className="text-sm text-muted-foreground">
                Aucune campagne pour le moment.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
