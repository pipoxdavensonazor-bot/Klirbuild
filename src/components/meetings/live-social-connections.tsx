"use client";

import { useCallback, useEffect, useState } from "react";
import { Link2, Megaphone, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiUrl } from "@/lib/api-client";
import type { LiveSocialDestination } from "@/lib/meetings/live-social";

const LABELS: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
};

type Props = {
  liveUrl?: string;
  title?: string;
  /** Compact mode for meeting room side panel */
  compact?: boolean;
};

export function LiveSocialConnections({ liveUrl, title, compact }: Props) {
  const [destinations, setDestinations] = useState<LiveSocialDestination[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [rtmpUrl, setRtmpUrl] = useState("");
  const [streamKey, setStreamKey] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/api/live/social"), {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Chargement des comptes impossible.");
        return;
      }
      setDestinations(data.destinations ?? []);
      setSelected(
        (data.destinations ?? [])
          .filter((d: LiveSocialDestination) => d.status === "connected")
          .map((d: LiveSocialDestination) => d.platform)
      );
      setError("");
    } catch {
      setError("Réseau indisponible.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function connect(platform: string) {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(apiUrl("/api/live/social"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "oauth_url", platform }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Connexion impossible.");
        return;
      }
      if (data.oauthUrl) {
        window.location.href = data.oauthUrl;
        return;
      }
      setError("URL OAuth manquante.");
    } finally {
      setBusy(false);
    }
  }

  async function saveRtmp(platform: string) {
    setBusy(true);
    try {
      const res = await fetch(apiUrl("/api/live/social"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_rtmp",
          platform,
          rtmpUrl,
          streamKey,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Enregistrement impossible.");
        return;
      }
      setDestinations(data.destinations ?? []);
      setEditing(null);
      setStreamKey("");
      setMessage(`Clé Live enregistrée pour ${LABELS[platform] || platform}.`);
    } finally {
      setBusy(false);
    }
  }

  async function announce() {
    if (!liveUrl) {
      setError("Démarrez le live pour obtenir un lien à partager.");
      return;
    }
    if (!selected.length) {
      setError("Sélectionnez au moins un réseau connecté.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(apiUrl("/api/live/social"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "announce",
          platforms: selected,
          liveUrl,
          title: title || "Live",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Publication impossible.");
        return;
      }
      setError("");
      setMessage(
        data.simulated
          ? data.message
          : `Annonce live publiée sur ${selected.length} réseau(x).`
      );
    } finally {
      setBusy(false);
    }
  }

  function toggle(platform: string) {
    setSelected((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2">
        <Radio className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
        <div>
          <p className="text-sm font-semibold">
            Diffuser / annoncer sur les réseaux
          </p>
          {!compact ? (
            <p className="text-xs text-muted-foreground">
              Connectez les comptes <strong>entreprise</strong> YouTube,
              Facebook, TikTok et Instagram. Ajoutez la clé RTMP pour OBS /
              encodeur, puis annoncez le lien du live.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Comptes entreprise pour le live.
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {destinations.map((d) => {
          const connected = d.status === "connected";
          return (
            <div
              key={d.platform}
              className="rounded-lg border border-border bg-background px-3 py-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="flex min-w-0 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="rounded border-border"
                    disabled={!connected}
                    checked={selected.includes(d.platform)}
                    onChange={() => toggle(d.platform)}
                  />
                  <span className="font-medium">
                    {LABELS[d.platform] || d.platform}
                  </span>
                  {connected ? (
                    <span className="truncate text-xs text-emerald-700 dark:text-emerald-300">
                      {d.accountName || d.handle || "Connecté"}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      Non connecté
                    </span>
                  )}
                </label>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant={connected ? "outline" : "default"}
                    disabled={busy}
                    onClick={() => void connect(d.platform)}
                  >
                    <Link2 className="mr-1 h-3.5 w-3.5" />
                    {connected ? "Reconnecter" : "Connecter"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => {
                      setEditing(editing === d.platform ? null : d.platform);
                      setRtmpUrl(d.rtmpUrl || "");
                      setStreamKey("");
                    }}
                  >
                    RTMP
                  </Button>
                </div>
              </div>
              {editing === d.platform ? (
                <div className="mt-2 space-y-2 border-t border-border pt-2">
                  <Input
                    placeholder="URL RTMP (ex. rtmps://a.rtmp.youtube.com/live2)"
                    value={rtmpUrl}
                    onChange={(e) => setRtmpUrl(e.target.value)}
                  />
                  <Input
                    type="password"
                    placeholder={
                      d.hasStreamKey
                        ? "Nouvelle clé de stream (laisser vide pour garder)"
                        : "Clé de stream Live"
                    }
                    value={streamKey}
                    onChange={(e) => setStreamKey(e.target.value)}
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={busy}
                    onClick={() => void saveRtmp(d.platform)}
                  >
                    Enregistrer la clé Live
                  </Button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <Button
        type="button"
        className="w-full"
        disabled={busy || !liveUrl || !selected.length}
        onClick={() => void announce()}
      >
        <Megaphone className="mr-2 h-4 w-4" />
        Annoncer le live sur les réseaux sélectionnés
      </Button>

      {message ? (
        <p className="text-xs text-emerald-700 dark:text-emerald-300">{message}</p>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
