"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Megaphone, Radio, Square } from "lucide-react";
import { RequirePermission } from "@/components/auth/require-permission";
import { RequirePlan } from "@/components/auth/require-plan";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiUrl } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";

type FeedPost = {
  id: string;
  authorName: string;
  body: string;
  audience: string;
  createdAt: string;
  recordingUrl?: string;
  live: null | {
    id: string;
    status: string;
    publicPath: string;
    clientPath: string;
    slug: string;
  };
};

export function FeedPageClient() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [canPost, setCanPost] = useState(false);
  const [canLive, setCanLive] = useState(false);
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<"company" | "clients" | "public">(
    "company"
  );
  const [startLive, setStartLive] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(apiUrl("/api/feed"), { credentials: "include" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Chargement impossible.");
      return;
    }
    setPosts(data.posts ?? []);
    setCanPost(Boolean(data.canPost));
    setCanLive(Boolean(data.canLive));
    setError("");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function publish() {
    setBusy(true);
    try {
      const res = await fetch(apiUrl("/api/feed"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body,
          audience,
          startLive: startLive && canLive,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Publication impossible.");
        return;
      }
      setBody("");
      setStartLive(false);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function stopLive(liveId: string) {
    await fetch(apiUrl(`/api/live/${liveId}`), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "stop" }),
    });
    await load();
  }

  async function joinLive(liveId: string) {
    const res = await fetch(apiUrl(`/api/live/${liveId}`), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "token" }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Impossible de rejoindre le live.");
      return;
    }
    if (data.roomUrl) {
      const url = data.token
        ? `${data.roomUrl}${data.roomUrl.includes("?") ? "&" : "?"}t=${encodeURIComponent(data.token)}`
        : data.roomUrl;
      window.open(url, "_blank");
    }
  }

  return (
    <RequirePlan feature="meetings" title="Feed & live — plan Growth+">
      <RequirePermission permission="meetings:join">
        <div className="space-y-6">
          <PageHeader
            title="Feed & live"
            description="Publications d’équipe avec live streaming intégré. Audiences équipe, clients ou public."
          />

          {canPost ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Megaphone className="h-4 w-4" /> Nouveau post
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <textarea
                  className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Annonce chantier, update client…"
                />
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={audience}
                    onChange={(e) =>
                      setAudience(e.target.value as typeof audience)
                    }
                  >
                    <option value="company">Équipe</option>
                    <option value="clients">Clients</option>
                    <option value="public">Public</option>
                  </select>
                  {canLive ? (
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={startLive}
                        onChange={(e) => setStartLive(e.target.checked)}
                      />
                      Démarrer un live
                    </label>
                  ) : null}
                  <Button
                    disabled={busy || !body.trim()}
                    onClick={() => void publish()}
                  >
                    Publier
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="space-y-3">
            {posts.map((p) => (
              <Card key={p.id}>
                <CardContent className="space-y-3 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{p.authorName}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(p.createdAt)} · {p.audience}
                      </p>
                    </div>
                    {p.live?.status === "live" ? (
                      <span className="rounded bg-red-600 px-2 py-0.5 text-xs font-medium text-white">
                        LIVE
                      </span>
                    ) : null}
                  </div>
                  <p className="whitespace-pre-wrap text-sm">{p.body}</p>
                  {p.live ? (
                    <div className="flex flex-wrap gap-2">
                      {p.live.status === "live" ? (
                        <Button
                          size="sm"
                          onClick={() => void joinLive(p.live!.id)}
                        >
                          <Radio className="h-4 w-4" /> Rejoindre le live
                        </Button>
                      ) : null}
                      {canLive && p.live.status === "live" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void stopLive(p.live!.id)}
                        >
                          <Square className="h-4 w-4" /> Arrêter
                        </Button>
                      ) : null}
                      {p.audience === "public" ? (
                        <Link href={p.live.publicPath} target="_blank">
                          <Button size="sm" variant="secondary">
                            Lien public
                          </Button>
                        </Link>
                      ) : null}
                      {p.audience === "clients" ? (
                        <Link href={p.live.clientPath} target="_blank">
                          <Button size="sm" variant="secondary">
                            Lien client
                          </Button>
                        </Link>
                      ) : null}
                    </div>
                  ) : null}
                  {p.recordingUrl ? (
                    <a
                      href={p.recordingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-brand-600 hover:underline"
                    >
                      Voir le replay
                    </a>
                  ) : null}
                </CardContent>
              </Card>
            ))}
            {!posts.length ? (
              <p className="text-sm text-muted-foreground">
                Aucun post pour l’instant.
              </p>
            ) : null}
          </div>
        </div>
      </RequirePermission>
    </RequirePlan>
  );
}
