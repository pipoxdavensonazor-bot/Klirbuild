"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Megaphone, Radio, Zap } from "lucide-react";
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
  compact?: boolean;
  autoGoLive?: boolean;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function LiveSocialConnections({
  liveUrl,
  title,
  compact,
  autoGoLive,
}: Props) {
  const [destinations, setDestinations] = useState<LiveSocialDestination[]>([]);
  const [provider, setProvider] = useState<"zernio" | "postiz" | "in_app">(
    "in_app"
  );
  const [selected, setSelected] = useState<string[]>([]);
  const [busyPlatform, setBusyPlatform] = useState<string | null>(null);
  const [busyBulk, setBusyBulk] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [linking, setLinking] = useState<string | null>(null);
  const [accountName, setAccountName] = useState("");
  const [handle, setHandle] = useState("");
  const [rtmpUrl, setRtmpUrl] = useState("");
  const [streamKey, setStreamKey] = useState("");
  const pollAbortRef = useRef(0);

  const busy = Boolean(busyPlatform) || busyBulk;

  const syncAccounts = useCallback(async () => {
    const res = await fetch(apiUrl("/api/live/social"), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "sync_accounts" }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      // Sync may be unavailable for in_app — fall back to GET
      const list = await fetch(apiUrl("/api/live/social"), {
        credentials: "include",
      });
      const listData = await list.json().catch(() => ({}));
      return (listData.destinations ?? []) as LiveSocialDestination[];
    }
    return (data.destinations ?? []) as LiveSocialDestination[];
  }, []);

  const announcePlatforms = useCallback(
    async (platforms: string[]) => {
      if (!liveUrl) {
        setError("Démarrez le live pour obtenir un lien à partager.");
        return false;
      }
      if (!platforms.length) {
        setError("Choisissez au moins un réseau.");
        return false;
      }
      setMessage("");
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
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Publication impossible.");
        return false;
      }
      setError("");
      setMessage(
        data.simulated
          ? data.message
          : `Publié sur ${platforms.map((p) => LABELS[p] || p).join(", ")}.`
      );
      if (Array.isArray(data.destinations)) {
        setDestinations(data.destinations);
      }
      return true;
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
      setProvider(
        data.provider === "zernio" || data.provider === "postiz"
          ? data.provider
          : "in_app"
      );
      setSelected(
        dests.filter((d) => d.status === "connected").map((d) => d.platform)
      );
      setError("");
    } catch {
      setError("Réseau indisponible.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function waitForConnected(
    platform: string,
    popup: Window | null
  ): Promise<boolean> {
    const token = ++pollAbortRef.current;
    for (let i = 0; i < 60; i++) {
      if (token !== pollAbortRef.current) return false;
      if (popup && popup.closed && i > 2) {
        // Give one last sync after close
        const dests = await syncAccounts();
        setDestinations(dests);
        return dests.some(
          (d) => d.platform === platform && d.status === "connected"
        );
      }
      await sleep(2000);
      if (token !== pollAbortRef.current) return false;
      try {
        const dests = await syncAccounts();
        setDestinations(dests);
        if (
          dests.some(
            (d) => d.platform === platform && d.status === "connected"
          )
        ) {
          try {
            popup?.close();
          } catch {
            /* ignore */
          }
          return true;
        }
      } catch {
        /* keep polling */
      }
    }
    return false;
  }

  async function connectViaOauthPopup(platform: string) {
    const res = await fetch(apiUrl("/api/live/social"), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "oauth_url", platform }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (data.code === "USE_IN_APP_CONNECT") {
        setProvider("in_app");
        setLinking(platform);
        setAccountName("");
        setHandle("");
        return false;
      }
      setError(data.error || "Connexion impossible.");
      return false;
    }
    if (!data.oauthUrl) {
      setError("Connexion impossible pour le moment.");
      return false;
    }

    const popup = window.open(
      data.oauthUrl,
      "klir_social_oauth",
      "popup=yes,width=640,height=780"
    );
    if (!popup) {
      // Popup blocked — same-tab fallback, stay on KlirBuild after manual return
      setMessage(
        "Autorisez la fenêtre, puis revenez ici — la page se met à jour seule."
      );
      window.location.href = data.oauthUrl;
      return false;
    }

    setMessage(
      `Autorisez ${LABELS[platform] || platform} dans la fenêtre…`
    );
    const ok = await waitForConnected(platform, popup);
    if (!ok) {
      setError(
        `Connexion ${LABELS[platform] || platform} non terminée. Réessayez.`
      );
      return false;
    }
    setSelected((prev) =>
      prev.includes(platform) ? prev : [...prev, platform]
    );
    setMessage(`${LABELS[platform] || platform} connecté.`);
    return true;
  }

  /** One click: connect if needed, then publish when live. */
  async function oneClickNetwork(platform: string, connected: boolean) {
    setBusyPlatform(platform);
    setMessage("");
    setError("");
    try {
      let isConnected = connected;

      if (!isConnected) {
        if (provider === "in_app") {
          setLinking(platform);
          setAccountName("");
          setHandle("");
          return;
        }
        const linked = await connectViaOauthPopup(platform);
        if (!linked) return;
        isConnected = true;
      }

      if (autoGoLive && liveUrl && isConnected) {
        setMessage(`Publication sur ${LABELS[platform] || platform}…`);
        await announcePlatforms([platform]);
      } else if (isConnected) {
        setMessage(
          `${LABELS[platform] || platform} prêt. Lancez un live, puis recliquez pour publier.`
        );
      }
    } finally {
      setBusyPlatform(null);
    }
  }

  async function saveInAppConnect(platform: string) {
    setBusyPlatform(platform);
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
      if (autoGoLive && liveUrl) {
        await announcePlatforms([platform]);
      } else {
        setMessage(`${LABELS[platform] || platform} connecté.`);
      }
    } finally {
      setBusyPlatform(null);
    }
  }

  async function saveRtmp(platform: string) {
    setBusyPlatform(platform);
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
      setBusyPlatform(null);
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
          <p className="text-sm font-semibold">Publier le live sur vos réseaux</p>
          {!compact ? (
            <p className="text-xs text-muted-foreground">
              Un clic suffit : connectez la page de votre entreprise, puis
              publiez l’annonce du live.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {autoGoLive && liveUrl
                ? "Cliquez un réseau pour publier le live."
                : "Cliquez un réseau pour connecter votre page."}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {destinations.map((d) => {
          const connected = d.status === "connected";
          const goLiveNow = Boolean(connected && autoGoLive && liveUrl);
          const platformBusy = busyPlatform === d.platform;
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
                    variant={goLiveNow ? "default" : "outline"}
                    disabled={busy}
                    onClick={() => void oneClickNetwork(d.platform, connected)}
                  >
                    {goLiveNow ? (
                      <Zap className="mr-1 h-3.5 w-3.5" />
                    ) : null}
                    {platformBusy
                      ? "…"
                      : goLiveNow
                        ? "Publier"
                        : connected
                          ? "Prêt"
                          : "Connecter"}
                  </Button>
                  {!compact ? (
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
                      OBS
                    </Button>
                  ) : null}
                </div>
              </div>

              {linking === d.platform ? (
                <div className="mt-2 space-y-2 border-t border-border pt-2">
                  <p className="text-[11px] text-muted-foreground">
                    Nom de votre page / chaîne {LABELS[d.platform]}.
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
                      Confirmer
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
                    placeholder="URL RTMP (optionnel, pour OBS)"
                    value={rtmpUrl}
                    onChange={(e) => setRtmpUrl(e.target.value)}
                  />
                  <Input
                    type="password"
                    placeholder={
                      d.hasStreamKey
                        ? "Nouvelle clé de stream"
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
                    Enregistrer
                  </Button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {autoGoLive && liveUrl && selected.length > 1 ? (
        <Button
          type="button"
          className="w-full"
          disabled={busy || !selected.length}
          onClick={async () => {
            setBusyBulk(true);
            try {
              await announcePlatforms(selected);
            } finally {
              setBusyBulk(false);
            }
          }}
        >
          <Megaphone className="mr-2 h-4 w-4" />
          Publier sur tous les réseaux sélectionnés
        </Button>
      ) : null}

      {message ? (
        <p className="text-xs text-emerald-700 dark:text-emerald-300">{message}</p>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
