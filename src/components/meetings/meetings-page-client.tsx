"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Radio, Users, Video } from "lucide-react";
import { RequirePermission } from "@/components/auth/require-permission";
import { RequirePlan } from "@/components/auth/require-plan";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiUrl } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";

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
  createdAt: string;
};

export function MeetingsPageClient() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [canHost, setCanHost] = useState(false);
  const [dailyConfigured, setDailyConfigured] = useState(false);
  const [title, setTitle] = useState("");
  const [audience, setAudience] = useState<"company" | "clients" | "public">(
    "company"
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(apiUrl("/api/meetings"), { credentials: "include" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Impossible de charger les réunions.");
      return;
    }
    setMeetings(data.meetings ?? []);
    setCanHost(Boolean(data.canHost));
    setDailyConfigured(Boolean(data.dailyConfigured));
    setError("");
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
        body: JSON.stringify({ title, audience }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Création impossible.");
        return;
      }
      setTitle("");
      await load();
      if (data.meeting?.id) {
        window.location.href = `/meetings/${data.meeting.id}`;
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <RequirePlan feature="meetings" title="Réunions — plan Growth+">
      <RequirePermission permission="meetings:join">
        <div className="space-y-6">
          <PageHeader
            title="Réunions"
            description="Visio native KlirBuild (Daily). Audiences équipe, clients ou public."
          />

          {!dailyConfigured ? (
            <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
              Configurez <code>DAILY_API_KEY</code> et{" "}
              <code>NEXT_PUBLIC_DAILY_DOMAIN</code> sur Netlify pour activer la
              vraie visio. Les salles démo restent disponibles.
            </p>
          ) : null}

          {canHost ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Plus className="h-4 w-4" /> Nouvelle réunion
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-muted-foreground">Titre</label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Stand-up chantier"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Audience</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm sm:w-40"
                    value={audience}
                    onChange={(e) =>
                      setAudience(e.target.value as typeof audience)
                    }
                  >
                    <option value="company">Équipe</option>
                    <option value="clients">Clients</option>
                    <option value="public">Public</option>
                  </select>
                </div>
                <Button disabled={busy || !title.trim()} onClick={() => void create()}>
                  <Video className="h-4 w-4" /> Créer
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}

          <div className="grid gap-3">
            {meetings.map((m) => (
              <Card key={m.id}>
                <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{m.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {m.status} · {m.audience} · {formatDate(m.createdAt)}
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
                      <Link href={m.publicPath} target="_blank">
                        <Button size="sm" variant="outline">
                          <Radio className="h-4 w-4" /> Lien public
                        </Button>
                      </Link>
                    ) : null}
                    {m.audience === "clients" ? (
                      <Link href={m.clientPath} target="_blank">
                        <Button size="sm" variant="outline">
                          <Users className="h-4 w-4" /> Lien client
                        </Button>
                      </Link>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
            {!meetings.length ? (
              <p className="text-sm text-muted-foreground">
                Aucune réunion pour le moment.
              </p>
            ) : null}
          </div>
        </div>
      </RequirePermission>
    </RequirePlan>
  );
}
