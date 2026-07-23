"use client";

import { useEffect, useRef } from "react";
import { ExternalLink, Video } from "lucide-react";

/**
 * Daily Prebuilt embed, or Jitsi standalone join (public Jitsi blocks iframes).
 * Sans DAILY_API_KEY → Jitsi Meet (gratuit) ouvert dans un nouvel onglet.
 */
export function DailyRoomEmbed({
  roomUrl,
  token,
  title,
  className,
  displayName,
}: {
  roomUrl: string;
  token?: string;
  title?: string;
  className?: string;
  displayName?: string;
}) {
  const isJitsi =
    /jit\.si|jitsi|ffmuc\.net/i.test(roomUrl) && !/daily\.co/i.test(roomUrl);
  const isSimulatedDaily = Boolean(token?.startsWith("sim_")) && !isJitsi;
  const openedRef = useRef(false);

  let src = token
    ? `${roomUrl}${roomUrl.includes("?") ? "&" : "?"}t=${encodeURIComponent(token)}`
    : roomUrl;

  if (isJitsi) {
    const name = encodeURIComponent(displayName || "KlirBuild");
    const hash = [
      "config.prejoinConfig.enabled=false",
      "config.startWithAudioMuted=false",
      "config.startWithVideoMuted=false",
      "config.disableDeepLinking=true",
      `userInfo.displayName="${name}"`,
    ].join("&");
    src = `${roomUrl.split("#")[0]}#${hash}`;
  }

  // Public Jitsi sets CSP frame-ancestors / X-Frame-Options — iframe = écran noir.
  useEffect(() => {
    if (!isJitsi || openedRef.current || typeof window === "undefined") return;
    openedRef.current = true;
    const win = window.open(src, "_blank", "noopener,noreferrer");
    if (!win) {
      // Popup blocked — user must click the button.
      openedRef.current = false;
    }
  }, [isJitsi, src]);

  if (isJitsi) {
    return (
      <div
        className={
          className ??
          "overflow-hidden rounded-lg border border-border bg-gradient-to-b from-sky-50 to-white dark:from-sky-950/40 dark:to-background"
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs text-sky-950 dark:text-sky-100">
          <span>
            Visio <strong>Jitsi</strong> (gratuite). Les serveurs publics
            bloquent l’intégration iframe — la caméra s’ouvre dans un nouvel
            onglet.
          </span>
        </div>
        <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 px-6 py-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sky-600/15 text-sky-700 dark:text-sky-300">
            <Video className="h-7 w-7" />
          </div>
          <div className="max-w-md space-y-1">
            <p className="text-base font-semibold">
              {title ? `Rejoindre « ${title} »` : "Rejoindre la réunion"}
            </p>
            <p className="text-sm text-muted-foreground">
              Autorisez la caméra et le micro dans l’onglet Jitsi. Si rien ne
              s’est ouvert, cliquez ci-dessous (bloqueur de pop-up).
            </p>
          </div>
          <a
            href={src}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-brand-500 px-6 text-sm font-medium text-white shadow-soft hover:bg-brand-600"
          >
            <ExternalLink className="h-4 w-4" />
            Ouvrir avec caméra
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      className={
        className ?? "overflow-hidden rounded-lg border border-border bg-black"
      }
    >
      {isSimulatedDaily ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-100">
          <span>
            Mode démo Daily — ajoutez <code>DAILY_API_KEY</code> pour le domaine
            natif (caméra intégrée).
          </span>
          <a
            href={roomUrl}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 rounded bg-amber-700 px-2 py-1 font-medium text-white hover:bg-amber-800"
          >
            Ouvrir en plein écran
          </a>
        </div>
      ) : null}
      <iframe
        title={title || "Réunion KlirBuild"}
        src={src}
        allow="camera *; microphone *; fullscreen *; display-capture *; autoplay *"
        referrerPolicy="no-referrer-when-downgrade"
        className="aspect-video w-full min-h-[360px] border-0 bg-black"
      />
    </div>
  );
}
