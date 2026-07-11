"use client";

import { useMemo, useState } from "react";
import {
  Globe2,
  Link2,
  Megaphone,
  RefreshCw,
  Share2,
  ShieldAlert,
  Unplug,
} from "lucide-react";
import { RequirePermission } from "@/components/auth/require-permission";
import { RequirePlan } from "@/components/auth/require-plan";
import { PageHeader, StatCard } from "@/components/shared/page-header";
import { SocialAdLaunchWorkspace } from "@/components/social-ads/launch-workspace";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/badge";
import {
  socialAccounts as initialAccounts,
  socialAdCampaigns as initialCampaigns,
} from "@/lib/reports/mock-data";
import { PLATFORM_LABELS, type SocialAccount, type SocialAdCampaign } from "@/lib/reports/types";
import {
  canManageSocialAds,
  socialAdsAccessLabel,
} from "@/lib/social-ads/access";
import { useSocialAdsStore } from "@/lib/social-ads/store";
import { formatCurrency, formatDate } from "@/lib/utils";
import { employees } from "@/lib/workforce/mock-data";
import { useSessionStore } from "@/lib/workforce/session";

function PlatformIcon({ platform }: { platform: string }) {
  if (platform === "google") return <Globe2 className="h-4 w-4" />;
  if (platform === "instagram" || platform === "tiktok" || platform === "youtube")
    return <Share2 className="h-4 w-4" />;
  return <Megaphone className="h-4 w-4" />;
}

export default function SocialMarketingPage() {
  return (
    <RequirePermission permission={["crm:write", "settings:manage", "analytics:read"]}>
      <RequirePlan feature="social_ads" title="Pubs réseaux — plan Business+">
        <SocialMarketingInner />
      </RequirePlan>
    </RequirePermission>
  );
}

function SocialMarketingInner() {
  const role = useSessionStore((s) => s.role);
  const employeeId = useSessionStore((s) => s.employeeId);
  const employee = employees.find((e) => e.id === employeeId) ?? employees[0];
  const canLaunch = canManageSocialAds(role, employee.jobTitle);
  const accessLabel = socialAdsAccessLabel(role, employee.jobTitle);

  const workspaces = useSocialAdsStore((s) => s.workspaces);
  const activeWorkspaceId = useSocialAdsStore((s) => s.activeWorkspaceId);
  const createWorkspace = useSocialAdsStore((s) => s.createWorkspace);
  const setActiveWorkspace = useSocialAdsStore((s) => s.setActiveWorkspace);

  const [accounts, setAccounts] = useState<SocialAccount[]>(initialAccounts);
  const [campaigns, setCampaigns] = useState<SocialAdCampaign[]>(initialCampaigns);
  const [message, setMessage] = useState("");
  const [newAdName, setNewAdName] = useState("");
  const [selectedAccount, setSelectedAccount] = useState(
    accounts.find((a) => a.status === "connected")?.id ?? accounts[0]?.id
  );

  const connected = accounts.filter((a) => a.status === "connected");
  const spend = campaigns.reduce((s, c) => s + c.spend, 0);
  const leads = campaigns.reduce((s, c) => s + c.leads, 0);
  const impressions = campaigns.reduce((s, c) => s + c.impressions, 0);

  const activeAds = useMemo(
    () => campaigns.filter((c) => c.status === "active"),
    [campaigns]
  );

  const launchedWorkspaces = useMemo(
    () => workspaces.filter((w) => w.status === "active"),
    [workspaces]
  );

  function connect(id: string) {
    if (!canLaunch) return;
    setAccounts((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              status: "connected",
              connectedAt: new Date().toISOString().slice(0, 10),
              adAccountId: a.adAccountId ?? `act_${Math.floor(Math.random() * 1e8)}`,
            }
          : a
      )
    );
    setMessage("Compte connecté (OAuth stub) — prêt pour publier des publicités.");
  }

  function disconnect(id: string) {
    if (!canLaunch) return;
    setAccounts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "disconnected" } : a))
    );
    setMessage("Compte déconnecté.");
  }

  function reauth(id: string) {
    if (!canLaunch) return;
    setAccounts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "connected" } : a))
    );
    setMessage("Autorisation renouvelée.");
  }

  function openLaunchWorkspace() {
    if (!canLaunch || !newAdName.trim() || !selectedAccount) return;
    const account = accounts.find((a) => a.id === selectedAccount);
    if (!account || account.status !== "connected") {
      setMessage("Connectez d'abord le compte publicitaire.");
      return;
    }
    createWorkspace({
      name: newAdName.trim(),
      platform: account.platform === "meta" ? "facebook" : account.platform,
      accountId: account.id,
    });
    setMessage(
      `Espace pub ouvert pour « ${newAdName.trim()} » — ajoutez textes, photos et commentaires.`
    );
  }

  function handleLaunched(name: string) {
    const account = accounts.find((a) => a.id === selectedAccount);
    const ad: SocialAdCampaign = {
      id: `ad_${Date.now()}`,
      name,
      platform: account?.platform === "meta" ? "facebook" : account?.platform ?? "facebook",
      accountId: account?.id ?? selectedAccount,
      objective: "leads",
      status: "active",
      dailyBudget: 50,
      spend: 0,
      impressions: 0,
      clicks: 0,
      leads: 0,
      startDate: new Date().toISOString().slice(0, 10),
    };
    setCampaigns((prev) => [ad, ...prev]);
    setNewAdName("");
    setActiveWorkspace(null);
    setMessage(
      `Publicité « ${name} » publiée sur ${account ? PLATFORM_LABELS[account.platform] : "la plateforme"}.`
    );
  }

  return (
    <div>
      <PageHeader
        title="Marketing réseaux sociaux"
        description="Connectez les comptes de l'entreprise et gérez les publicités Meta, Google, Instagram, LinkedIn…"
        actions={
          canLaunch ? (
            <Button variant="outline" onClick={() => setMessage("Sync des insights… (API stub)")}>
              <RefreshCw className="h-4 w-4" />
              Synchroniser
            </Button>
          ) : undefined
        }
      />

      {message ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          {message}
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Comptes connectés" value={String(connected.length)} />
        <StatCard
          label="Pubs actives"
          value={String(activeAds.length + launchedWorkspaces.length)}
        />
        <StatCard label="Dépenses ads" value={formatCurrency(spend)} />
        <StatCard
          label="Leads ads"
          value={String(leads)}
          hint={`${impressions.toLocaleString("fr-CA")} impressions`}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Comptes entreprise</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="rounded-lg border border-border p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 rounded-md bg-brand-50 p-2 text-brand-600 dark:bg-brand-900/40">
                      <PlatformIcon platform={account.platform} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {PLATFORM_LABELS[account.platform]}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {account.accountName} · {account.handle}
                      </p>
                      {account.adAccountId ? (
                        <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                          {account.adAccountId}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <StatusBadge status={account.status} />
                </div>
                {canLaunch ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {account.status === "disconnected" ? (
                      <Button size="sm" onClick={() => connect(account.id)}>
                        <Link2 className="h-3.5 w-3.5" />
                        Connecter
                      </Button>
                    ) : null}
                    {account.status === "needs_reauth" ? (
                      <Button size="sm" onClick={() => reauth(account.id)}>
                        Réautoriser
                      </Button>
                    ) : null}
                    {account.status === "connected" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => disconnect(account.id)}
                      >
                        <Unplug className="h-3.5 w-3.5" />
                        Déconnecter
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle>Publicités</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {canLaunch ? (
              <>
                <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-3 sm:flex-row">
                  <select
                    className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                    value={selectedAccount}
                    onChange={(e) => setSelectedAccount(e.target.value)}
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id} disabled={a.status !== "connected"}>
                        {PLATFORM_LABELS[a.platform]}
                        {a.status !== "connected" ? " (non connecté)" : ""}
                      </option>
                    ))}
                  </select>
                  <Input
                    placeholder="Nom de la publicité…"
                    value={newAdName}
                    onChange={(e) => setNewAdName(e.target.value)}
                  />
                  <Button onClick={openLaunchWorkspace}>Lancer la pub</Button>
                </div>
                {accessLabel ? (
                  <p className="text-xs text-muted-foreground">
                    Accès {accessLabel} — textes, photos, tableau et commentaires
                    synchronisés.
                  </p>
                ) : null}
              </>
            ) : (
              <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium">Accès restreint</p>
                  <p className="mt-1 text-xs opacity-90">
                    Seuls l&apos;administrateur central et le chef marketing peuvent
                    lancer une pub et accéder à l&apos;espace de création.
                  </p>
                </div>
              </div>
            )}

            {canLaunch && activeWorkspaceId ? (
              <SocialAdLaunchWorkspace
                onLaunched={handleLaunched}
                onClose={() => setActiveWorkspace(null)}
              />
            ) : null}

            {canLaunch && workspaces.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {workspaces.map((w) => (
                  <Button
                    key={w.id}
                    type="button"
                    size="sm"
                    variant={w.id === activeWorkspaceId ? "default" : "outline"}
                    onClick={() => setActiveWorkspace(w.id)}
                  >
                    {w.name}
                    <span className="ml-1 text-[10px] opacity-70">({w.status})</span>
                  </Button>
                ))}
              </div>
            ) : null}

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-2">Campagne</th>
                    <th className="py-2">Plateforme</th>
                    <th className="py-2">Statut</th>
                    <th className="py-2">Budget/j</th>
                    <th className="py-2">Spend</th>
                    <th className="py-2">Leads</th>
                    <th className="py-2">CTR</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((ad) => {
                    const ctr =
                      ad.impressions > 0
                        ? ((ad.clicks / ad.impressions) * 100).toFixed(2)
                        : "0.00";
                    return (
                      <tr key={ad.id} className="border-t border-border">
                        <td className="py-2">
                          <p className="font-medium">{ad.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {ad.objective} · depuis {formatDate(ad.startDate)}
                          </p>
                        </td>
                        <td className="py-2 capitalize">{ad.platform}</td>
                        <td className="py-2">
                          <StatusBadge status={ad.status} />
                        </td>
                        <td className="py-2">{formatCurrency(ad.dailyBudget)}</td>
                        <td className="py-2">{formatCurrency(ad.spend)}</td>
                        <td className="py-2">{ad.leads}</td>
                        <td className="py-2">{ctr}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
