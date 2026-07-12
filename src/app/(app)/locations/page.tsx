"use client";

import { useEffect, useState } from "react";
import { RequirePermission } from "@/components/auth/require-permission";
import { RequirePlan } from "@/components/auth/require-plan";
import { PageHeader, StatCard } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { apiUrl } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";

type JobSite = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  radiusM: number;
};

type LiveLocation = {
  employeeId: string;
  employeeName: string;
  jobSiteName: string;
  lat: number;
  lng: number;
  status: string;
  updatedAt: string;
};

export default function LocationsPage() {
  return (
    <RequirePermission permission="location:view">
      <RequirePlan feature="locations" title="Localisation live — plan Growth+">
        <LocationsInner />
      </RequirePlan>
    </RequirePermission>
  );
}

function LocationsInner() {
  const [sites, setSites] = useState<JobSite[]>([]);
  const [liveLocations, setLiveLocations] = useState<LiveLocation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch(apiUrl("/api/locations"), { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setSites(data.sites ?? []);
        setLiveLocations(data.liveLocations ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader
        title="Localisation chantier"
        description="Vue administrateur : employés pointés en temps réel (base de données)."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Employés sur site" value={String(liveLocations.length)} />
        <StatCard label="Chantiers actifs" value={String(sites.length)} />
        <StatCard
          label="Pointages ouverts"
          value={loading ? "…" : String(liveLocations.length)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Carte (aperçu)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative h-[420px] overflow-hidden rounded-xl border border-border bg-[linear-gradient(135deg,#e8f4f8_0%,#dce8f0_40%,#c5d9e4_100%)] dark:bg-[linear-gradient(135deg,#0f2740,#0b1c2e)]">
              {sites.map((site, i) => (
                <div
                  key={site.id}
                  className="absolute rounded-full border-2 border-brand-500/40 bg-brand-500/15"
                  style={{
                    width: 72 + i * 8,
                    height: 72 + i * 8,
                    left: `${18 + i * 28}%`,
                    top: `${22 + (i % 2) * 30}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                  title={site.name}
                />
              ))}
              {liveLocations.map((loc, i) => (
                <div
                  key={loc.employeeId}
                  className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
                  style={{
                    left: `${22 + i * 30}%`,
                    top: `${28 + (i % 2) * 26}%`,
                  }}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-500 text-[10px] font-bold text-brand-900 shadow-soft ring-2 ring-white">
                    {loc.employeeName
                      .split(" ")
                      .map((p) => p[0])
                      .join("")}
                  </div>
                  <span className="mt-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
                    {loc.employeeName.split(" ")[0]}
                  </span>
                </div>
              ))}
              <div className="absolute bottom-3 left-3 rounded-lg bg-white/90 px-3 py-2 text-xs shadow-soft dark:bg-slate-900/90">
                Pins = employés pointés · Cercles = geofence chantier
              </div>
              {!loading && sites.length === 0 && liveLocations.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-muted-foreground">
                  Aucun chantier ni pointage actif. Créez des chantiers et utilisez le
                  chronomètre.
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Positions live</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {liveLocations.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun employé pointé.</p>
            ) : (
              liveLocations.map((loc) => (
                <div key={loc.employeeId} className="rounded-lg border border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{loc.employeeName}</p>
                      <p className="text-xs text-muted-foreground">{loc.jobSiteName}</p>
                    </div>
                    <StatusBadge status={loc.status} />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    MAJ {formatDate(loc.updatedAt)}
                  </p>
                </div>
              ))
            )}

            <div className="pt-2">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Chantiers
              </p>
              {sites.map((s) => (
                <div
                  key={s.id}
                  className="mb-2 rounded-md border border-dashed border-border p-2 text-xs"
                >
                  <p className="font-medium text-foreground">{s.name}</p>
                  <p className="text-muted-foreground">{s.address}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
