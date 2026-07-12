"use client";

import { useEffect, useState } from "react";
import { CalendarClock, Clock, Send, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiUrl } from "@/lib/api-client";
import { PLATFORM_LABELS, type SocialAccount, type SocialPlatform } from "@/lib/reports/types";

type AudienceSlot = { day: string; hour: number; score: number; label: string };

type Props = {
  accounts: SocialAccount[];
  selectedAccountId: string;
  onAccountChange: (id: string) => void;
  canManage: boolean;
  zernioEnabled: boolean;
  onPublished?: (message: string) => void;
};

export function SocialPublishComposer({
  accounts,
  selectedAccountId,
  onAccountChange,
  canManage,
  zernioEnabled,
  onPublished,
}: Props) {
  const [headline, setHeadline] = useState("");
  const [primaryText, setPrimaryText] = useState("");
  const [callToAction, setCallToAction] = useState("En savoir plus");
  const [mode, setMode] = useState<"now" | "schedule" | "queue">("queue");
  const [scheduledFor, setScheduledFor] = useState("");
  const [slots, setSlots] = useState<AudienceSlot[]>([]);
  const [nextSlot, setNextSlot] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const account = accounts.find((a) => a.id === selectedAccountId);
  const platform = account?.platform;

  useEffect(() => {
    if (!platform) return;
    void (async () => {
      const res = await fetch(apiUrl("/api/social-ads"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "audience", platform }),
      });
      const data = await res.json();
      setSlots(data.audience?.slots ?? []);
      setNextSlot(data.nextSlot?.nextSlot ?? null);
    })();
  }, [platform]);

  function pickSlot(slot: AudienceSlot) {
    const now = new Date();
    const target = new Date(now);
    const dayParts = slot.day.split(" ");
    const dayNum = parseInt(dayParts[1] ?? String(now.getDate()), 10);
    if (!Number.isNaN(dayNum)) target.setDate(dayNum);
    target.setHours(slot.hour, 0, 0, 0);
    if (target < now) target.setDate(target.getDate() + 1);
    setScheduledFor(target.toISOString().slice(0, 16));
    setMode("schedule");
  }

  async function publish() {
    if (!canManage || !account || account.status !== "connected" || busy) return;
    setBusy(true);
    try {
      const res = await fetch(apiUrl("/api/social-ads"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "publish",
          name: headline.trim() || "Publication",
          headline,
          primaryText,
          callToAction,
          accountId: account.id,
          platform: account.platform,
          mode,
          scheduledFor: mode === "schedule" ? scheduledFor : undefined,
          timezone: "America/Toronto",
        }),
      });
      const data = await res.json();
      if (data.error) {
        onPublished?.(data.error);
        return;
      }
      onPublished?.(
        data.message ??
          (mode === "now"
            ? "Publication envoyée."
            : mode === "queue"
              ? "Publication ajoutée au prochain créneau optimal."
              : "Publication planifiée.")
      );
      setHeadline("");
      setPrimaryText("");
    } finally {
      setBusy(false);
    }
  }

  const connected = accounts.filter((a) => a.status === "connected");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-brand-600" />
          Composer — publication multi-réseaux
          {zernioEnabled ? (
            <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-medium text-brand-700 dark:bg-brand-900/50 dark:text-brand-200">
              Zernio
            </span>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="space-y-3">
            <select
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
              value={selectedAccountId}
              onChange={(e) => onAccountChange(e.target.value)}
              disabled={!canManage}
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id} disabled={a.status !== "connected"}>
                  {PLATFORM_LABELS[a.platform]}
                  {a.status !== "connected" ? " (non connecté)" : ""}
                </option>
              ))}
            </select>
            <Input
              placeholder="Titre / accroche"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              disabled={!canManage}
            />
            <textarea
              className="flex min-h-[100px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="Texte de la publication…"
              value={primaryText}
              onChange={(e) => setPrimaryText(e.target.value)}
              disabled={!canManage}
            />
            <Input
              placeholder="Appel à l'action"
              value={callToAction}
              onChange={(e) => setCallToAction(e.target.value)}
              disabled={!canManage}
            />

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={mode === "now" ? "default" : "outline"}
                disabled={!canManage || !zernioEnabled}
                onClick={() => setMode("now")}
              >
                <Zap className="h-3.5 w-3.5" />
                Publier maintenant
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mode === "queue" ? "default" : "outline"}
                disabled={!canManage || !zernioEnabled}
                onClick={() => setMode("queue")}
              >
                <Clock className="h-3.5 w-3.5" />
                Créneau optimal
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mode === "schedule" ? "default" : "outline"}
                disabled={!canManage}
                onClick={() => setMode("schedule")}
              >
                <CalendarClock className="h-3.5 w-3.5" />
                Planifier
              </Button>
            </div>

            {mode === "schedule" ? (
              <Input
                type="datetime-local"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
                disabled={!canManage}
              />
            ) : null}

            {canManage ? (
              <Button
                className="w-full"
                disabled={busy || !primaryText.trim() || connected.length === 0}
                onClick={() => void publish()}
              >
                <Send className="h-4 w-4" />
                {mode === "now"
                  ? "Publier automatiquement"
                  : mode === "queue"
                    ? "Planifier au prochain créneau"
                    : "Planifier la publication"}
              </Button>
            ) : null}
          </div>

          <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Heures d&apos;audience — {platform ? PLATFORM_LABELS[platform as SocialPlatform] : "—"}
            </p>
            {nextSlot ? (
              <p className="text-xs text-brand-700 dark:text-brand-300">
                Prochain créneau Zernio : {new Date(nextSlot).toLocaleString("fr-CA")}
              </p>
            ) : null}
            <div className="max-h-56 space-y-1.5 overflow-y-auto">
              {slots.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Sélectionnez un compte connecté pour voir les créneaux recommandés.
                </p>
              ) : (
                slots.map((slot) => (
                  <button
                    key={`${slot.day}-${slot.hour}`}
                    type="button"
                    className="flex w-full items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-left text-sm transition hover:border-brand-300 hover:bg-brand-50/50 dark:hover:bg-brand-950/30"
                    onClick={() => pickSlot(slot)}
                    disabled={!canManage}
                  >
                    <span>{slot.label}</span>
                    <span className="text-xs text-muted-foreground">Score {slot.score}</span>
                  </button>
                ))
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">
              Style Metricool — créneaux recommandés par plateforme. Cliquez pour planifier.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
