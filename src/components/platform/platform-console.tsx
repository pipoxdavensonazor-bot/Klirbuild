"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  DollarSign,
  Megaphone,
  RefreshCw,
  Shield,
  Users,
} from "lucide-react";
import { PageHeader, StatCard } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiUrl } from "@/lib/api-client";
import { formatMoney } from "@/lib/markets/currency";

type CompanyRow = {
  id: string;
  name: string;
  email: string | null;
  plan: string;
  subscriptionStatus: string;
  suspended: boolean;
  createdAt: string;
  marketRegion: string;
  usersCount: number;
  mrrCad: number;
};

type Overview = {
  companiesCount: number;
  usersTotal: number;
  suspendedCount: number;
  estimatedMrrCad: number;
  estimatedArrCad: number;
  projectedMonthlyRevenueCad: number;
  ads: {
    activeCampaigns: number;
    totalCampaigns: number;
    lifetimeAdRevenueCad: number;
    last30DaysAdRevenueCad: number;
    bookedBudgetCad: number;
  };
  stack?: Record<string, { ok: boolean; label: string; provider?: string }>;
  companies: CompanyRow[];
};

type AdCampaign = {
  id: string;
  title: string;
  status: string;
  spentCad: string | number;
  totalBudgetCad: string | number;
  impressions: number;
  clicks: number;
  advertiserCompany?: { name: string };
};

export function PlatformConsole() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [ads, setAds] = useState<AdCampaign[]>([]);
  const [tab, setTab] = useState<"companies" | "ads">("companies");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const [o, a] = await Promise.all([
      fetch(apiUrl("/api/platform/overview"), { credentials: "include" }),
      fetch(apiUrl("/api/platform/ads"), { credentials: "include" }),
    ]);
    if (!o.ok) {
      setError("Accès refusé — compte admin plateforme requis.");
      return;
    }
    setOverview(await o.json());
    if (a.ok) {
      const data = await a.json();
      setAds(data.campaigns || []);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function patchCompany(
    id: string,
    body: Record<string, unknown>
  ) {
    setBusy(id);
    try {
      const res = await fetch(apiUrl(`/api/platform/companies/${id}`), {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Échec mise à jour");
      await load();
    } catch {
      setError("Impossible de mettre à jour l'entreprise.");
    } finally {
      setBusy(null);
    }
  }

  async function enterCompany(companyId: string) {
    setBusy(companyId);
    try {
      const res = await fetch(apiUrl("/api/platform/impersonate"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });
      if (!res.ok) throw new Error("impersonate failed");
      window.location.href = "/dashboard";
    } catch {
      setError("Impossible d'entrer dans l'entreprise.");
      setBusy(null);
    }
  }

  async function reviewAd(id: string, status: "active" | "rejected" | "paused") {
    setBusy(id);
    try {
      const res = await fetch(apiUrl("/api/platform/ads"), {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error("review failed");
      await load();
    } catch {
      setError("Impossible de modérer la pub.");
    } finally {
      setBusy(null);
    }
  }

  if (error && !overview) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        {error}
      </div>
    );
  }

  if (!overview) {
    return <p className="text-sm text-muted-foreground">Chargement console…</p>;
  }

  return (
    <div>
      <PageHeader
        title="Console plateforme"
        description="Contrôle de toutes les entreprises KlirBuild + revenus pubs sponsorisées"
        actions={
          <>
            <Button variant="outline" onClick={() => void load()}>
              <RefreshCw className="h-4 w-4" />
              Actualiser
            </Button>
            <Link href="/ads/sponsor">
              <Button variant="outline">
                <Megaphone className="h-4 w-4" />
                Créer une pub
              </Button>
            </Link>
          </>
        }
      />

      {error ? (
        <p className="mb-4 text-sm text-red-600">{error}</p>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Entreprises"
          value={String(overview.companiesCount)}
          hint={`${overview.suspendedCount} suspendue(s)`}
          icon={<Building2 className="h-4 w-4" />}
        />
        <StatCard
          label="Utilisateurs"
          value={String(overview.usersTotal)}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          label="MRR SaaS (est.)"
          value={formatMoney(overview.estimatedMrrCad, "CAD", "fr")}
          hint={`ARR ${formatMoney(overview.estimatedArrCad, "CAD", "fr")}`}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <StatCard
          label="Revenu pubs 30j"
          value={formatMoney(overview.ads.last30DaysAdRevenueCad, "CAD", "fr")}
          hint={`${overview.ads.activeCampaigns} campagnes actives · lifetime ${formatMoney(overview.ads.lifetimeAdRevenueCad, "CAD", "fr")}`}
          icon={<Megaphone className="h-4 w-4" />}
        />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4" />
            Revenu mensuel projeté
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p className="text-2xl font-semibold text-foreground">
            {formatMoney(overview.projectedMonthlyRevenueCad, "CAD", "fr")}
          </p>
          <p className="mt-1">
            SaaS (abonnements) + inventaire pubs in-app KlirBuild Ads. Les pubs
            sponsorisées sont facturées au CPM/CPC — 100&nbsp;% du spend revient
            à la plateforme.
          </p>
        </CardContent>
      </Card>

      {overview.stack ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">État de la stack</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(overview.stack).map(([key, item]) => (
                <li
                  key={key}
                  className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                >
                  <span
                    className={
                      item.ok
                        ? "h-2 w-2 rounded-full bg-emerald-500"
                        : "h-2 w-2 rounded-full bg-amber-500"
                    }
                  />
                  <span className="capitalize text-muted-foreground">{key}</span>
                  <span className="ml-auto font-medium">{item.label}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">
              Visio : Jitsi est déjà live. Pour Daily.co natif, suivez{" "}
              <a className="underline" href="https://dashboard.daily.co/signup" target="_blank" rel="noreferrer">
                dashboard.daily.co
              </a>{" "}
              puis collez la clé (hors chat) — doc{" "}
              <code>DAILY.md</code>.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <div className="mb-4 flex gap-2">
        <Button
          variant={tab === "companies" ? "default" : "outline"}
          onClick={() => setTab("companies")}
        >
          Entreprises
        </Button>
        <Button
          variant={tab === "ads" ? "default" : "outline"}
          onClick={() => setTab("ads")}
        >
          Pubs sponsorisées
        </Button>
      </div>

      {tab === "companies" ? (
        <div className="overflow-x-auto rounded-xl border">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-muted-foreground dark:bg-slate-900">
              <tr>
                <th className="px-3 py-2">Entreprise</th>
                <th className="px-3 py-2">Plan</th>
                <th className="px-3 py-2">Statut</th>
                <th className="px-3 py-2">Users</th>
                <th className="px-3 py-2">MRR</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {overview.companies.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="px-3 py-2">
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.email || c.id}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      className="rounded border bg-transparent px-2 py-1"
                      value={c.plan}
                      disabled={busy === c.id}
                      onChange={(e) =>
                        void patchCompany(c.id, { plan: e.target.value })
                      }
                    >
                      <option value="starter">starter</option>
                      <option value="growth">growth</option>
                      <option value="business">business</option>
                      <option value="enterprise">enterprise</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        c.suspended
                          ? "text-red-600"
                          : "text-emerald-700 dark:text-emerald-400"
                      }
                    >
                      {c.suspended ? "suspendue" : c.subscriptionStatus}
                    </span>
                  </td>
                  <td className="px-3 py-2">{c.usersCount}</td>
                  <td className="px-3 py-2">
                    {formatMoney(c.mrrCad, "CAD", "fr")}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy === c.id}
                        onClick={() => void enterCompany(c.id)}
                      >
                        Entrer
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy === c.id}
                        onClick={() =>
                          void patchCompany(c.id, {
                            suspended: !c.suspended,
                          })
                        }
                      >
                        {c.suspended ? "Réactiver" : "Suspendre"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-muted-foreground dark:bg-slate-900">
              <tr>
                <th className="px-3 py-2">Campagne</th>
                <th className="px-3 py-2">Annonceur</th>
                <th className="px-3 py-2">Statut</th>
                <th className="px-3 py-2">Spend</th>
                <th className="px-3 py-2">Perf.</th>
                <th className="px-3 py-2">Modération</th>
              </tr>
            </thead>
            <tbody>
              {ads.map((ad) => (
                <tr key={ad.id} className="border-t">
                  <td className="px-3 py-2 font-medium">{ad.title}</td>
                  <td className="px-3 py-2">
                    {ad.advertiserCompany?.name || "—"}
                  </td>
                  <td className="px-3 py-2">{ad.status}</td>
                  <td className="px-3 py-2">
                    {formatMoney(Number(ad.spentCad), "CAD", "fr")} /{" "}
                    {formatMoney(Number(ad.totalBudgetCad), "CAD", "fr")}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {ad.impressions} imp. · {ad.clicks} clics
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {ad.status === "pending_review" ||
                      ad.status === "paused" ||
                      ad.status === "rejected" ? (
                        <Button
                          size="sm"
                          disabled={busy === ad.id}
                          onClick={() => void reviewAd(ad.id, "active")}
                        >
                          Approuver
                        </Button>
                      ) : null}
                      {ad.status === "active" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy === ad.id}
                          onClick={() => void reviewAd(ad.id, "paused")}
                        >
                          Pause
                        </Button>
                      ) : null}
                      {ad.status === "pending_review" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy === ad.id}
                          onClick={() => void reviewAd(ad.id, "rejected")}
                        >
                          Rejeter
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {!ads.length ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-8 text-center text-muted-foreground"
                  >
                    Aucune campagne encore — les entreprises créent des pubs via
                    /ads/sponsor.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
