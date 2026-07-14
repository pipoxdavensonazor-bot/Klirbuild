"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Copy, Radio, Users } from "lucide-react";
import { RequirePermission } from "@/components/auth/require-permission";
import { RequirePlan } from "@/components/auth/require-plan";
import { DailyRoomEmbed } from "@/components/meetings/daily-room-embed";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiUrl } from "@/lib/api-client";
import { canApp } from "@/lib/workforce/types";
import { useSessionStore } from "@/lib/workforce/session";
import {
  absoluteAppPath,
  audienceLabel,
  copyText,
  statusLabel,
} from "@/lib/meetings/ui";

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
  const [token, setToken] = useState("");
  const [roomUrl, setRoomUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const canHost = canApp(role, "meetings:host");

  const join = useCallback(async () => {
    setLoading(true);
    try {
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
    } finally {
      setLoading(false);
    }
  }, [meetingId]);

  useEffect(() => {
    void join();
  }, [join]);

  async function setStatus(status: "live" | "ended" | "scheduled") {
    setBusy(true);
    try {
      const res = await fetch(apiUrl(`/api/meetings/${meetingId}`), {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Mise à jour impossible.");
        return;
      }
      setMeeting(data.meeting);
    } finally {
      setBusy(false);
    }
  }

  async function copy(path: string, key: string) {
    const ok = await copyText(absoluteAppPath(path));
    if (ok) {
      setCopied(key);
      setTimeout(() => setCopied(null), 1800);
    }
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
                {meeting?.title || (loading ? "Connexion…" : "Salle")}
              </h1>
              {meeting ? (
                <p className="text-xs text-muted-foreground">
                  {statusLabel(meeting.status)} ·{" "}
                  {audienceLabel(meeting.audience)}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {canHost && meeting?.status !== "live" ? (
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() => void setStatus("live")}
                >
                  Démarrer
                </Button>
              ) : null}
              {canHost && meeting?.status === "live" ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void setStatus("ended")}
                >
                  Terminer
                </Button>
              ) : null}
              {meeting?.audience === "public" ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => void copy(meeting.publicPath, "public")}
                >
                  {copied === "public" ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Radio className="h-4 w-4" />
                  )}
                  Copier lien public
                </Button>
              ) : null}
              {meeting &&
              (meeting.audience === "clients" ||
                meeting.audience === "public") ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void copy(meeting.clientPath, "client")}
                >
                  {copied === "client" ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Users className="h-4 w-4" />
                  )}
                  Copier lien client
                </Button>
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
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                {loading
                  ? "Connexion à la salle Daily…"
                  : "Salle indisponible."}
              </CardContent>
            </Card>
          )}
        </div>
      </RequirePermission>
    </RequirePlan>
  );
}
