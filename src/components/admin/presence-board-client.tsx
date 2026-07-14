"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MessageSquare, Phone, RefreshCw, Users, Video, X } from "lucide-react";
import { RequirePermission } from "@/components/auth/require-permission";
import { PageHeader, StatCard } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiUrl } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";
import { roleLabelFr } from "@/lib/workforce/types";
import type { Role } from "@/types";

type Person = {
  employeeId: string;
  employeeName: string;
  email: string;
  role: string;
  jobTitle?: string;
  jobSiteName: string;
  status: string;
  clockInAt: string;
};

export function PresenceBoardClient() {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Person | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/admin/presence"), {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Accès refusé.");
        return;
      }
      setPeople(data.people ?? []);
      setError("");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 60_000);
    return () => clearInterval(t);
  }, [load]);

  async function sendMessage() {
    if (!selected) return;
    setBusy(true);
    try {
      const res = await fetch(apiUrl("/api/admin/presence"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "message",
          targetEmail: selected.email,
          targetName: selected.employeeName,
          body: message,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Envoi impossible.");
        return;
      }
      setMessage("");
      setToast("Message envoyé.");
      if (data.href) window.open(data.href, "_blank");
    } finally {
      setBusy(false);
    }
  }

  async function privateCall() {
    if (!selected) return;
    setBusy(true);
    try {
      const res = await fetch(apiUrl("/api/admin/presence"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "private-call",
          targetEmail: selected.email,
          targetName: selected.employeeName,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Appel impossible.");
        return;
      }
      setToast("Salle privée créée.");
      if (data.href) window.location.href = data.href;
    } finally {
      setBusy(false);
    }
  }

  return (
    <RequirePermission
      permission={["timeclock:manage", "location:view", "users:manage"]}
    >
      <div className="space-y-6">
        <PageHeader
          title="Présence bureau"
          description="Qui a pointé en ce moment. Cliquez une personne pour écrire ou lancer un appel visio privé."
          actions={
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => void load()}>
                <RefreshCw className="h-4 w-4" /> Actualiser
              </Button>
              <Link href="/admin/governance">
                <Button size="sm" variant="outline">
                  Gouvernance
                </Button>
              </Link>
            </div>
          }
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Présents maintenant"
            value={loading ? "…" : String(people.length)}
            icon={<Users className="h-5 w-5" />}
          />
          <StatCard
            label="Sites couverts"
            value={String(new Set(people.map((p) => p.jobSiteName)).size)}
          />
          <StatCard label="Refresh" value="60s" hint="Auto" />
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {toast ? <p className="text-sm text-emerald-700 dark:text-emerald-300">{toast}</p> : null}

        <div className="grid gap-4 lg:grid-cols-5">
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-base">Tableau de présence</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2">
              {people.map((p) => (
                <button
                  key={p.employeeId}
                  type="button"
                  onClick={() => {
                    setSelected(p);
                    setToast("");
                  }}
                  className={
                    selected?.employeeId === p.employeeId
                      ? "rounded-lg border border-brand-500 bg-brand-500/10 p-3 text-left"
                      : "rounded-lg border border-border p-3 text-left hover:bg-muted/60"
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{p.employeeName}</p>
                    <span className="rounded bg-emerald-600/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-emerald-700 dark:text-emerald-300">
                      {p.status === "on_break" ? "Pause" : "Présent"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {roleLabelFr(p.role as Role)}
                    {p.jobTitle ? ` · ${p.jobTitle}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {p.jobSiteName} · depuis {formatDate(p.clockInAt)}
                  </p>
                </button>
              ))}
              {!loading && !people.length ? (
                <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
                  Personne n’a pointé pour le moment.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Action privée</CardTitle>
              {selected ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelected(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-3">
              {!selected ? (
                <p className="text-sm text-muted-foreground">
                  Sélectionnez une personne sur le tableau.
                </p>
              ) : (
                <>
                  <div>
                    <p className="font-medium">{selected.employeeName}</p>
                    <p className="text-xs text-muted-foreground">
                      {selected.email}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      Message privé
                    </label>
                    <Input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Écrire un message…"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={busy || !message.trim()}
                      onClick={() => void sendMessage()}
                    >
                      <MessageSquare className="h-4 w-4" /> Envoyer
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => void privateCall()}
                    >
                      <Video className="h-4 w-4" /> Appel visio privé
                    </Button>
                    <a href={`tel:`} className="hidden" aria-hidden />
                    <Button size="sm" variant="outline" disabled title="Bientôt">
                      <Phone className="h-4 w-4" /> Audio
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </RequirePermission>
  );
}
