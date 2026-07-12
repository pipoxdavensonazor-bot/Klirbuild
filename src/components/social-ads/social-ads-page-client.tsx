"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Globe2,
  Link2,
  Megaphone,
  RefreshCw,
  Share2,
  ShieldAlert,
  Unplug,
} from "lucide-react";
import { SocialAdLaunchWorkspace } from "@/components/social-ads/launch-workspace";
import { MarketingCalendar } from "@/components/social-ads/marketing-calendar";
import {
  MarketingMetricoolShell,
  type MarketingTab,
} from "@/components/social-ads/marketing-metricool-shell";
import { MarketingSetupChecklist } from "@/components/social-ads/marketing-setup-checklist";
import { SocialPublishComposer } from "@/components/social-ads/publish-composer";
import { ZernioConnectionsPanel } from "@/components/social-ads/zernio-connections-panel";
import { PageHeader, StatCard } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/badge";
import { apiUrl } from "@/lib/api-client";
import { PLATFORM_LABELS, type SocialAccount, type SocialAdCampaign } from "@/lib/reports/types";
import {
  canManageSocialAds,
  socialAdsAccessLabel,
} from "@/lib/social-ads/access";
import { useSocialAdsStore } from "@/lib/social-ads/store";
import type { ConnectionTile } from "@/lib/social-ads/zernio-connections-service";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { employees } from "@/lib/workforce/mock-data";
import { useSessionStore } from "@/lib/workforce/session";

type ProviderMeta = {
  hubUrl?: string;
  contact?: string;
  managedBy?: string;
  enabled?: boolean;
  dashboardUrl?: string;
  profileId?: string | null;
};

type TabId = MarketingTab;

function mapUrlTab(value: string | null): TabId {
  if (value === "publications") return "planning";
  if (value === "campaigns") return "campaigns";
  if (value === "connections") return "connections";
  if (value === "summary" || value === "planning" || value === "reports") return value;
  return "connections";
}

function PlatformIcon({ platform }: { platform: string }) {
  if (platform === "google") return <Globe2 className="h-4 w-4" />;
  if (platform === "instagram" || platform === "tiktok" || platform === "youtube")
    return <Share2 className="h-4 w-4" />;
  return <Megaphone className="h-4 w-4" />;
}

export function SocialAdsPageClient() {
  const searchParams = useSearchParams();
  const role = useSessionStore((s) => s.role);
  const employeeId = useSessionStore((s) => s.employeeId);
  const employee = employees.find((e) => e.id === employeeId) ?? employees[0];
  const canLaunch = canManageSocialAds(role, employee.jobTitle);
  const accessLabel = socialAdsAccessLabel(role, employee.jobTitle);

  const workspaces = useSocialAdsStore((s) => s.workspaces);
  const activeWorkspaceId = useSocialAdsStore((s) => s.activeWorkspaceId);
  const createWorkspace = useSocialAdsStore((s) => s.createWorkspace);
  const setActiveWorkspace = useSocialAdsStore((s) => s.setActiveWorkspace);

  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [connections, setConnections] = useState<ConnectionTile[]>([]);
  const [campaigns, setCampaigns] = useState<SocialAdCampaign[]>([]);
  const [klirline, setKlirline] = useState<ProviderMeta | null>(null);
  const [zernio, setZernio] = useState<ProviderMeta | null>(null);
  const [provider, setProvider] = useState<"zernio" | "klirline">("klirline");
  const [tab, setTab] = useState<TabId>("connections");
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [newAdName, setNewAdName] = useState("");
  const [selectedAccount, setSelectedAccount] = useState("");

  async function load() {
    try {
      const res = await fetch(apiUrl("/api/social-ads"), { credentials: "include" });
      const data = await res.json();
      const list: SocialAccount[] = data.accounts ?? [];
      setAccounts(list);
      setConnections(data.connections ?? []);
      setCampaigns(data.campaigns ?? []);
      setKlirline(data.klirline ?? null);
      setZernio(data.zernio ?? null);
      setProvider(data.provider === "zernio" ? "zernio" : "klirline");
      if (data.error) setMessage(data.error);
      if (!selectedAccount) {
        const first = list.find((a) => a.status === "connected") ?? list[0];
        if (first) setSelectedAccount(first.id);
      }
    } catch {
      setMessage("Erreur réseau — impossible de charger les comptes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const urlTab = searchParams.get("tab");
    if (urlTab) {
      setTab(mapUrlTab(urlTab));
    } else if (searchParams.get("connected") || searchParams.get("error")) {
      setTab("connections");
    }
  }, [searchParams]);

  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");
    if (connected) {
      const via =
        searchParams.get("provider") === "zernio" || provider === "zernio"
          ? "Zernio"
          : "Klirline.ca";
      setMessage(
        `Compte ${PLATFORM_LABELS[connected as keyof typeof PLATFORM_LABELS] ?? connected} connecté via ${via}.`
      );
      void load();
    } else if (error) {
      setMessage(decodeURIComponent(error));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const connectedAccounts = accounts.filter((a) => a.status === "connected");
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

  async function oauthPlatform(platformId: string) {
    if (!canLaunch || busy) return;
    setBusy(true);
    try {
      const res = await fetch(apiUrl("/api/social-ads"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "oauth_url", platformId }),
      });
      const data = await res.json();
      if (data.oauthUrl) {
        window.location.href = data.oauthUrl;
        return;
      }
      setMessage(data.error ?? "Impossible d'ouvrir la connexion.");
    } finally {
      setBusy(false);
    }
  }

  async function connectAccount(account: SocialAccount) {
    await oauthPlatform(account.platform);
  }

  async function syncZernioAccounts() {
    if (!canLaunch || busy) return;
    setBusy(true);
    try {
      const res = await fetch(apiUrl("/api/social-ads"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "sync_accounts" }),
      });
      const data = await res.json();
      if (data.error) {
        setMessage(data.error);
        return;
      }
      setAccounts(data.accounts ?? accounts);
      setConnections(data.connections ?? connections);
      setMessage(`${data.synced ?? 0} compte(s) synchronisé(s) depuis Zernio.`);
    } finally {
      setBusy(false);
    }
  }

  async function disconnect(id: string) {
    if (!canLaunch || busy) return;
    setBusy(true);
    try {
      await fetch(apiUrl("/api/social-ads"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "disconnect", id }),
      });
      setMessage("Compte déconnecté.");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function reauth(account: SocialAccount) {
    await oauthPlatform(account.platform);
  }

  async function syncInsights() {
    if (!canLaunch || busy) return;
    setBusy(true);
    try {
      const res = await fetch(apiUrl("/api/social-ads"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "sync" }),
      });
      const data = await res.json();
      setCampaigns(data.campaigns ?? campaigns);
      setMessage(
        data.synced > 0
          ? `${data.synced} campagne(s) synchronisée(s).`
          : "Aucune campagne active à synchroniser."
      );
    } finally {
      setBusy(false);
    }
  }

  function openLaunchWorkspace() {
    if (!canLaunch || !newAdName.trim() || !selectedAccount) return;
    const account = accounts.find((a) => a.id === selectedAccount);
    if (!account || account.status !== "connected") {
      setMessage("Connectez d'abord le compte via Zernio ou Klirline.");
      setTab("connections");
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

  async function handleLaunched(
    name: string,
    workspace?: {
      headline: string;
      primaryText: string;
      callToAction: string;
      dailyBudget: number;
    }
  ) {
    const account = accounts.find((a) => a.id === selectedAccount);
    const res = await fetch(apiUrl("/api/social-ads"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        action: provider === "zernio" ? "publish" : "launch_campaign",
        name,
        headline: workspace?.headline,
        primaryText: workspace?.primaryText,
        callToAction: workspace?.callToAction,
        accountId: account?.id ?? selectedAccount,
        platform: account?.platform ?? "facebook",
        mode: "queue",
        objective: "leads",
        dailyBudget: workspace?.dailyBudget ?? 50,
      }),
    });
    const data = await res.json();
    if (data.error) {
      setMessage(data.error);
      return;
    }
    if (data.campaign) {
      setCampaigns((prev) => [data.campaign, ...prev]);
    } else {
      await load();
    }
    setNewAdName("");
    setActiveWorkspace(null);
    setTab("campaigns");
    setMessage(
      data.message ??
        `Publicité « ${name} » publiée sur ${account ? PLATFORM_LABELS[account.platform] : "la plateforme"}.`
    );
  }

  if (loading) {
    return <p className="p-8 text-muted-foreground">Chargement des comptes…</p>;
  }

  return (
    <div>
      <PageHeader
        title="Marketing et promotion"
        description="Tableau de bord style Metricool — connexions, planification et annonces via Zernio."
        actions={
          canLaunch ? (
            <div className="flex gap-2">
              {provider === "zernio" ? (
                <Button variant="outline" disabled={busy} onClick={() => void syncZernioAccounts()}>
                  <RefreshCw className={cn("h-4 w-4", busy && "animate-spin")} />
                  Sync Zernio
                </Button>
              ) : null}
              <Button variant="outline" disabled={busy} onClick={() => void syncInsights()}>
                <RefreshCw className={cn("h-4 w-4", busy && "animate-spin")} />
                Synchroniser
              </Button>
            </div>
          ) : undefined
        }
      />

      {message || provider !== "zernio" ? (
        <MarketingSetupChecklist
          error={message || undefined}
          provider={provider}
          onRetry={() => {
            setMessage("");
            void load();
          }}
        />
      ) : null}

      {message && provider === "zernio" ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          {message}
        </div>
      ) : null}

      <MarketingMetricoolShell
        tab={tab}
        onTabChange={setTab}
        selectedPlatform={selectedPlatform}
        onPlatformSelect={(id) => {
          setSelectedPlatform(id);
          if (id) setTab("connections");
        }}
        connectedCount={connections.filter((c) => c.status === "connected").length}
      >
        {tab === "summary" ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Comptes connectés" value={String(connectedAccounts.length)} />
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
            {provider === "zernio" ? (
              <ZernioConnectionsPanel
                connections={connections.slice(0, 6)}
                canManage={canLaunch}
                busy={busy}
                profileId={zernio?.profileId}
                onConnect={(platformId) => void oauthPlatform(platformId)}
                onDisconnect={(id) => void disconnect(id)}
                onReauth={(platformId) => void oauthPlatform(platformId)}
                onSync={() => void syncZernioAccounts()}
              />
            ) : null}
          </div>
        ) : null}

        {tab === "connections" ? (
          provider === "zernio" ? (
            <ZernioConnectionsPanel
              connections={connections}
              canManage={canLaunch}
              busy={busy}
              profileId={zernio?.profileId}
              platformFilter={selectedPlatform}
              onConnect={(platformId) => void oauthPlatform(platformId)}
              onDisconnect={(id) => void disconnect(id)}
              onReauth={(platformId) => void oauthPlatform(platformId)}
              onSync={() => void syncZernioAccounts()}
            />
          ) : (
          <Card>
            <CardHeader>
              <CardTitle>Comptes entreprise</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {accounts.map((account) => (
                <div key={account.id} className="rounded-lg border border-border p-3">
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
                      </div>
                    </div>
                    <StatusBadge status={account.status} />
                  </div>
                  {canLaunch ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {account.status === "disconnected" ? (
                        <Button
                          size="sm"
                          disabled={busy}
                          onClick={() => void connectAccount(account)}
                        >
                          <Link2 className="h-3.5 w-3.5" />
                          Connecter via Klirline.ca
                        </Button>
                      ) : null}
                      {account.status === "needs_reauth" ? (
                        <Button size="sm" disabled={busy} onClick={() => void reauth(account)}>
                          Réautoriser
                        </Button>
                      ) : null}
                      {account.status === "connected" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => void disconnect(account.id)}
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
        )
        ) : null}

        {tab === "planning" ? (
        <div className="space-y-6">
          <MarketingCalendar campaigns={campaigns} />
          <SocialPublishComposer
            accounts={accounts}
            selectedAccountId={selectedAccount}
            onAccountChange={setSelectedAccount}
            canManage={canLaunch}
            zernioEnabled={provider === "zernio"}
            onPublished={(msg) => {
              setMessage(msg);
              void load();
            }}
          />
          {connectedAccounts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              Connectez au moins un compte dans l&apos;onglet{" "}
              <button
                type="button"
                className="font-medium text-brand-600 underline-offset-2 hover:underline"
                onClick={() => {
                  setTab("connections");
                  setSelectedPlatform(null);
                }}
              >
                Connexions
              </button>{" "}
              avant de publier.
            </div>
          ) : null}
        </div>
        ) : null}

        {tab === "campaigns" || tab === "reports" ? (
        <Card>
          <CardHeader>
            <CardTitle>Campagnes et publicités</CardTitle>
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
                    Accès {accessLabel} — textes, photos, tableau et commentaires synchronisés
                    via {provider === "zernio" ? "Zernio" : "Klirline.ca"}.
                  </p>
                ) : null}
              </>
            ) : (
              <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium">Accès restreint</p>
                  <p className="mt-1 text-xs opacity-90">
                    Seuls l&apos;administrateur central et le chef marketing peuvent lancer une pub
                    et accéder à l&apos;espace de création.
                  </p>
                </div>
              </div>
            )}

            {canLaunch && activeWorkspaceId ? (
              <SocialAdLaunchWorkspace
                onLaunched={(name, workspace) => void handleLaunched(name, workspace)}
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
                    <th className="py-2">Publication</th>
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
                        <td className="py-2 text-xs text-muted-foreground">
                          {ad.publishMode === "queue"
                            ? "Créneau optimal"
                            : ad.publishMode === "now"
                              ? "Immédiat"
                              : ad.scheduledFor
                                ? formatDate(ad.scheduledFor.slice(0, 10))
                                : "—"}
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
        ) : null}
      </MarketingMetricoolShell>
    </div>
  );
}
