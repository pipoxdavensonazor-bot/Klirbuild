"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Check, Clock, Send, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiUrl } from "@/lib/api-client";
import { PLATFORM_LABELS, type SocialAccount, type SocialPlatform } from "@/lib/reports/types";
import { catalogPlatformById } from "@/lib/social-ads/zernio-connections-catalog";
import { cn } from "@/lib/utils";

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
  const [mode, setMode] = useState<"now" | "schedule" | "queue">("now");
  const [scheduledFor, setScheduledFor] = useState("");
  const [slots, setSlots] = useState<AudienceSlot[]>([]);
  const [nextSlot, setNextSlot] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const connected = useMemo(
    () => accounts.filter((a) => a.status === "connected"),
    [accounts]
  );

  useEffect(() => {
    if (!selectedIds.length && connected.length) {
      setSelectedIds(connected.map((a) => a.id));
    }
  }, [connected, selectedIds.length]);

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

  function toggleAccount(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function selectAll() {
    setSelectedIds(connected.map((a) => a.id));
  }

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
    if (!canManage || busy || !selectedIds.length) return;
    const hasContent = headline.trim() || primaryText.trim();
    if (!hasContent) return;

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
          accountIds: selectedIds,
          accountId: selectedIds[0],
          platform: connected.find((a) => a.id === selectedIds[0])?.platform,
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
      onPublished?.(data.message ?? "Publication envoyée.");
      setHeadline("");
      setPrimaryText("");
    } finally {
      setBusy(false);
    }
  }

  const publishLabel =
    mode === "now"
      ? `Publier instantanément sur ${selectedIds.length} réseau${selectedIds.length > 1 ? "x" : ""}`
      : mode === "queue"
        ? `Planifier sur ${selectedIds.length} réseau${selectedIds.length > 1 ? "x" : ""} (créneau optimal)`
        : `Planifier sur ${selectedIds.length} réseau${selectedIds.length > 1 ? "x" : ""}`;

  return (
    <div className="rounded-lg border border-[#e8ecf0] bg-white shadow-sm">
      <div className="border-b border-[#e8ecf0] px-5 py-4">
        <h2 className="flex items-center gap-2 text-base font-semibold text-[#2d3436]">
          <Sparkles className="h-4 w-4 text-brand-600" />
          Planification — publication multi-réseaux
          {zernioEnabled ? (
            <span className="rounded-full bg-[#1e1e1e] px-2 py-0.5 text-[10px] font-medium text-white">
              Zernio
            </span>
          ) : null}
        </h2>
        <p className="mt-1 text-xs text-[#6b7280]">
          Rédigez une fois, publiez partout — comme Metricool ou Zernio.
        </p>
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                Réseaux ciblés ({selectedIds.length}/{connected.length})
              </p>
              {canManage && connected.length > 1 ? (
                <button
                  type="button"
                  className="text-xs font-medium text-brand-600 hover:underline"
                  onClick={selectAll}
                >
                  Tout sélectionner
                </button>
              ) : null}
            </div>
            {connected.length === 0 ? (
              <p className="rounded-lg border border-dashed border-[#d1d9e0] px-4 py-6 text-center text-sm text-muted-foreground">
                Connectez vos comptes dans l&apos;onglet Connexions pour publier.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {connected.map((acc) => {
                  const cat = catalogPlatformById(acc.platform);
                  const active = selectedIds.includes(acc.id);
                  const label = cat?.name ?? PLATFORM_LABELS[acc.platform as SocialPlatform] ?? acc.platform;
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      disabled={!canManage}
                      onClick={() => {
                        toggleAccount(acc.id);
                        onAccountChange(acc.id);
                      }}
                      className={cn(
                        "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                        active
                          ? "border-transparent text-white shadow-sm"
                          : "border-[#d1d9e0] bg-white text-[#555] hover:border-brand-300",
                        active && (cat?.buttonBg ?? "bg-brand-600"),
                        active && (cat?.buttonText ?? "text-white")
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold",
                          active ? "bg-white/25 text-white" : cat?.iconBg ?? "bg-muted text-white"
                        )}
                      >
                        {cat?.monogram?.slice(0, 2) ?? acc.platform.slice(0, 2).toUpperCase()}
                      </span>
                      {label}
                      {active ? <Check className="h-3 w-3" /> : null}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <Input
            placeholder="Titre / accroche (optionnel)"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            disabled={!canManage}
            className="border-[#d1d9e0]"
          />
          <textarea
            className="flex min-h-[140px] w-full rounded-md border border-[#d1d9e0] bg-white px-3 py-2 text-sm"
            placeholder="Texte de la publication — visible sur tous les réseaux sélectionnés…"
            value={primaryText}
            onChange={(e) => setPrimaryText(e.target.value)}
            disabled={!canManage}
          />
          <Input
            placeholder="Appel à l'action"
            value={callToAction}
            onChange={(e) => setCallToAction(e.target.value)}
            disabled={!canManage}
            className="border-[#d1d9e0]"
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
              Instantané
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
              Date précise
            </Button>
          </div>

          {mode === "schedule" ? (
            <Input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              disabled={!canManage}
              className="border-[#d1d9e0]"
            />
          ) : null}

          {canManage ? (
            <Button
              className="h-11 w-full text-sm font-semibold"
              disabled={busy || !primaryText.trim() || selectedIds.length === 0}
              onClick={() => void publish()}
            >
              <Send className="h-4 w-4" />
              {publishLabel}
            </Button>
          ) : null}
        </div>

        <div className="space-y-2 rounded-lg border border-[#e8ecf0] bg-[#fafbfc] p-3 lg:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
            Heures d&apos;audience
          </p>
          {nextSlot ? (
            <p className="text-xs text-brand-700">
              Prochain créneau Zernio : {new Date(nextSlot).toLocaleString("fr-CA")}
            </p>
          ) : null}
          <div className="max-h-64 space-y-1.5 overflow-y-auto">
            {slots.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Créneaux recommandés par plateforme (style Metricool).
              </p>
            ) : (
              slots.map((slot) => (
                <button
                  key={`${slot.day}-${slot.hour}`}
                  type="button"
                  className="flex w-full items-center justify-between rounded-md border border-[#e8ecf0] bg-white px-3 py-2 text-left text-sm transition hover:border-brand-300"
                  onClick={() => pickSlot(slot)}
                  disabled={!canManage}
                >
                  <span>{slot.label}</span>
                  <span className="text-xs text-muted-foreground">Score {slot.score}</span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
