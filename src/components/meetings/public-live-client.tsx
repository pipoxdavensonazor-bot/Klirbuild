"use client";

import { useCallback, useEffect, useState } from "react";
import { DailyRoomEmbed } from "@/components/meetings/daily-room-embed";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiUrl } from "@/lib/api-client";
import { KlirBuildLogo } from "@/components/brand/klirline-logo";

export function PublicLiveClient({ slug }: { slug: string }) {
  const [title, setTitle] = useState("Live KlirBuild");
  const [userName, setUserName] = useState("");
  const [roomUrl, setRoomUrl] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [joined, setJoined] = useState(false);

  const loadMeta = useCallback(async () => {
    const res = await fetch(apiUrl(`/api/public/live/${slug}`));
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Live introuvable.");
      return;
    }
    setTitle(
      data.live?.title || data.meeting?.title || "Live public KlirBuild"
    );
  }, [slug]);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  async function join() {
    const res = await fetch(apiUrl(`/api/public/live/${slug}`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userName: userName || "Spectateur" }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Impossible de rejoindre.");
      return;
    }
    setRoomUrl(data.roomUrl);
    setToken(data.token);
    setJoined(true);
    setError("");
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,#12355B_0%,#0A1C31_55%,#06101C_100%)] px-4 py-10 text-white">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-3">
          <KlirBuildLogo className="h-10 w-auto" />
          <div>
            <p className="text-xs uppercase tracking-wide text-white/60">
              Live public
            </p>
            <h1 className="text-2xl font-semibold">{title}</h1>
          </div>
        </div>

        {error ? (
          <p className="rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm">
            {error}
          </p>
        ) : null}

        {!joined ? (
          <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1">
              <label className="text-xs text-white/70">Votre nom</label>
              <Input
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Spectateur"
                className="bg-white/10 text-white placeholder:text-white/40"
              />
            </div>
            <Button onClick={() => void join()}>Rejoindre</Button>
          </div>
        ) : roomUrl ? (
          <DailyRoomEmbed roomUrl={roomUrl} token={token} title={title} />
        ) : null}
      </div>
    </div>
  );
}
