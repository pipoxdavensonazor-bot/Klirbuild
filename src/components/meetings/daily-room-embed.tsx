"use client";

import { useEffect, useMemo, useRef } from "react";
import { ExternalLink, Video } from "lucide-react";

const JITSI_HOST =
  (typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_JITSI_HOST?.trim().replace(/\/$/, "")) ||
  "meet.ffmuc.net";

function roomNameFromUrl(roomUrl: string) {
  try {
    const path = new URL(roomUrl).pathname.replace(/^\//, "");
    return path.split("/")[0] || "room";
  } catch {
    return "room";
  }
}

function toJitsiUrl(roomUrl: string, displayName?: string) {
  const raw = roomNameFromUrl(roomUrl).replace(/^KlirBuild-/i, "");
  const name = encodeURIComponent(displayName || "KlirBuild");
  const hash = [
    "config.prejoinConfig.enabled=false",
    "config.startWithAudioMuted=false",
    "config.startWithVideoMuted=false",
    "config.disableDeepLinking=true",
    `userInfo.displayName="${name}"`,
  ].join("&");
  return `https://${JITSI_HOST}/KlirBuild-${raw}#${hash}`;
}

/**
 * Daily Prebuilt embed, or Jitsi standalone join (public Jitsi blocks iframes).
 * Sans DAILY_API_KEY → Jitsi Meet (gratuit) dans un nouvel onglet — pas de mode démo.
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
  const looksDaily = /daily\.co/i.test(roomUrl);
  const looksJitsi =
    /jit\.si|jitsi|ffmuc\.net/i.test(roomUrl) && !looksDaily;
  const simulated = Boolean(token?.startsWith("sim_"));

  // Any simulated / stale Daily URL → force Jitsi (Daily is optional, not a broken demo).
  const useJitsi = looksJitsi || simulated || looksDaily;

  const src = useMemo(() => {
    if (useJitsi) return toJitsiUrl(roomUrl, displayName);
    if (!token) return roomUrl;
    return `${roomUrl}${roomUrl.includes("?") ? "&" : "?"}t=${encodeURIComponent(token)}`;
  }, [useJitsi, roomUrl, displayName, token]);

  const openedRef = useRef(false);

  useEffect(() => {
    if (!useJitsi || openedRef.current || typeof window === "undefined") return;
    openedRef.current = true;
    const win = window.open(src, "_blank", "noopener,noreferrer");
    if (!win) openedRef.current = false;
  }, [useJitsi, src]);

  if (useJitsi) {
    return (
      <div
        className={
          className ??
          "overflow-hidden rounded-lg border border-border bg-gradient-to-b from-sky-50 to-white dark:from-sky-950/40 dark:to-background"
        }
      >
        <div className="border-b border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs text-sky-950 dark:text-sky-100">
          Visio <strong>Jitsi</strong> — la caméra s’ouvre dans un nouvel
          onglet (les serveurs publics bloquent l’iframe).
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
              Autorisez caméra et micro dans l’onglet Jitsi. Si rien ne
              s’ouvre, utilisez le bouton (bloqueur de pop-up).
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
