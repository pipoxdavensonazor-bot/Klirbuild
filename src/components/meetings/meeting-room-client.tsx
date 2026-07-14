"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Radio } from "lucide-react";
import { RequirePermission } from "@/components/auth/require-permission";
import { RequirePlan } from "@/components/auth/require-plan";
import { DailyRoomEmbed } from "@/components/meetings/daily-room-embed";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiUrl } from "@/lib/api-client";
import { canApp } from "@/lib/workforce/types";
import { useSessionStore } from "@/lib/workforce/session";

type Meeting = {
  id: string;
  title: string;
  audience: string;
  status: string;
  slug: string;
  publicPath: string;
  clientPath: string;
  shareToken: string;
};

export function MeetingRoomClient({ meetingId }: { meetingId: string }) {
  const role = useSessionStore((s) => s.role);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [token, setToken] = useState<string>("");
  const [roomUrl, setRoomUrl] = useState<string>("");
  const [error, setError] = useState("");
  const canHost = canApp(role, "meetings:host");

  const join = useCallback(async () => {
    const meta = await fetch(apiUrl(`/api/meetings/${meetingId}`), {
      credentials: "include",
    });
    const metaData = await meta.json();
    if (!meta.ok) {
      setError(metaData.error || "Réunion introuvable.");
      return;
    }
    setMeeting(metaData.meeting);

    const res = await fetch(apiUrl(`/api/meetings/${meetingId}`), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "token" }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Impossible de rejoindre.");
      return;
    }
    setToken(data.token);
    setRoomUrl(data.roomUrl);
    setError("");
  }, [meetingId]);

  useEffect(() => {
    void join();
  }, [join]);

  async function setStatus(status: "live" | "ended") {
    await fetch(apiUrl(`/api/meetings/${meetingId}`), {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await join();
  }

  return (
    <RequirePlan feature="meetings">
      <RequirePermission permission="meetings:join">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Link
                href="/meetings"
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" /> Réunions
              </Link>
              <h1 className="mt-1 text-xl font-semibold">
                {meeting?.title || "Salle…"}
              </h1>
              {meeting ? (
                <p className="text-xs text-muted-foreground">
                  {meeting.status} · audience {meeting.audience}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {canHost ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void setStatus("live")}
                  >
                    Démarrer
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void setStatus("ended")}
                  >
                    Terminer
                  </Button>
                </>
              ) : null}
              {meeting?.audience === "public" ? (
                <Link href={meeting.publicPath} target="_blank">
                  <Button size="sm" variant="secondary">
                    <Radio className="h-4 w-4" /> Public
                  </Button>
                </Link>
              ) : null}
            </div>
          </div>

          {error ? (
            <Card>
              <CardContent className="py-6 text-sm text-destructive">
                {error}
              </CardContent>
            </Card>
          ) : roomUrl ? (
            <DailyRoomEmbed
              roomUrl={roomUrl}
              token={token}
              title={meeting?.title}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Connexion à la salle…</p>
          )}
        </div>
      </RequirePermission>
    </RequirePlan>
  );
}
