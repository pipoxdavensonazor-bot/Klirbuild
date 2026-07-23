"use client";

/**
 * Daily Prebuilt / Jitsi embedded room.
 * Sans DAILY_API_KEY → Jitsi Meet (gratuit, free-for.dev).
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
  const isJitsi = /jit\.si|jitsi|ffmuc\.net|meet\./i.test(roomUrl) && !/daily\.co/i.test(roomUrl);
  const showHint = Boolean(token?.startsWith("sim_")) || isJitsi;

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

  return (
    <div
      className={
        className ?? "overflow-hidden rounded-lg border border-border bg-black"
      }
    >
      {showHint ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs text-sky-950 dark:text-sky-100">
          <span>
            {isJitsi ? (
              <>
                Visio <strong>Jitsi</strong> (gratuite, opérationnelle). Daily.co
                optionnel pour marque blanche / enregistrement cloud.
              </>
            ) : (
              <>
                Mode démo Daily — ajoutez <code>DAILY_API_KEY</code> pour le
                domaine natif.
              </>
            )}
          </span>
          <a
            href={roomUrl}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 rounded bg-sky-700 px-2 py-1 font-medium text-white hover:bg-sky-800"
          >
            Ouvrir en plein écran
          </a>
        </div>
      ) : null}
      <iframe
        title={title || "Réunion KlirBuild"}
        src={src}
        allow="camera; microphone; fullscreen; display-capture; autoplay"
        className="aspect-video w-full min-h-[360px] border-0 bg-black"
      />
    </div>
  );
}
