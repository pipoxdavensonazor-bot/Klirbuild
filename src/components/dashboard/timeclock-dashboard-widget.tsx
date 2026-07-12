"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Clock, MapPin, Navigation, Square, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiUrl, parseApiResponse } from "@/lib/api-client";
import type { TimeEntryDto } from "@/lib/timeclock/timeclock-service";
import { formatElapsed, useLiveElapsed } from "@/lib/timeclock/use-live-elapsed";
import { formatDate } from "@/lib/utils";

type Site = { id: string; name: string; lat?: number; lng?: number };

async function getPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("GPS non disponible"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => reject(new Error("GPS refusé")),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  });
}

/** Chronomètre tableau de bord — démarrer et terminer le temps de travail. */
export function TimeclockDashboardWidget() {
  const [openEntry, setOpenEntry] = useState<TimeEntryDto | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const elapsedMs = useLiveElapsed(openEntry?.clockInAt);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/api/timeclock"), { credentials: "include" });
      const data = await parseApiResponse(res);
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Impossible de charger le pointage");
        return;
      }
      setError("");
      setOpenEntry((data.openEntry as TimeEntryDto | null) ?? null);
      const nextSites = (data.sites ?? []) as Site[];
      setSites(nextSites);
      setSelectedSiteId((prev) => prev || nextSites[0]?.id || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!openEntry?.id) return;
    const poll = window.setInterval(() => void load(), 30000);
    return () => window.clearInterval(poll);
  }, [openEntry?.id, load]);

  async function resolveCoords(site?: Site) {
    try {
      return await getPosition();
    } catch {
      if (site?.lat != null && site?.lng != null) {
        return { lat: site.lat, lng: site.lng };
      }
      return { lat: 45.5017, lng: -73.5673 };
    }
  }

  async function clockIn() {
    if (!selectedSiteId) {
      setError("Choisissez un chantier.");
      return;
    }
    const site = sites.find((s) => s.id === selectedSiteId);
    setBusy(true);
    setError("");
    setStatus("Démarrage…");
    try {
      const { lat, lng } = await resolveCoords(site);
      const res = await fetch(apiUrl("/api/timeclock"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "clock_in", jobSiteId: selectedSiteId, lat, lng }),
      });
      const data = await parseApiResponse(res);
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Pointage échoué");
        setStatus("");
        return;
      }
      const entry = data.entry as TimeEntryDto | undefined;
      if (entry?.clockInAt) setOpenEntry(entry);
      setStatus("Chronomètre démarré ✓");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau");
    } finally {
      setBusy(false);
    }
  }

  async function clockOut() {
    if (!openEntry) return;
    setBusy(true);
    setError("");
    setStatus("Calcul des heures…");
    try {
      const site = sites.find((s) => s.id === openEntry.jobSiteId);
      const { lat, lng } = await resolveCoords(site);
      const res = await fetch(apiUrl("/api/timeclock"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "clock_out", lat, lng, breakMinutes: 30 }),
      });
      const data = await parseApiResponse(res);
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Fin de pointage échouée");
        setStatus("");
        return;
      }
      const pay = data.payroll as { hours?: number; grossPay?: number } | undefined;
      setStatus(
        pay?.hours
          ? `Terminé — ${pay.hours}h enregistrées${pay.grossPay ? ` (${pay.grossPay.toFixed(2)} $ brut)` : ""}`
          : "Temps de travail terminé ✓"
      );
      setOpenEntry(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-2 border-brand-300 bg-gradient-to-br from-brand-50/80 via-white to-accent-50/30 shadow-md dark:from-brand-950/40 dark:to-background">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Timer className="h-6 w-6 text-brand-600 animate-pulse" />
            Mon temps de travail
          </CardTitle>
          {openEntry ? (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
              {openEntry.status === "pending_review" ? "En cours (hors zone)" : "En cours"}
            </span>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        {openEntry ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-center dark:border-emerald-900 dark:bg-emerald-950/30">
            <p className="font-mono text-5xl font-bold tabular-nums tracking-tight text-brand-800 dark:text-brand-200">
              {formatElapsed(elapsedMs)}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              <MapPin className="mr-1 inline h-3.5 w-3.5" />
              <strong>{openEntry.jobSiteName}</strong>
              <br />
              Depuis {formatDate(openEntry.clockInAt)}
            </p>
            <Button
              size="lg"
              className="mt-4 w-full max-w-md bg-red-600 text-white hover:bg-red-700"
              disabled={busy}
              onClick={() => void clockOut()}
            >
              <Square className="h-5 w-5 fill-current" />
              Terminer mon temps de travail
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Chaque employé peut démarrer et terminer son shift depuis le tableau de bord.
              </p>
              {sites.length > 0 ? (
                <select
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                  value={selectedSiteId}
                  onChange={(e) => setSelectedSiteId(e.target.value)}
                >
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-xs text-amber-700">Aucun chantier — contactez l&apos;admin.</p>
              )}
              <Button
                size="lg"
                className="w-full"
                disabled={busy || !selectedSiteId}
                onClick={() => void clockIn()}
              >
                <Navigation className="h-5 w-5" />
                Démarrer le chronomètre
              </Button>
            </div>
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center">
              <Timer className="mb-2 h-12 w-12 text-muted-foreground/40" />
              <p className="text-3xl font-mono font-bold text-muted-foreground/50">00:00:00</p>
              <p className="mt-1 text-xs text-muted-foreground">Prêt à pointer</p>
            </div>
          </div>
        )}

        {status ? (
          <p className="text-center text-sm font-medium text-emerald-700 dark:text-emerald-300">
            {status}
          </p>
        ) : null}

        <div className="flex justify-center border-t border-border pt-3">
          <Link href="/timeclock">
            <Button variant="outline" size="sm">
              <Clock className="h-3.5 w-3.5" />
              Pointage GPS détaillé
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
