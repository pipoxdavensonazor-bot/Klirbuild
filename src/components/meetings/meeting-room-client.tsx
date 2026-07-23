"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Copy,
  Link2,
  Radio,
  Settings2,
  Users,
} from "lucide-react";
import { RequirePermission } from "@/components/auth/require-permission";
import { RequirePlan } from "@/components/auth/require-plan";
import { DailyRoomEmbed } from "@/components/meetings/daily-room-embed";
import { LiveSocialConnections } from "@/components/meetings/live-social-connections";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const userName = useSessionStore(
    (s) => s.userName || s.userEmail || "Participant"
  );
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [token, setToken] = useState("");
  const [roomUrl, setRoomUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showParams, setShowParams] = useState(true);
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

  const invitePath = meeting ? `/meetings/${meeting.id}` : "";
  const publicLiveUrl =
    meeting?.audience === "public"
      ? absoluteAppPath(meeting.publicPath)
      : meeting
        ? absoluteAppPath(invitePath)
        : "";

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
              <Button
                size="sm"
                variant={showParams ? "secondary" : "outline"}
                onClick={() => setShowParams((v) => !v)}
              >
                <Settings2 className="mr-1 h-4 w-4" />
                Paramètres
              </Button>
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
            </div>
          </div>

          {error ? (
            <Card>
              <CardContent className="py-6 text-sm text-destructive">
                {error}
              </CardContent>
            </Card>
          ) : null}

          <div
            className={`grid gap-4 ${
              showParams ? "lg:grid-cols-[minmax(0,1fr)_340px]" : "grid-cols-1"
            }`}
          >
            <div className="min-w-0">
              {roomUrl ? (
                <DailyRoomEmbed
                  roomUrl={roomUrl}
                  token={token}
                  title={meeting?.title}
                  meetingId={meetingId}
                  displayName={userName}
                />
              ) : (
                <Card>
                  <CardContent className="py-10 text-center text-sm text-muted-foreground">
                    {loading ? "Connexion à la salle…" : "Salle indisponible."}
                  </CardContent>
                </Card>
              )}
            </div>

            {showParams ? (
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Paramètres salle</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-md border border-border px-2 py-1.5">
                        <p className="text-muted-foreground">Statut</p>
                        <p className="font-medium">
                          {meeting ? statusLabel(meeting.status) : "—"}
                        </p>
                      </div>
                      <div className="rounded-md border border-border px-2 py-1.5">
                        <p className="text-muted-foreground">Audience</p>
                        <p className="font-medium">
                          {meeting ? audienceLabel(meeting.audience) : "—"}
                        </p>
                      </div>
                      <div className="col-span-2 rounded-md border border-border px-2 py-1.5">
                        <p className="text-muted-foreground">Votre nom</p>
                        <p className="font-medium">{userName}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full justify-start"
                        disabled={!meeting}
                        onClick={() => void copy(invitePath, "invite")}
                      >
                        {copied === "invite" ? (
                          <Check className="mr-2 h-4 w-4" />
                        ) : (
                          <Copy className="mr-2 h-4 w-4" />
                        )}
                        Copier le lien équipe
                      </Button>
                      {meeting?.audience === "public" ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="w-full justify-start"
                          onClick={() => void copy(meeting.publicPath, "public")}
                        >
                          {copied === "public" ? (
                            <Check className="mr-2 h-4 w-4" />
                          ) : (
                            <Radio className="mr-2 h-4 w-4" />
                          )}
                          Copier le lien public
                        </Button>
                      ) : null}
                      {meeting &&
                      (meeting.audience === "clients" ||
                        meeting.audience === "public") ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => void copy(meeting.clientPath, "client")}
                        >
                          {copied === "client" ? (
                            <Check className="mr-2 h-4 w-4" />
                          ) : (
                            <Users className="mr-2 h-4 w-4" />
                          )}
                          Copier le lien client
                        </Button>
                      ) : null}
                      <Link
                        href="/feed"
                        className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-xs font-medium hover:bg-muted"
                      >
                        <Link2 className="h-3.5 w-3.5" />
                        Ouvrir Feed & Live
                      </Link>
                    </div>
                  </CardContent>
                </Card>

                {canHost ? (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">
                        Réseaux sociaux (live)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <LiveSocialConnections
                        compact
                        title={meeting?.title}
                        liveUrl={publicLiveUrl || undefined}
                      />
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </RequirePermission>
    </RequirePlan>
  );
}
