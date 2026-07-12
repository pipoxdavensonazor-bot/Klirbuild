"use client";

import { useMemo } from "react";
import { RefreshCw, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ConnectionTile } from "@/lib/social-ads/zernio-connections-service";

type Props = {
  connections: ConnectionTile[];
  canManage: boolean;
  busy: boolean;
  profileId?: string | null;
  platformFilter?: string | null;
  onConnect: (platformId: string) => void;
  onDisconnect: (accountId: string) => void;
  onReauth: (platformId: string) => void;
  onSync: () => void;
};

function MetricoolConnectionCard({
  tile,
  canManage,
  busy,
  onConnect,
  onDisconnect,
  onReauth,
}: {
  tile: ConnectionTile;
  canManage: boolean;
  busy: boolean;
  onConnect: (platformId: string) => void;
  onDisconnect: (accountId: string) => void;
  onReauth: (platformId: string) => void;
}) {
  const isConnected = tile.status === "connected";
  const needsReauth = tile.status === "needs_reauth";

  const ctaLabel = isConnected
    ? `Reconnecter ${tile.name}`
    : needsReauth
      ? `Réautoriser ${tile.name}`
      : tile.connectLabel;

  const handleClick = () => {
    if (!canManage || busy) return;
    if (isConnected || needsReauth) {
      onReauth(tile.id);
      return;
    }
    onConnect(tile.id);
  };

  return (
    <article
      id={`platform-${tile.id}`}
      className="rounded-lg border border-[#e8ecf0] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
    >
      <div className="mb-4 flex items-center gap-2">
        <span
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-md text-[10px] font-bold text-white",
            tile.iconBg
          )}
        >
          {tile.monogram}
        </span>
        <h3 className="text-sm font-semibold text-[#2d3436]">{tile.name}</h3>
      </div>

      {isConnected ? (
        <div className="mb-3 rounded-md bg-[#f8fafb] px-3 py-2 text-xs text-[#555]">
          <p className="font-medium text-[#222]">{tile.accountName}</p>
          {tile.handle ? <p className="mt-0.5 truncate">{tile.handle}</p> : null}
        </div>
      ) : null}

      {canManage ? (
        <div className="space-y-2">
          <button
            type="button"
            disabled={busy}
            onClick={handleClick}
            className={cn(
              "flex w-full items-center justify-between rounded-lg px-4 py-3 text-left text-sm font-medium transition hover:opacity-90 disabled:opacity-60",
              tile.buttonBg,
              tile.buttonText
            )}
          >
            <span className="pr-3 leading-snug">{ctaLabel}</span>
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-bold text-white",
                tile.iconBg
              )}
            >
              {tile.monogram.slice(0, 2)}
            </span>
          </button>
          {isConnected && tile.accountId ? (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-full text-xs text-muted-foreground"
              disabled={busy}
              onClick={() => onDisconnect(tile.accountId!)}
            >
              <Unplug className="h-3.5 w-3.5" />
              Déconnecter
            </Button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export function ZernioConnectionsPanel({
  connections,
  canManage,
  busy,
  profileId,
  platformFilter,
  onConnect,
  onDisconnect,
  onReauth,
  onSync,
}: Props) {
  const connectedCount = connections.filter((c) => c.status === "connected").length;

  const filtered = useMemo(() => {
    if (!platformFilter) return connections;
    return connections.filter((c) => c.id === platformFilter);
  }, [connections, platformFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[#2d3436]">
            Paramètres des connexions
          </h2>
          <p className="mt-1 text-xs text-[#6b7280]">
            {connectedCount} compte(s) connecté(s) · style Metricool via Zernio
          </p>
          {profileId ? (
            <p className="mt-1 font-mono text-[10px] text-[#9ca3af]">Profil {profileId}</p>
          ) : null}
        </div>
        {canManage ? (
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={onSync}
            className="border-[#d1d9e0] bg-white"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", busy && "animate-spin")} />
            Synchroniser
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((tile) => (
          <MetricoolConnectionCard
            key={tile.id}
            tile={tile}
            canManage={canManage}
            busy={busy}
            onConnect={onConnect}
            onDisconnect={onDisconnect}
            onReauth={onReauth}
          />
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Aucune plateforme sélectionnée.
        </p>
      ) : null}
    </div>
  );
}
