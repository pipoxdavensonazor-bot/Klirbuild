"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin, Pencil, Plus, Trash2, X } from "lucide-react";
import { PageHeader, StatCard } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/badge";
import {
  ConstructionCrudPanel,
  type FieldDef,
} from "@/components/construction/construction-crud-panel";
import {
  useConstructionWorkspace,
  useJobSites,
} from "@/components/construction/use-construction-workspace";
import type { ConstructionJob } from "@/modules/construction-os/types";
import { TRADE_LABELS } from "@/modules/construction-os/types";
import { formatCurrency, formatDate } from "@/lib/utils";

const jobFields: FieldDef[] = [
  { key: "number", label: "N° chantier", required: true },
  { key: "name", label: "Nom", required: true, col: "full" },
  { key: "clientName", label: "Client", required: true },
  { key: "superintendent", label: "Surintendant" },
  { key: "address", label: "Adresse", col: "full" },
  { key: "city", label: "Ville" },
  {
    key: "province",
    label: "Province",
    type: "select",
    options: [
      { value: "QC", label: "Québec" },
      { value: "ON", label: "Ontario" },
      { value: "AB", label: "Alberta" },
      { value: "BC", label: "Colombie-Britannique" },
    ],
  },
  {
    key: "status",
    label: "Statut",
    type: "select",
    options: [
      { value: "estimating", label: "Estimation" },
      { value: "sold", label: "Vendu" },
      { value: "in_progress", label: "En cours" },
      { value: "on_hold", label: "En pause" },
      { value: "completed", label: "Terminé" },
      { value: "warranty", label: "Garantie" },
    ],
  },
  { key: "contractValue", label: "Valeur contrat ($)", type: "number" },
  { key: "budgetCost", label: "Budget ($)", type: "number" },
  { key: "actualCost", label: "Coût réel ($)", type: "number" },
  { key: "progressPct", label: "Avancement (%)", type: "number" },
  { key: "holdbackPct", label: "Retenue (%)", type: "number" },
  { key: "startDate", label: "Date début", type: "date" },
  { key: "endDate", label: "Date fin", type: "date" },
];

function emptyJob(): ConstructionJob {
  return {
    id: "",
    number: `CH-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`,
    name: "",
    clientName: "",
    address: "",
    city: "Montréal",
    province: "QC",
    status: "estimating",
    contractValue: 0,
    budgetCost: 0,
    actualCost: 0,
    progressPct: 0,
    holdbackPct: 10,
    startDate: new Date().toISOString().slice(0, 10),
    superintendent: "",
    trades: [],
  };
}

function JobSitesGpsPanel() {
  const { jobSites, saveJobSite, deleteJobSite } = useJobSites();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    address: "",
    clientName: "",
    lat: "45.5017",
    lng: "-73.5673",
    radiusM: "150",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function openCreate() {
    setEditingId(null);
    setForm({
      name: "",
      address: "",
      clientName: "",
      lat: "45.5017",
      lng: "-73.5673",
      radiusM: "150",
    });
    setOpen(true);
    setError("");
  }

  function openEdit(site: (typeof jobSites)[0]) {
    setEditingId(site.id);
    setForm({
      name: site.name,
      address: site.address ?? "",
      clientName: site.clientName ?? "",
      lat: String(site.lat),
      lng: String(site.lng),
      radiusM: String(site.radiusM),
    });
    setOpen(true);
    setError("");
  }

  async function save() {
    if (!form.name.trim()) {
      setError("Nom requis.");
      return;
    }
    setBusy(true);
    try {
      await saveJobSite({
        id: editingId ?? undefined,
        name: form.name.trim(),
        address: form.address.trim() || undefined,
        clientName: form.clientName.trim() || undefined,
        lat: Number(form.lat) || 45.5017,
        lng: Number(form.lng) || -73.5673,
        radiusM: Number(form.radiusM) || 150,
      });
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mt-8">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4 text-brand-600" />
            Chantiers GPS (pointage)
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Zones géolocalisées pour le chronomètre et le pointage employés.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Ajouter chantier GPS
        </Button>
      </CardHeader>
      <CardContent>
        {open ? (
          <div className="mb-4 rounded-lg border border-brand-200 bg-brand-50/30 p-4 dark:bg-brand-950/20">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-medium">{editingId ? "Modifier" : "Nouveau chantier GPS"}</p>
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm sm:col-span-2">
                <span className="text-muted-foreground">Nom *</span>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </label>
              <label className="text-sm sm:col-span-2">
                <span className="text-muted-foreground">Adresse</span>
                <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
              </label>
              <label className="text-sm">
                <span className="text-muted-foreground">Client</span>
                <Input value={form.clientName} onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))} />
              </label>
              <label className="text-sm">
                <span className="text-muted-foreground">Rayon GPS (m)</span>
                <Input value={form.radiusM} onChange={(e) => setForm((f) => ({ ...f, radiusM: e.target.value }))} />
              </label>
              <label className="text-sm">
                <span className="text-muted-foreground">Latitude</span>
                <Input value={form.lat} onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value }))} />
              </label>
              <label className="text-sm">
                <span className="text-muted-foreground">Longitude</span>
                <Input value={form.lng} onChange={(e) => setForm((f) => ({ ...f, lng: e.target.value }))} />
              </label>
            </div>
            {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
            <div className="mt-3 flex gap-2">
              <Button size="sm" disabled={busy} onClick={() => void save()}>
                Enregistrer
              </Button>
              <Button size="sm" variant="outline" onClick={() => setOpen(false)}>
                Annuler
              </Button>
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          {jobSites.map((site) => (
            <div
              key={site.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3"
            >
              <div>
                <p className="font-medium">{site.name}</p>
                <p className="text-xs text-muted-foreground">
                  {site.address ?? "—"} · rayon {site.radiusM}m · {site.lat.toFixed(4)}, {site.lng.toFixed(4)}
                </p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => openEdit(site)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600"
                  onClick={() => void deleteJobSite(site.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function ConstructionJobsPageClient() {
  const { data, loading, error, saveEntity, removeEntity } = useConstructionWorkspace();
  const jobs = data?.jobs ?? [];
  const active = jobs.filter((j) => ["in_progress", "sold"].includes(j.status));
  const totalContract = active.reduce((s, j) => s + j.contractValue, 0);
  const totalActual = active.reduce((s, j) => s + j.actualCost, 0);

  if (loading) return <p className="p-8 text-muted-foreground">Chargement…</p>;
  if (error) return <p className="p-8 text-red-700">{error}</p>;

  return (
    <div>
      <PageHeader
        title="Chantiers ERP"
        description="Job costing, avancement, budget vs réel — tout est modifiable."
        actions={
          <>
            <Link href="/construction/estimates">
              <Button variant="outline">Estimés</Button>
            </Link>
            <Link href="/timeclock">
              <Button variant="outline">Pointage GPS</Button>
            </Link>
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Actifs" value={String(active.length)} />
        <StatCard label="Valeur contrats" value={formatCurrency(totalContract)} />
        <StatCard label="Coûts réels" value={formatCurrency(totalActual)} />
      </div>

      <ConstructionCrudPanel<ConstructionJob>
        entity="jobs"
        title="Chantiers ERP"
        items={jobs}
        fields={jobFields}
        addLabel="Nouveau chantier"
        emptyItem={emptyJob}
        onSave={async (entity, payload) => {
          await saveEntity(entity, payload);
        }}
        onRemove={async (entity, id) => {
          await removeEntity(entity, id);
        }}
        columns={[
          {
            key: "name",
            label: "Chantier",
            format: (j) => `${j.number} · ${j.name}`,
          },
          {
            key: "status",
            label: "Statut",
            format: (j) => j.status,
          },
          {
            key: "contractValue",
            label: "Contrat",
            format: (j) => (j.contractValue ? formatCurrency(j.contractValue) : "—"),
          },
          {
            key: "budgetCost",
            label: "Budget / Réel",
            format: (j) =>
              `${formatCurrency(j.budgetCost)} / ${formatCurrency(j.actualCost)}`,
          },
          {
            key: "progressPct",
            label: "Avancement",
            format: (j) => `${j.progressPct}%`,
          },
          {
            key: "superintendent",
            label: "Surintendant",
          },
        ]}
      />

      <div className="mt-4 overflow-hidden rounded-xl border border-border">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-muted-foreground dark:bg-slate-900/50">
            <tr>
              <th className="px-4 py-2 text-left">Détail rapide</th>
              <th className="px-4 py-2 text-left">Client</th>
              <th className="px-4 py-2 text-left">Métiers</th>
              <th className="px-4 py-2 text-left">Dates</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id} className="border-t border-border">
                <td className="px-4 py-2">
                  <StatusBadge status={job.status} />
                </td>
                <td className="px-4 py-2">{job.clientName}</td>
                <td className="px-4 py-2 text-xs text-muted-foreground">
                  {job.trades?.map((t) => TRADE_LABELS[t] ?? t).join(", ") || "—"}
                </td>
                <td className="px-4 py-2 text-xs">
                  {formatDate(job.startDate)}
                  {job.endDate ? ` → ${formatDate(job.endDate)}` : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <JobSitesGpsPanel />
    </div>
  );
}
