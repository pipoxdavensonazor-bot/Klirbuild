"use client";

import { useMemo, useState } from "react";
import { MapPin, Navigation, ShieldCheck, Clock } from "lucide-react";
import { RequirePermission } from "@/components/auth/require-permission";
import { PageHeader, StatCard } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import {
  employees,
  jobSites,
  timeEntries as initialEntries,
} from "@/lib/workforce/mock-data";
import { useSessionStore } from "@/lib/workforce/session";
import {
  distanceMeters,
  hoursFromClock,
  isWithinGeofence,
} from "@/lib/workforce/payroll";
import type { TimeEntry } from "@/lib/workforce/types";
import { canApp } from "@/lib/workforce/types";
import { formatDate } from "@/lib/utils";

export default function TimeclockPage() {
  return (
    <RequirePermission permission="timeclock:use">
      <TimeclockInner />
    </RequirePermission>
  );
}

function TimeclockInner() {
  const role = useSessionStore((s) => s.role);
  const employeeId = useSessionStore((s) => s.employeeId);
  const isManager = canApp(role, "timeclock:manage");
  const employee = employees.find((e) => e.id === employeeId) ?? employees[2];

  const [entries, setEntries] = useState<TimeEntry[]>(initialEntries);
  const [selectedSiteId, setSelectedSiteId] = useState(jobSites[0].id);
  const [geoStatus, setGeoStatus] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const myOpen = entries.find(
    (e) => e.employeeId === employee.id && e.status === "clocked_in"
  );

  const visibleEntries = useMemo(() => {
    if (isManager) return entries;
    return entries.filter((e) => e.employeeId === employee.id);
  }, [entries, employee.id, isManager]);

  const onSiteNow = entries.filter((e) => e.status === "clocked_in").length;

  async function getPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("La géolocalisation n'est pas supportée sur cet appareil."));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      });
    });
  }

  async function clockIn() {
    setBusy(true);
    setGeoStatus("Récupération GPS…");
    try {
      const site = jobSites.find((s) => s.id === selectedSiteId)!;
      let lat = site.lat + (Math.random() - 0.5) * 0.001;
      let lng = site.lng + (Math.random() - 0.5) * 0.001;
      let accuracyM = 15;
      let address = "Position simulée (autorise GPS pour la vraie localisation)";

      try {
        const pos = await getPosition();
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
        accuracyM = pos.coords.accuracy;
        address = `GPS ±${Math.round(accuracyM)}m`;
        setGeoStatus("Position GPS obtenue");
      } catch {
        setGeoStatus("GPS refusé — démo avec position proche du chantier");
      }

      const fence = isWithinGeofence({ lat, lng }, site);
      const entry: TimeEntry = {
        id: `te_${Date.now()}`,
        employeeId: employee.id,
        employeeName: employee.name,
        jobSiteId: site.id,
        jobSiteName: site.name,
        clockInAt: new Date().toISOString(),
        clockInGeo: { lat, lng, accuracyM, address },
        withinGeofence: fence.within,
        distanceFromSiteM: fence.distanceM,
        breakMinutes: 0,
        status: fence.within ? "clocked_in" : "pending_review",
        notes: fence.within
          ? undefined
          : `Hors zone (${fence.distanceM}m) — revue manager requise`,
      };
      setEntries((prev) => [entry, ...prev]);
      setGeoStatus(
        fence.within
          ? `Pointage OK — ${fence.distanceM}m du chantier`
          : `Hors geofence (${fence.distanceM}m) — en attente de validation`
      );
    } finally {
      setBusy(false);
    }
  }

  async function clockOut() {
    if (!myOpen) return;
    setBusy(true);
    setGeoStatus("Pointage de sortie…");
    try {
      const site = jobSites.find((s) => s.id === myOpen.jobSiteId)!;
      let lat = site.lat;
      let lng = site.lng;
      let accuracyM = 12;
      try {
        const pos = await getPosition();
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
        accuracyM = pos.coords.accuracy;
      } catch {
        /* demo fallback */
      }
      const outAt = new Date().toISOString();
      const hours = hoursFromClock(myOpen.clockInAt, outAt, 30);
      setEntries((prev) =>
        prev.map((e) =>
          e.id === myOpen.id
            ? {
                ...e,
                clockOutAt: outAt,
                clockOutGeo: { lat, lng, accuracyM },
                breakMinutes: 30,
                hoursWorked: hours,
                status: "pending_review",
                distanceFromSiteM: distanceMeters({ lat, lng }, site),
              }
            : e
        )
      );
      setGeoStatus(`Sortie enregistrée · ${hours}h (pause 30 min déduite)`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Pointage GPS"
        description="Les employés pointent à l'arrivée sur chantier. L'admin voit la localisation en temps réel."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Sur chantier maintenant" value={String(onSiteNow)} icon={<MapPin className="h-4 w-4" />} />
        <StatCard label="Mes pointages" value={String(visibleEntries.length)} icon={<Clock className="h-4 w-4" />} />
        <StatCard
          label="Geofence"
          value="Actif"
          hint="Rayon 120–200 m par site"
          icon={<ShieldCheck className="h-4 w-4" />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Mon pointage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border p-3 text-sm">
              <p className="font-medium">{employee.name}</p>
              <p className="text-muted-foreground">{employee.jobTitle}</p>
            </div>

            {!myOpen ? (
              <>
                <label className="block text-sm">
                  <span className="mb-1 block text-muted-foreground">Chantier</span>
                  <select
                    className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                    value={selectedSiteId}
                    onChange={(e) => setSelectedSiteId(e.target.value)}
                  >
                    {jobSites.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                <Button className="w-full" disabled={busy} onClick={() => void clockIn()}>
                  <Navigation className="h-4 w-4" />
                  Pointer l&apos;arrivée (GPS)
                </Button>
              </>
            ) : (
              <>
                <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                  En cours sur <strong>{myOpen.jobSiteName}</strong>
                  <br />
                  Depuis {formatDate(myOpen.clockInAt)} · {myOpen.distanceFromSiteM}m
                </div>
                <Button
                  className="w-full"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => void clockOut()}
                >
                  Pointer la sortie
                </Button>
              </>
            )}

            {geoStatus ? (
              <p className="text-xs text-muted-foreground">{geoStatus}</p>
            ) : null}

            <div className="space-y-2 text-xs text-muted-foreground">
              {jobSites.map((s) => (
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
            <CardTitle>
              {isManager ? "Tous les pointages" : "Historique"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {visibleEntries.map((entry) => (
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
                    GPS {entry.clockInGeo.lat.toFixed(5)}, {entry.clockInGeo.lng.toFixed(5)} ·{" "}
                    {entry.distanceFromSiteM}m du site
                    {entry.withinGeofence ? " · dans la zone" : " · hors zone"}
                  </p>
                  {entry.notes ? (
                    <p className="mt-1 text-xs text-amber-700">{entry.notes}</p>
                  ) : null}
                </div>
                <StatusBadge status={entry.status} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
