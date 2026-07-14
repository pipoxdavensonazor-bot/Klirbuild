"use client";

import { useCallback, useEffect, useState } from "react";
import { apiUrl } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";

type AuditLogRow = {
  id: string;
  action: string;
  actorId: string | null;
  meta: unknown;
  createdAt: string;
};

function formatAction(action: string) {
  const map: Record<string, string> = {
    "user.invited": "Invitation d'équipe envoyée",
    "automation.fired": "Automatisation déclenchée",
    "chat.message": "Message chat",
  };
  return map[action] ?? action.replaceAll(".", " · ");
}

export function SettingsAuditLogsPanel() {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(apiUrl("/api/audit-logs"), { credentials: "include" });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Chargement impossible");
        setLogs([]);
        return;
      }
      setLogs(data.logs ?? []);
    } catch {
      setError("Erreur réseau");
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Chargement des journaux…</p>;
  }

  if (error) {
    return <p className="text-sm text-red-700">{error}</p>;
  }

  if (!logs.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucun événement enregistré pour l&apos;instant (invitations, automatisations,
        chat…).
      </p>
    );
  }

  return (
    <div className="space-y-2 text-sm">
      {logs.map((row) => (
        <div key={row.id} className="rounded-lg border border-border p-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-medium">{formatAction(row.action)}</p>
            <p className="text-xs text-muted-foreground">
              {formatDate(row.createdAt)}
            </p>
          </div>
          {row.meta && typeof row.meta === "object" ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {JSON.stringify(row.meta)}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
