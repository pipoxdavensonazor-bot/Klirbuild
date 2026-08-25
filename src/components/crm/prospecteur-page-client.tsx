"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Radar, Upload } from "lucide-react";
import { PageHeader, StatCard } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/badge";
import { apiUrl } from "@/lib/api-client";
import type { ProspectHitDto, ProspectScanDto } from "@/lib/prospecting/types";

type Meta = {
  regions: { id: string; label: string }[];
  sectors: { id: string; label: string }[];
  focuses: { id: string; label: string }[];
};

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

export function ProspecteurPageClient() {
  const [scans, setScans] = useState<ProspectScanDto[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [region, setRegion] = useState("americas");
  const [sector, setSector] = useState("all");
  const [focus, setFocus] = useState("mix");
  const [extra, setExtra] = useState("");
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  async function load() {
    const res = await fetch(apiUrl("/api/crm/prospecteur"), { credentials: "include" });
    const data = await res.json();
    setScans(data.scans ?? []);
    setMeta(data.meta ?? null);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const latest = scans[0];
  const hits = latest?.hits ?? [];
  const withEmail = hits.filter((h) => h.email).length;

  const extraWebsites = useMemo(
    () =>
      extra
        .split(/[\n,]+/)
        .map((v) => v.trim())
        .filter(Boolean),
    [extra]
  );

  async function runScan() {
    setScanning(true);
    setError("");
    try {
      const res = await fetch(apiUrl("/api/crm/prospecteur"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "scan",
          region,
          sector,
          focus,
          extraWebsites,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Scan impossible.");
        return;
      }
      if (data.error) setError(data.error);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau");
    } finally {
      setScanning(false);
    }
  }

  async function importSelected() {
    const hitIds = Object.entries(selected)
      .filter(([, on]) => on)
      .map(([id]) => id);
    if (!hitIds.length) {
      setError("Cochez au moins un prospect.");
      return;
    }
    setImporting(true);
    setError("");
    try {
      const res = await fetch(apiUrl("/api/crm/prospecteur"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import", hitIds }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Import impossible.");
        return;
      }
      setSelected({});
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau");
    } finally {
      setImporting(false);
    }
  }

  function toggle(hit: ProspectHitDto) {
    setSelected((prev) => ({ ...prev, [hit.id]: !prev[hit.id] }));
  }

  if (loading) return <p className="p-8 text-muted-foreground">Chargement…</p>;

  return (
    <div>
      <PageHeader
        title="Prospecteur Amériques"
        description="Entreprises et startups des Amériques — emails uniquement s’ils sont publiés sur le site officiel (Wikidata, SEC Form D). Pas de LinkedIn, Facebook, Instagram, Gmail ou Hotmail."
        actions={
          <Link href="/crm">
            <Button variant="outline">Retour CRM</Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Dernier scan" value={latest ? latest.status : "—"} />
        <StatCard label="Entreprises" value={String(latest?.discovered ?? 0)} />
        <StatCard label="Emails publiés" value={String(latest?.withEmail ?? withEmail)} />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radar className="h-4 w-4" />
            Nouveau scan — Klirline.ca
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <label className="text-sm">
            Région
            <select className={`${selectClass} mt-1`} value={region} onChange={(e) => setRegion(e.target.value)}>
              {(meta?.regions ?? []).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Secteur
            <select className={`${selectClass} mt-1`} value={sector} onChange={(e) => setSector(e.target.value)}>
              {(meta?.sectors ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Focus
            <select className={`${selectClass} mt-1`} value={focus} onChange={(e) => setFocus(e.target.value)}>
              {(meta?.focuses ?? []).map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm md:col-span-3">
            Sites officiels à ajouter (optionnel, 5 max)
            <Textarea
              className="mt-1"
              placeholder="https://exemple.com"
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
            />
          </label>
          {error ? <p className="text-sm text-red-600 md:col-span-3">{error}</p> : null}
          <div className="flex flex-wrap gap-2 md:col-span-3">
            <Button onClick={() => void runScan()} disabled={scanning}>
              {scanning ? "Scan en cours…" : "Lancer le scan"}
            </Button>
            <Button
              variant="outline"
              onClick={() => void importSelected()}
              disabled={importing || !hits.length}
            >
              <Upload className="h-4 w-4" />
              {importing ? "Import…" : "Importer au CRM"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Résultats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {hits.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun résultat. Lancez un scan pour Haïti, le Canada, les États-Unis ou toutes les Amériques.
            </p>
          ) : (
            hits.map((hit) => (
              <label
                key={hit.id}
                className="flex items-start gap-3 rounded-lg border border-border p-3"
              >
                <Input
                  type="checkbox"
                  className="mt-1 h-4 w-4"
                  checked={Boolean(selected[hit.id])}
                  onChange={() => toggle(hit)}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{hit.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {[hit.country, hit.sector, hit.source].filter(Boolean).join(" · ")}
                    {hit.email ? ` · ${hit.email}` : " · email non publié"}
                  </p>
                  {hit.website ? (
                    <a
                      href={hit.website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-brand-600 hover:underline"
                    >
                      {hit.website}
                    </a>
                  ) : null}
                  {hit.notes ? (
                    <p className="mt-1 text-xs text-muted-foreground">{hit.notes}</p>
                  ) : null}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <StatusBadge status={hit.importedLeadId ? "won" : hit.email ? "active" : "draft"} />
                  <span className="text-xs text-muted-foreground">Score {hit.score}</span>
                </div>
              </label>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
