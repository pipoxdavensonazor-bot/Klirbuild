"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  Link2,
  RefreshCw,
  Search,
  Unplug,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ConnectionTile } from "@/lib/social-ads/zernio-connections-service";

type Filter = "all" | "connected" | "disconnected";

type Props = {
  connections: ConnectionTile[];
  canManage: boolean;
  busy: boolean;
  profileId?: string | null;
  onConnect: (platformId: string) => void;
  onDisconnect: (accountId: string) => void;
  onReauth: (platformId: string) => void;
  onSync: () => void;
};

export function ZernioConnectionsPanel({
  connections,
  canManage,
  busy,
  profileId,
  onConnect,
  onDisconnect,
  onReauth,
  onSync,
}: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const connectedCount = connections.filter((c) => c.status === "connected").length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return connections.filter((c) => {
      if (filter === "connected" && c.status !== "connected") return false;
      if (filter === "disconnected" && c.status === "connected") return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.handle?.toLowerCase().includes(q)
      );
    });
  }, [connections, filter, search]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Connexions</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Connectez vos comptes réseaux sociaux via Zernio — comme sur{" "}
            <a
              href="https://zernio.com/dashboard/connections"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-brand-600 underline-offset-2 hover:underline"
            >
              zernio.com/dashboard/connections
            </a>
          </p>
          {profileId ? (
            <p className="mt-1 font-mono text-[10px] text-muted-foreground">
              Profil Zernio · {profileId}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
            {connectedCount} / {connections.length} connectés
          </span>
          {canManage ? (
            <Button variant="outline" size="sm" disabled={busy} onClick={onSync}>
              <RefreshCw className={cn("h-3.5 w-3.5", busy && "animate-spin")} />
              Synchroniser
            </Button>
          ) : null}
          <a
            href="https://zernio.com/dashboard/connections"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="sm">
              <ExternalLink className="h-3.5 w-3.5" />
              Ouvrir Zernio
            </Button>
          </a>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Rechercher une plateforme…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex rounded-lg border border-border p-1">
          {(
            [
              ["all", "Toutes"],
              ["connected", "Connectées"],
              ["disconnected", "À connecter"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition",
                filter === key
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {filtered.map((tile) => (
          <div
            key={tile.id}
            className="group overflow-hidden rounded-xl border border-border bg-card shadow-sm transition hover:border-brand-300 hover:shadow-md"
          >
            <div
              className={cn(
                "flex h-24 items-center justify-between bg-gradient-to-br px-4 text-white",
                tile.tileClass
              )}
            >
              <div>
                <p className="text-lg font-bold leading-none">{tile.name}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wider opacity-80">
                  {tile.category}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 text-xl font-bold backdrop-blur-sm">
                {tile.monogram}
              </div>
            </div>

            <div className="space-y-3 p-4">
              <p className="text-xs text-muted-foreground line-clamp-2">
                {tile.description}
              </p>

              {tile.status === "connected" ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2 dark:border-emerald-900 dark:bg-emerald-950/30">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-800 dark:text-emerald-200">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Connecté
                  </div>
                  <p className="mt-1 truncate text-sm font-medium">{tile.accountName}</p>
                  {tile.handle ? (
                    <p className="truncate text-xs text-muted-foreground">{tile.handle}</p>
                  ) : null}
                </div>
              ) : tile.status === "needs_reauth" ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                  Réautorisation requise
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                  Non connecté
                </div>
              )}

              {canManage ? (
                <div className="flex flex-wrap gap-2">
                  {tile.status === "disconnected" ? (
                    <Button
                      size="sm"
                      className="w-full"
                      disabled={busy}
                      onClick={() => onConnect(tile.id)}
                    >
                      <Link2 className="h-3.5 w-3.5" />
                      Connecter
                    </Button>
                  ) : null}
                  {tile.status === "needs_reauth" ? (
                    <Button
                      size="sm"
                      className="w-full"
                      disabled={busy}
                      onClick={() => onReauth(tile.id)}
                    >
                      Réautoriser
                    </Button>
                  ) : null}
                  {tile.status === "connected" && tile.accountId ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      disabled={busy}
                      onClick={() => onDisconnect(tile.accountId!)}
                    >
                      <Unplug className="h-3.5 w-3.5" />
                      Déconnecter
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Aucune plateforme ne correspond à votre recherche.
        </p>
      ) : null}
    </div>
  );
}
