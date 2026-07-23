"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, Copy, Plus, Radio, Users, Video } from "lucide-react";
import { RequirePermission } from "@/components/auth/require-permission";
import { RequirePlan } from "@/components/auth/require-plan";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiUrl } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";
import {
  absoluteAppPath,
  audienceLabel,
  copyText,
  statusLabel,
  type MeetingAudience,
} from "@/lib/meetings/ui";

type Meeting = {
  id: string;
  title: string;
  audience: string;
  status: string;
  hostName?: string;
  slug: string;
  shareToken: string;
  publicPath: string;
  clientPath: string;
  clientIds?: string[];
  createdAt: string;
};

type ClientOpt = { id: string; name: string };

function StatusPill({ status }: { status: string }) {
  const live = status === "live";
  const ended = status === "ended";
  return (
    <span
      className={
        live
          ? "rounded bg-red-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white"
          : ended
            ? "rounded bg-slate-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
            : "rounded bg-emerald-600/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300"
      }
    >
      {statusLabel(status)}
    </span>
  );
}

export function MeetingsPageClient() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [clients, setClients] = useState<ClientOpt[]>([]);
  const [canHost, setCanHost] = useState(false);
  const [dailyConfigured, setDailyConfigured] = useState(false);
  const [title, setTitle] = useState("");
  const [audience, setAudience] = useState<MeetingAudience>("company");
  const [clientIds, setClientIds] = useState<string[]>([]);
  const [filter, setFilter] = useState<"all" | "live" | "scheduled" | "ended">(
    "all"
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [mRes, cRes] = await Promise.all([
        fetch(apiUrl("/api/meetings"), { credentials: "include" }),
        fetch(apiUrl("/api/clients"), { credentials: "include" }),
      ]);
      const mData = await mRes.json();
      const cData = await cRes.json().catch(() => ({}));
      if (!mRes.ok) {
        setError(mData.error || "Impossible de charger les réunions.");
        return;
      }
      setMeetings(mData.meetings ?? []);
      setCanHost(Boolean(mData.canHost));
      setDailyConfigured(Boolean(mData.dailyConfigured));
      setClients(
        (cData.clients ?? []).map((c: { id: string; name: string }) => ({
          id: c.id,
          name: c.name,
        }))
      );
      setError("");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(apiUrl("/api/meetings"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          audience,
          clientIds: audience === "clients" ? clientIds : [],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Création impossible.");
        return;
      }
      const id = data.meeting?.id as string | undefined;
      if (id) {
        await fetch(apiUrl(`/api/meetings/${id}`), {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "live" }),
        });
        window.location.href = `/meetings/${id}`;
        return;
      }
      setTitle("");
      setClientIds([]);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function copyLink(m: Meeting, kind: "public" | "client") {
    const path = kind === "public" ? m.publicPath : m.clientPath;
    const ok = await copyText(absoluteAppPath(path));
    if (ok) {
      setCopiedId(`${m.id}-${kind}`);
      setTimeout(() => setCopiedId(null), 1800);
    }
  }

  const filtered = meetings.filter(
    (m) => filter === "all" || m.status === filter
  );

  return (
    <RequirePlan feature="meetings" title="Réunions — plan Growth+">
      <RequirePermission permission="meetings:join">
        <div className="space-y-6">
          <PageHeader
            title="Réunions"
            description="Visio native KlirBuild. Équipe, clients ou public — rejoignez en un clic."
            actions={
              <Link href="/feed">
                <Button variant="outline" size="sm">
                  <Radio className="h-4 w-4" /> Feed & live
                </Button>
              </Link>
            }
          />

          {dailyConfigured ? (
            <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-200">
              Daily connecté — les salles utilisent votre compte Daily.
            </p>
          ) : (
            <p className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sm text-sky-950 dark:text-sky-100">
              Visio <strong>Jitsi</strong> active (gratuite, opérationnelle).{" "}
              <code>DAILY_API_KEY</code> est optionnel (marque blanche /
              enregistrement cloud).
            </p>
          )}

          {canHost ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Plus className="h-4 w-4" /> Nouvelle réunion
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex-1 space-y-1">
                    <label className="text-xs text-muted-foreground">Titre</label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Stand-up chantier"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && title.trim()) void create();
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      Audience
                    </label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm sm:w-40"
                      value={audience}
                      onChange={(e) =>
                        setAudience(e.target.value as MeetingAudience)
                      }
                    >
                      <option value="company">Équipe</option>
                      <option value="clients">Clients</option>
                      <option value="public">Public</option>
                    </select>
                  </div>
                  <Button
                    disabled={busy || !title.trim()}
                    onClick={() => void create()}
                  >
                    <Video className="h-4 w-4" /> Créer & démarrer
                  </Button>
                </div>
                {audience === "clients" ? (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Clients autorisés (optionnel — vide = tous via le lien)
                    </p>
                    <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto rounded-md border border-border p-2">
                      {clients.length === 0 ? (
                        <span className="text-xs text-muted-foreground">
                          Aucun client CRM.
                        </span>
                      ) : (
                        clients.map((c) => {
                          const on = clientIds.includes(c.id);
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() =>
                                setClientIds((prev) =>
                                  on
                                    ? prev.filter((id) => id !== c.id)
                                    : [...prev, c.id]
                                )
                              }
                              className={
                                on
                                  ? "rounded-full bg-brand-500 px-2.5 py-1 text-xs text-white"
                                  : "rounded-full border border-border px-2.5 py-1 text-xs hover:bg-muted"
                              }
                            >
                              {c.name}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {(
              [
                ["all", "Toutes"],
                ["live", "En cours"],
                ["scheduled", "Planifiées"],
                ["ended", "Terminées"],
              ] as const
            ).map(([key, label]) => (
              <Button
                key={key}
                size="sm"
                variant={filter === key ? "default" : "outline"}
                onClick={() => setFilter(key)}
              >
                {label}
              </Button>
            ))}
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : (
            <div className="grid gap-3">
              {filtered.map((m) => (
                <Card key={m.id}>
                  <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{m.title}</p>
                        <StatusPill status={m.status} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {audienceLabel(m.audience)} · {formatDate(m.createdAt)}
                        {m.hostName ? ` · ${m.hostName}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/meetings/${m.id}`}>
                        <Button size="sm">
                          <Video className="h-4 w-4" /> Rejoindre
                        </Button>
                      </Link>
                      {m.audience === "public" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void copyLink(m, "public")}
                        >
                          {copiedId === `${m.id}-public` ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                          Lien public
                        </Button>
                      ) : null}
                      {m.audience === "clients" || m.audience === "public" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void copyLink(m, "client")}
                        >
                          {copiedId === `${m.id}-client` ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Users className="h-4 w-4" />
                          )}
                          Lien client
                        </Button>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {!filtered.length ? (
                <Card>
                  <CardContent className="py-10 text-center text-sm text-muted-foreground">
                    {meetings.length
                      ? "Aucune réunion dans ce filtre."
                      : "Créez votre première réunion pour démarrer une visio."}
                  </CardContent>
                </Card>
              ) : null}
            </div>
          )}
        </div>
      </RequirePermission>
    </RequirePlan>
  );
}
