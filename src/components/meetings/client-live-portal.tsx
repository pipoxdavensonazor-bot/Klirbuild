"use client";

import { useCallback, useEffect, useState } from "react";
import { DailyRoomEmbed } from "@/components/meetings/daily-room-embed";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiUrl } from "@/lib/api-client";
import { KlirBuildLogo } from "@/components/brand/klirline-logo";
import { formatDate } from "@/lib/utils";

type FeedItem = {
  id: string;
  authorName: string;
  body: string;
  createdAt: string;
  recordingUrl?: string;
  live?: { status: string; id: string } | null;
};

export function ClientLivePortal({ token }: { token: string }) {
  const [title, setTitle] = useState("Espace client");
  const [userName, setUserName] = useState("");
  const [clientId, setClientId] = useState("");
  const [roomUrl, setRoomUrl] = useState("");
  const [joinToken, setJoinToken] = useState("");
  const [posts, setPosts] = useState<FeedItem[]>([]);
  const [error, setError] = useState("");
  const [joined, setJoined] = useState(false);

  const load = useCallback(async () => {
    const q = clientId
      ? `?clientId=${encodeURIComponent(clientId)}`
      : "";
    const res = await fetch(apiUrl(`/api/public/client-live/${token}${q}`));
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Lien invalide.");
      return;
    }
    setTitle(
      data.live?.title || data.meeting?.title || "Réunion / live client"
    );
    if (data.feed?.posts) setPosts(data.feed.posts);
    setError("");
  }, [token, clientId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function join() {
    const res = await fetch(apiUrl(`/api/public/client-live/${token}`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userName: userName || "Client" }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Impossible de rejoindre.");
      return;
    }
    setRoomUrl(data.roomUrl);
    setJoinToken(data.token);
    setJoined(true);
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 dark:bg-slate-950">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-3">
          <KlirBuildLogo className="h-10 w-auto" />
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Portail client
            </p>
            <h1 className="text-2xl font-semibold">{title}</h1>
          </div>
        </div>

        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : null}

        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1">
            <label className="text-xs text-muted-foreground">Votre nom</label>
            <Input
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Nom"
            />
          </div>
          <div className="flex-1 space-y-1">
            <label className="text-xs text-muted-foreground">
              ID client (optionnel)
            </label>
            <Input
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="Pour filtrer le feed"
            />
          </div>
          {!joined ? (
            <Button onClick={() => void join()}>Rejoindre la salle</Button>
          ) : (
            <Button variant="outline" onClick={() => void load()}>
              Rafraîchir le feed
            </Button>
          )}
        </div>

        {joined && roomUrl ? (
          <DailyRoomEmbed roomUrl={roomUrl} token={joinToken} title={title} />
        ) : null}

        {posts.length ? (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Mises à jour
            </h2>
            {posts.map((p) => (
              <div
                key={p.id}
                className="rounded-lg border border-border bg-card p-4"
              >
                <p className="text-xs text-muted-foreground">
                  {p.authorName} · {formatDate(p.createdAt)}
                  {p.live?.status === "live" ? " · LIVE" : ""}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm">{p.body}</p>
                {p.recordingUrl ? (
                  <a
                    href={p.recordingUrl}
                    className="mt-2 inline-block text-sm text-brand-600 hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Replay
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
