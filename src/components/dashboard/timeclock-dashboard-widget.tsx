"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Clock, Navigation, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiUrl, parseApiResponse } from "@/lib/api-client";
import type { TimeEntryDto } from "@/lib/timeclock/timeclock-service";
import { formatDate } from "@/lib/utils";

function formatElapsed(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Chronomètre visible sur tous les tableaux de bord — tous les employés. */
export function TimeclockDashboardWidget() {
  const [openEntry, setOpenEntry] = useState<TimeEntryDto | null>(null);
  const [sites, setSites] = useState<{ id: string; name: string }[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(apiUrl("/api/timeclock"), { credentials: "include" });
    if (!res.ok) return;
    const data = await res.json();
    setOpenEntry(data.openEntry ?? null);
    const nextSites = (data.sites ?? []) as { id: string; name: string }[];
    setSites(nextSites);
    if (!selectedSiteId && nextSites[0]) setSelectedSiteId(nextSites[0].id);
  }, [selectedSiteId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!openEntry) {
      setElapsedMs(0);
      return;
    }
    const tick = () => {
      const start = new Date(openEntry.clockInAt).getTime();
      setElapsedMs(Math.max(0, Date.now() - start));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [openEntry]);

  async function clockIn() {
    if (!selectedSiteId) return;
    setBusy(true);
    setStatus("");
    try {
      const res = await fetch(apiUrl("/api/timeclock"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "clock_in", jobSiteId: selectedSiteId, lat: 0, lng: 0 }),
      });
      const data = await parseApiResponse(res);
      if (!res.ok) {
        setStatus(typeof data.error === "string" ? data.error : "Pointage échoué");
        return;
      }
      setStatus("Chronomètre démarré");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function clockOut() {
    setBusy(true);
    try {
      const res = await fetch(apiUrl("/api/timeclock"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "clock_out", lat: 0, lng: 0, breakMinutes: 30 }),
      });
      const data = await parseApiResponse(res);
      if (!res.ok) {
        setStatus(typeof data.error === "string" ? data.error : "Sortie échouée");
        return;
      }
      const pay = data.payroll as { hours?: number } | undefined;
      setStatus(pay?.hours ? `${pay.hours}h enregistrées` : "Sortie enregistrée");
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-brand-200 bg-gradient-to-br from-brand-50/60 to-white dark:from-brand-950/30 dark:to-background">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Timer className="h-5 w-5 text-brand-600" />
          Chronomètre chantier
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {openEntry ? (
          <>
            <p className="font-mono text-3xl font-bold tabular-nums text-brand-700 dark:text-brand-300">
              {formatElapsed(elapsedMs)}
            </p>
            <p className="text-sm text-muted-foreground">
              En cours · <strong>{openEntry.jobSiteName}</strong>
              <br />
              Depuis {formatDate(openEntry.clockInAt)}
            </p>
            <Button className="w-full" variant="secondary" disabled={busy} onClick={() => void clockOut()}>
              Fin — calculer les heures
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Pointez votre arrivée sur chantier. Visible pour tous les employés.
            </p>
            {sites.length > 0 ? (
              <select
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
                value={selectedSiteId}
                onChange={(e) => setSelectedSiteId(e.target.value)}
              >
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            ) : null}
            <Button className="w-full" disabled={busy || !selectedSiteId} onClick={() => void clockIn()}>
              <Navigation className="h-4 w-4" />
              Début
            </Button>
          </>
        )}
        {status ? <p className="text-xs text-muted-foreground">{status}</p> : null}
        <Link href="/timeclock" className="block">
          <Button variant="outline" size="sm" className="w-full">
            <Clock className="h-3.5 w-3.5" />
            Pointage GPS complet
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
