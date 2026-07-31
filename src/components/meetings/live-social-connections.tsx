"use client";

import { useCallback, useEffect, useState } from "react";
import { Link2, Megaphone, Radio, Zap } from "lucide-react";
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

const PENDING_KEY = "klir_live_social_pending";

type PendingAnnounce = {
  platforms: string[];
  liveUrl: string;
  title: string;
};

type Props = {
  liveUrl?: string;
  title?: string;
  compact?: boolean;
  autoGoLive?: boolean;
};

export function LiveSocialConnections({
  liveUrl,
  title,
  compact,
  autoGoLive,
}: Props) {
  const [destinations, setDestinations] = useState<LiveSocialDestination[]>([]);
  const [provider, setProvider] = useState<"zernio" | "in_app">("in_app");
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [linking, setLinking] = useState<string | null>(null);
  const [accountName, setAccountName] = useState("");
  const [handle, setHandle] = useState("");
  const [rtmpUrl, setRtmpUrl] = useState("");
  const [streamKey, setStreamKey] = useState("");

  const announcePlatforms = useCallback(
    async (platforms: string[]) => {
      if (!liveUrl) {
        setError("Démarrez le live pour obtenir un lien à partager.");
        return false;
      }
      if (!platforms.length) {
        setError("Sélectionnez au moins un réseau connecté.");
        return false;
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
            platforms,
            liveUrl,
            title: title || "Live",
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Publication impossible.");
          return false;
        }
        setError("");
        setMessage(
          data.simulated
            ? data.message
            : `Live diffusé / annoncé sur ${platforms
                .map((p) => LABELS[p] || p)
                .join(", ")}.`
        );
        return true;
      } finally {
        setBusy(false);
      }
    },
    [liveUrl, title]
  );

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
      const dests: LiveSocialDestination[] = data.destinations ?? [];
      setDestinations(dests);
      setProvider(data.provider === "zernio" ? "zernio" : "in_app");
      setSelected(
        dests
          .filter((d) => d.status === "connected")
          .map((d) => d.platform)
      );
      setError("");

      if (autoGoLive && liveUrl && typeof window !== "undefined") {
        const raw = sessionStorage.getItem(PENDING_KEY);
        if (raw) {
          sessionStorage.removeItem(PENDING_KEY);
          try {
            const pending = JSON.parse(raw) as PendingAnnounce;
            const ready = pending.platforms.filter((p) =>
              dests.some((d) => d.platform === p && d.status === "connected")
            );
            if (ready.length && pending.liveUrl === liveUrl) {
              void announcePlatforms(ready);
            }
          } catch {
            /* ignore */
          }
        }
      }
    } catch {
      setError("Réseau indisponible.");
    }
  }, [announcePlatforms, autoGoLive, liveUrl]);

  useEffect(() => {
    void load();
  }, [load]);

  async function connectOrGoLive(platform: string, connected: boolean) {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      if (connected && autoGoLive && liveUrl) {
        await announcePlatforms([platform]);
        return;
      }

      // In-app link (no klirline.ca redirect)
      if (provider !== "zernio") {
        setLinking(platform);
        setAccountName("");
        setHandle("");
        return;
      }

      const res = await fetch(apiUrl("/api/live/social"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "oauth_url", platform }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "USE_IN_APP_CONNECT") {
          setProvider("in_app");
          setLinking(platform);
          setAccountName("");
          setHandle("");
          return;
        }
        setError(data.error || "Connexion impossible.");
        return;
      }
      if (data.oauthUrl) {
        if (autoGoLive && liveUrl) {
          sessionStorage.setItem(
            PENDING_KEY,
            JSON.stringify({
              platforms: [platform],
              liveUrl,
              title: title || "Live",
            } satisfies PendingAnnounce)
          );
        }
        window.location.href = data.oauthUrl;
        return;
      }
      setError("URL OAuth manquante.");
    } finally {
      setBusy(false);
    }
  }

  async function saveInAppConnect(platform: string) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(apiUrl("/api/live/social"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "connect_account",
          platform,
          accountName: accountName || LABELS[platform] || platform,
          handle,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Liaison impossible.");
        return;
      }
      setDestinations(data.destinations ?? []);
      setSelected((prev) =>
        prev.includes(platform) ? prev : [...prev, platform]
      );
      setLinking(null);
      setMessage(`${LABELS[platform] || platform} lié.`);
      if (autoGoLive && liveUrl) {
        await announcePlatforms([platform]);
      }
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
              Liez vos pages entreprise YouTube, Facebook, TikTok et Instagram.
              {provider === "zernio"
                ? " Connexion OAuth via Zernio."
                : " Saisissez le nom de la page ici (plus de redirection klirline.ca)."}{" "}
              Pendant un live, <strong>Diffuser</strong> annonce automatiquement
              le lien.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {autoGoLive && liveUrl
                ? "Compte lié → Diffuser. Sinon → lier la page."
                : "Comptes entreprise pour le live."}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {destinations.map((d) => {
          const connected = d.status === "connected";
          const goLiveNow = Boolean(connected && autoGoLive && liveUrl);
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
                    variant={
                      goLiveNow ? "default" : connected ? "outline" : "default"
                    }
                    disabled={busy}
                    onClick={() => void connectOrGoLive(d.platform, connected)}
                  >
                    {goLiveNow ? (
                      <Zap className="mr-1 h-3.5 w-3.5" />
                    ) : (
                      <Link2 className="mr-1 h-3.5 w-3.5" />
                    )}
                    {goLiveNow
                      ? "Diffuser"
                      : connected
                        ? provider === "zernio"
                          ? "Reconnecter"
                          : "Modifier"
                        : "Connecter"}
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

              {linking === d.platform ? (
                <div className="mt-2 space-y-2 border-t border-border pt-2">
                  <p className="text-[11px] text-muted-foreground">
                    Nom de la page / chaîne sur {LABELS[d.platform]} (comme sur le
                    réseau). Ajoutez ensuite la clé RTMP pour OBS si besoin.
                  </p>
                  <Input
                    placeholder={`Nom de la page ${LABELS[d.platform]}`}
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                  />
                  <Input
                    placeholder="@handle (optionnel)"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={busy || !accountName.trim()}
                      onClick={() => void saveInAppConnect(d.platform)}
                    >
                      Lier le compte
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => setLinking(null)}
                    >
                      Annuler
                    </Button>
                  </div>
                </div>
              ) : null}

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
                  <p className="text-[11px] text-muted-foreground">
                    YouTube Studio → En direct → Encodeur / Meta Live Producer /
                    TikTok Live.
                  </p>
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
        onClick={() => void announcePlatforms(selected)}
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
