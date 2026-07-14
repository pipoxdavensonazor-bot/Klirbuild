"use client";

/**
 * Daily Prebuilt embedded room (iframe).
 * Works with real Daily tokens or simulated room URLs.
 */
export function DailyRoomEmbed({
  roomUrl,
  token,
  title,
  className,
}: {
  roomUrl: string;
  token?: string;
  title?: string;
  className?: string;
}) {
  const src = token
    ? `${roomUrl}${roomUrl.includes("?") ? "&" : "?"}t=${encodeURIComponent(token)}`
    : roomUrl;
  const showHint = Boolean(token?.startsWith("sim_"));

  return (
    <div
      className={
        className ?? "overflow-hidden rounded-lg border border-border bg-black"
      }
    >
      {showHint ? (
        <div className="border-b border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
          Mode démo Daily (ajoutez <code>DAILY_API_KEY</code> pour la vraie visio).
          Lien salle :{" "}
          <a
            href={roomUrl}
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            ouvrir
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
