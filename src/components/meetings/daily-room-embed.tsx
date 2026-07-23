"use client";

import { NativeMeetingRoom } from "@/components/meetings/native-meeting-room";

/**
 * Daily Prebuilt iframe when Daily is configured.
 * Otherwise: native in-page WebRTC room (stays inside KlirBuild — same desk).
 */
export function DailyRoomEmbed({
  roomUrl,
  token,
  title,
  className,
  displayName,
  meetingId,
}: {
  roomUrl: string;
  token?: string;
  title?: string;
  className?: string;
  displayName?: string;
  /** Required for native in-page room when Daily is not configured */
  meetingId?: string;
}) {
  const isRealDaily =
    /daily\.co/i.test(roomUrl) && !token?.startsWith("sim_");

  if (!isRealDaily && meetingId) {
    return (
      <NativeMeetingRoom
        meetingId={meetingId}
        displayName={displayName}
        title={title}
        className={className}
      />
    );
  }

  if (!isRealDaily) {
    return (
      <div
        className={
          className ??
          "rounded-lg border border-border bg-muted/40 px-4 py-10 text-center text-sm text-muted-foreground"
        }
      >
        Salle native indisponible (identifiant de réunion manquant).
      </div>
    );
  }

  const src = token
    ? `${roomUrl}${roomUrl.includes("?") ? "&" : "?"}t=${encodeURIComponent(token)}`
    : roomUrl;

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
