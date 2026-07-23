"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, Copy, Megaphone, Radio, Square, Video, X } from "lucide-react";
import { RequirePermission } from "@/components/auth/require-permission";
import { RequirePlan } from "@/components/auth/require-plan";
import { DailyRoomEmbed } from "@/components/meetings/daily-room-embed";
import { LiveSocialConnections } from "@/components/meetings/live-social-connections";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiUrl } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";
import {
  absoluteAppPath,
  audienceLabel,
  copyText,
  type MeetingAudience,
} from "@/lib/meetings/ui";

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

type ClientOpt = { id: string; name: string };

export function FeedPageClient() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [clients, setClients] = useState<ClientOpt[]>([]);
  const [canPost, setCanPost] = useState(false);
  const [canLive, setCanLive] = useState(false);
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<MeetingAudience>("company");
  const [clientIds, setClientIds] = useState<string[]>([]);
  const [startLive, setStartLive] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeLive, setActiveLive] = useState<{
    id: string;
    roomUrl: string;
    token: string;
    title: string;
    publicPath?: string;
  } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [fRes, cRes] = await Promise.all([
        fetch(apiUrl("/api/feed"), { credentials: "include" }),
        fetch(apiUrl("/api/clients"), { credentials: "include" }),
      ]);
      const data = await fRes.json();
      const cData = await cRes.json().catch(() => ({}));
      if (!fRes.ok) {
        setError(data.error || "Chargement impossible.");
        return;
      }
      setPosts(data.posts ?? []);
      setCanPost(Boolean(data.canPost));
      setCanLive(Boolean(data.canLive));
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
          clientIds: audience === "clients" ? clientIds : [],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Publication impossible.");
        return;
      }
      setBody("");
      setStartLive(false);
      setClientIds([]);
      await load();
      if (data.post?.live?.id && data.post.live.status === "live") {
        await joinLive(data.post.live.id, data.post.body?.slice(0, 60));
      }
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
    if (activeLive?.id === liveId) setActiveLive(null);
    await load();
  }

  async function joinLive(liveId: string, title?: string) {
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
    setActiveLive({
      id: liveId,
      roomUrl: data.roomUrl,
      token: data.token,
      title: title || "Live",
      publicPath:
        typeof data.live?.publicPath === "string"
          ? data.live.publicPath
          : undefined,
    });
    setError("");
  }

  async function copyPath(path: string, key: string) {
    const ok = await copyText(absoluteAppPath(path));
    if (ok) {
      setCopied(key);
      setTimeout(() => setCopied(null), 1800);
    }
  }

  return (
    <RequirePlan feature="meetings" title="Feed & live — plan Growth+">
      <RequirePermission permission="meetings:join">
        <div className="space-y-6">
          <PageHeader
            title="Feed & live"
            description="Annonces d’équipe avec live intégré. Partagez un lien clients ou public."
            actions={
              <Link href="/meetings">
                <Button variant="outline" size="sm">
                  <Video className="h-4 w-4" /> Réunions
                </Button>
              </Link>
            }
          />

          {activeLive ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className="rounded bg-red-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                    LIVE
                  </span>
                  {activeLive.title}
                </CardTitle>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setActiveLive(null)}
                >
                  <X className="h-4 w-4" /> Fermer
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <DailyRoomEmbed
                  roomUrl={activeLive.roomUrl}
                  token={activeLive.token}
                  title={activeLive.title}
                  meetingId={activeLive.id}
                />
                {canLive ? (
                  <LiveSocialConnections
                    title={activeLive.title}
                    liveUrl={
                      activeLive.publicPath
                        ? absoluteAppPath(activeLive.publicPath)
                        : undefined
                    }
                  />
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {canLive && !activeLive ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Comptes entreprise pour le live
                </CardTitle>
              </CardHeader>
              <CardContent>
                <LiveSocialConnections />
              </CardContent>
            </Card>
          ) : null}

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
                  placeholder="Annonce chantier, mise à jour client…"
                />
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={audience}
                    onChange={(e) =>
                      setAudience(e.target.value as MeetingAudience)
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
                {audience === "clients" ? (
                  <div className="flex max-h-28 flex-wrap gap-2 overflow-y-auto rounded-md border border-border p-2">
                    {clients.map((c) => {
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
                    })}
                    {!clients.length ? (
                      <span className="text-xs text-muted-foreground">
                        Aucun client CRM.
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          {loading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : (
            <div className="space-y-3">
              {posts.map((p) => (
                <Card key={p.id}>
                  <CardContent className="space-y-3 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{p.authorName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(p.createdAt)} · {audienceLabel(p.audience)}
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
                            onClick={() =>
                              void joinLive(p.live!.id, p.body.slice(0, 60))
                            }
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
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              void copyPath(p.live!.publicPath, `${p.id}-pub`)
                            }
                          >
                            {copied === `${p.id}-pub` ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                            Lien public
                          </Button>
                        ) : null}
                        {p.audience === "clients" || p.audience === "public" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              void copyPath(p.live!.clientPath, `${p.id}-cli`)
                            }
                          >
                            {copied === `${p.id}-cli` ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                            Lien client
                          </Button>
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
                <Card>
                  <CardContent className="py-10 text-center text-sm text-muted-foreground">
                    Aucun post pour l’instant. Publiez une annonce ou démarrez
                    un live.
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
