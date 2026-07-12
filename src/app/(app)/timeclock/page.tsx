"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MapPin, Navigation, ShieldCheck, Timer } from "lucide-react";
import { RequirePermission } from "@/components/auth/require-permission";
import { PageHeader, StatCard } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { apiUrl, parseApiResponse } from "@/lib/api-client";
import { useSessionStore } from "@/lib/workforce/session";
import { isWithinGeofence } from "@/lib/workforce/payroll";
import type { TimeEntryDto } from "@/lib/timeclock/timeclock-service";
import { formatElapsed, useLiveElapsed } from "@/lib/timeclock/use-live-elapsed";
import { canApp } from "@/lib/workforce/types";
import { formatDate } from "@/lib/utils";

type JobSite = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  radiusM: number;
};

type PayrollSummary = {
  totalHours: number;
  totalGross: number;
  employees: { name: string; hours: number; gross: number; hourlyRate: number }[];
};

export default function TimeclockPage() {
  return (
    <RequirePermission permission="timeclock:use">
      <TimeclockInner />
    </RequirePermission>
  );
}

function TimeclockInner() {
  const role = useSessionStore((s) => s.role);
  const isManager = canApp(role, "timeclock:manage");
  const canSeePayroll = canApp(role, "payroll:read");

  const [sites, setSites] = useState<JobSite[]>([]);
  const [entries, setEntries] = useState<TimeEntryDto[]>([]);
  const [openEntry, setOpenEntry] = useState<TimeEntryDto | null>(null);
  const [payroll, setPayroll] = useState<PayrollSummary | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [geoStatus, setGeoStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const elapsedMs = useLiveElapsed(openEntry?.clockInAt);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    const res = await fetch(apiUrl("/api/timeclock"), { credentials: "include" });
    const data = await res.json();
    const nextSites: JobSite[] = data.sites ?? [];
    setSites(nextSites);
    setEntries(data.entries ?? []);
    setOpenEntry(data.openEntry ?? null);
    if (!selectedSiteId && nextSites[0]) setSelectedSiteId(nextSites[0].id);

    if (canSeePayroll) {
      const pr = await fetch(apiUrl("/api/timeclock?view=payroll"), { credentials: "include" });
      if (pr.ok) setPayroll(await pr.json());
    }
  }, [canSeePayroll, selectedSiteId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!openEntry?.clockInAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [openEntry?.clockInAt]);

  const onSiteNow = entries.filter((e) => e.status === "clocked_in" || e.status === "pending_review").length;

  async function getPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("La géolocalisation n'est pas supportée."));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      });
    });
  }

  async function resolveCoords(site: JobSite) {
    let lat = site.lat;
    let lng = site.lng;
    try {
      const pos = await getPosition();
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
      setGeoStatus(`GPS ±${Math.round(pos.coords.accuracy)}m`);
    } catch {
      setGeoStatus("GPS refusé — position du chantier utilisée");
    }
    return { lat, lng };
  }

  async function clockIn() {
    const site = sites.find((s) => s.id === selectedSiteId);
    if (!site) return;
    setBusy(true);
    setGeoStatus("Récupération GPS…");
    try {
      const { lat, lng } = await resolveCoords(site);
      const fence = isWithinGeofence({ lat, lng }, site);
      const res = await fetch(apiUrl("/api/timeclock"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "clock_in",
          jobSiteId: site.id,
          lat,
          lng,
        }),
      });
      const data = await parseApiResponse(res);
      if (!res.ok) {
        setGeoStatus(typeof data.error === "string" ? data.error : "Pointage échoué");
        return;
      }
      const entry = data.entry as TimeEntryDto | undefined;
      if (entry?.clockInAt) setOpenEntry(entry);
      setGeoStatus(
        fence.within
          ? `Chronomètre démarré — ${fence.distanceM}m du chantier`
          : `Hors zone (${fence.distanceM}m) — revue requise`
      );
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function clockOut() {
    if (!openEntry) return;
    setBusy(true);
    setGeoStatus("Arrêt du chronomètre…");
    try {
      const site = sites.find((s) => s.id === openEntry.jobSiteId) ?? sites[0];
      const { lat, lng } = site ? await resolveCoords(site) : { lat: 0, lng: 0 };
      const res = await fetch(apiUrl("/api/timeclock"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "clock_out",
          lat,
          lng,
          breakMinutes: 30,
        }),
      });
      const data = await parseApiResponse(res);
      if (!res.ok) {
        setGeoStatus(typeof data.error === "string" ? data.error : "Sortie échouée");
        return;
      }
      const pay = data.payroll as { hours: number; grossPay: number } | undefined;
      setGeoStatus(
        pay
          ? `Sortie · ${pay.hours}h · salaire brut ${pay.grossPay.toFixed(2)} $`
          : "Sortie enregistrée"
      );
      await load();
    } finally {
      setBusy(false);
    }
  }

  const liveHours = useMemo(
    () => Math.round((elapsedMs / 3_600_000) * 100) / 100,
    [elapsedMs]
  );

  return (
    <div>
      <PageHeader
        title="Chronomètre chantier"
        description="Démarrez le chronomètre à l'arrivée sur chantier. Les heures alimentent automatiquement la paie."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Sur chantier maintenant"
          value={String(onSiteNow)}
          icon={<MapPin className="h-4 w-4" />}
        />
        <StatCard
          label="Chronomètre actif"
          value={openEntry ? formatElapsed(elapsedMs) : "—"}
          hint={openEntry ? `${liveHours} h en cours` : "Cliquez Début pour lancer"}
          icon={<Timer className="h-4 w-4" />}
        />
        <StatCard
          label="Geofence"
          value="Actif"
          hint="Rayon 120–200 m par site"
          icon={<ShieldCheck className="h-4 w-4" />}
        />
      </div>

      {canSeePayroll && payroll ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-sm">Paie automatique (admin / comptabilité)</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Heures totales</p>
              <p className="text-2xl font-semibold">{payroll.totalHours}h</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Masse salariale brute</p>
              <p className="text-2xl font-semibold">{payroll.totalGross.toFixed(2)} $</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Employés</p>
              <p className="text-2xl font-semibold">{payroll.employees.length}</p>
            </div>
            {payroll.employees.length > 0 ? (
              <div className="sm:col-span-3 space-y-2">
                {payroll.employees.map((e) => (
                  <div
                    key={e.name}
                    className="flex justify-between rounded-md border border-border px-3 py-2 text-sm"
                  >
                    <span>{e.name}</span>
                    <span className="text-muted-foreground">
                      {e.hours.toFixed(2)}h × {e.hourlyRate}$ = {e.gross.toFixed(2)}$
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Mon chronomètre</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!openEntry ? (
              <>
                <label className="block text-sm">
                  <span className="mb-1 block text-muted-foreground">Chantier</span>
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
                </label>
                <Button className="w-full" disabled={busy || !selectedSiteId} onClick={() => void clockIn()}>
                  <Navigation className="h-4 w-4" />
                  Début (GPS)
                </Button>
              </>
            ) : (
              <>
                <div className="rounded-lg bg-emerald-50 p-4 text-center dark:bg-emerald-950/40">
                  <p className="text-3xl font-mono font-bold tabular-nums text-emerald-800 dark:text-emerald-200">
                    {formatElapsed(elapsedMs)}
                  </p>
                  <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-300">
                    En cours sur <strong>{openEntry.jobSiteName}</strong>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Depuis {formatDate(openEntry.clockInAt)}
                  </p>
                </div>
                <Button
                  className="w-full"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => void clockOut()}
                >
                  Fin — calculer les heures
                </Button>
              </>
            )}

            {geoStatus ? <p className="text-xs text-muted-foreground">{geoStatus}</p> : null}

            <div className="space-y-2 text-xs text-muted-foreground">
              {sites.map((s) => (
                <div key={s.id} className="rounded-md border border-dashed border-border p-2">
                  <p className="font-medium text-foreground">{s.name}</p>
                  <p>{s.address}</p>
                  <p>
                    Geofence {s.radiusM}m · {s.lat.toFixed(4)}, {s.lng.toFixed(4)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{isManager ? "Tous les pointages" : "Historique"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {entries.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun pointage enregistré.</p>
            ) : (
              entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {entry.employeeName} · {entry.jobSiteName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      In {formatDate(entry.clockInAt)}
                      {entry.clockOutAt ? ` → Out ${formatDate(entry.clockOutAt)}` : " · en cours"}
                      {entry.hoursWorked != null ? ` · ${entry.hoursWorked}h` : ""}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {entry.distanceFromSiteM}m du site
                      {entry.withinGeofence ? " · dans la zone" : " · hors zone"}
                    </p>
                    {entry.notes ? (
                      <p className="mt-1 text-xs text-amber-700">{entry.notes}</p>
                    ) : null}
                  </div>
                  <StatusBadge status={entry.status} />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
      <p className="mt-4 text-xs text-muted-foreground" suppressHydrationWarning>
        Horloge locale : {new Date(now).toLocaleTimeString()}
      </p>
    </div>
  );
}
