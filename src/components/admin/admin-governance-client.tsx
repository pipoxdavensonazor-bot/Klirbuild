"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, Download, HardDrive, ShieldAlert, X } from "lucide-react";
import { RequirePermission } from "@/components/auth/require-permission";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiUrl } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";

type DeleteReq = {
  id: string;
  resourceType: string;
  resourceLabel?: string;
  reason?: string;
  status: string;
  requestedByEmail: string;
  createdAt: string;
};

type Backup = {
  id: string;
  label: string;
  sizeBytes: number;
  trigger: string;
  createdAt: string;
};

export function AdminGovernanceClient() {
  const [requests, setRequests] = useState<DeleteReq[]>([]);
  const [backups, setBackups] = useState<Backup[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [rRes, bRes] = await Promise.all([
      fetch(apiUrl("/api/admin/delete-requests?status=pending"), {
        credentials: "include",
      }),
      fetch(apiUrl("/api/admin/backups"), { credentials: "include" }),
    ]);
    const rData = await rRes.json();
    const bData = await bRes.json();
    if (!rRes.ok) {
      setError(rData.error || "Accès gouvernance refusé.");
      return;
    }
    setRequests(rData.requests ?? []);
    setBackups(bData.backups ?? []);
    setError("");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function review(id: string, decision: "approve" | "reject") {
    setBusy(true);
    try {
      const res = await fetch(apiUrl("/api/admin/delete-requests"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "review", requestId: id, decision }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Action impossible.");
        return;
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function runBackup() {
    setBusy(true);
    try {
      const res = await fetch(apiUrl("/api/admin/backups"), {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Backup échoué.");
        return;
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  function download(id: string) {
    window.location.href = apiUrl(`/api/admin/backups?download=${id}`);
  }

  return (
    <RequirePermission permission={["users:manage", "company:manage"]}>
      <div className="space-y-6">
        <PageHeader
          title="Gouvernance admin"
          description="Approuver les suppressions sensibles et gérer les sauvegardes (cloud + téléchargement PC)."
          actions={
            <Link href="/presence">
              <Button size="sm" variant="outline">
                Présence bureau
              </Button>
            </Link>
          }
        />

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="h-4 w-4" /> Demandes de suppression
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {requests.map((r) => (
              <div
                key={r.id}
                className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium">
                    {r.resourceLabel || r.resourceType}{" "}
                    <span className="text-xs text-muted-foreground">
                      ({r.resourceType})
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.requestedByEmail} · {formatDate(r.createdAt)}
                    {r.reason ? ` · ${r.reason}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() => void review(r.id, "approve")}
                  >
                    <Check className="h-4 w-4" /> Approuver
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => void review(r.id, "reject")}
                  >
                    <X className="h-4 w-4" /> Refuser
                  </Button>
                </div>
              </div>
            ))}
            {!requests.length ? (
              <p className="text-sm text-muted-foreground">
                Aucune demande en attente.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <HardDrive className="h-4 w-4" /> Sauvegardes
            </CardTitle>
            <Button size="sm" disabled={busy} onClick={() => void runBackup()}>
              Lancer maintenant
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Auto quotidien via cron Netlify (<code>/api/cron/backups</code>).
              Téléchargez sur votre PC pour une copie locale. Google Drive peut
              être branché ensuite via OAuth.
            </p>
            {backups.map((b) => (
              <div
                key={b.id}
                className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium">{b.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(b.createdAt)} · {b.trigger} ·{" "}
                    {Math.round(b.sizeBytes / 1024)} Ko
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => download(b.id)}
                >
                  <Download className="h-4 w-4" /> Télécharger (PC)
                </Button>
              </div>
            ))}
            {!backups.length ? (
              <p className="text-sm text-muted-foreground">
                Aucune sauvegarde encore — lancez-en une.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </RequirePermission>
  );
}
