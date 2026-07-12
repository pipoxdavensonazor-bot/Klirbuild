"use client";

import Link from "next/link";
import {
  AlertTriangle,
  HardHat,
  FileSpreadsheet,
  FileDiff,
  Users,
  BadgeCheck,
  CreditCard,
  Megaphone,
  Bot,
} from "lucide-react";
import { PageHeader, StatCard } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import {
  ConstructionCrudPanel,
  type FieldDef,
} from "@/components/construction/construction-crud-panel";
import { useConstructionWorkspace } from "@/components/construction/use-construction-workspace";
import type {
  ChangeOrder,
  ConstructionEstimate,
  ConstructionLead,
  CcqHourDeclaration,
  CcqWorker,
  MarketingCampaign,
  ProgressInvoice,
} from "@/modules/construction-os/types";
import {
  COMPETENCY_LABELS,
  TRADE_LABELS,
} from "@/modules/construction-os/types";
import { formatCurrency, formatDate } from "@/lib/utils";

// ——— Hub ———
export function ConstructionHubPageClient() {
  const { data, kpis, loading, error } = useConstructionWorkspace();
  const jobs = data?.jobs ?? [];
  if (loading) return <p className="p-8 text-muted-foreground">Chargement…</p>;
  if (error) return <p className="p-8 text-red-700">{error}</p>;
  const kpi = kpis ?? {
    activeJobs: 0,
    contractBacklog: 0,
    pipeline: 0,
    marginRisk: 0,
    ccqAlerts: 0,
    holdbackOpen: 0,
    openChangeOrders: 0,
    mktRevenue: 0,
  };

  const pillars = [
    { href: "/construction/jobs", title: "ERP Chantier", desc: "Jobs, coûts, avancement", icon: HardHat },
    { href: "/construction/estimates", title: "Estimés", desc: "Soumissions + taxes", icon: FileSpreadsheet },
    { href: "/construction/change-orders", title: "Ordres de changement", desc: "Approbations & extras", icon: FileDiff },
    { href: "/construction/crm", title: "CRM Construction", desc: "Leads & pipeline", icon: Users },
    { href: "/construction/ccq", title: "CCQ", desc: "Métiers, cartes, heures", icon: BadgeCheck },
    { href: "/construction/payments", title: "Paiements", desc: "Facturation progressive", icon: CreditCard },
    { href: "/construction/marketing", title: "Marketing", desc: "Campagnes & ROI", icon: Megaphone },
    { href: "/construction/ai", title: "IA Chantier", desc: "Résumés & risques", icon: Bot },
  ];

  return (
    <div>
      <PageHeader
        title="Construction OS"
        description="ERP + CRM + IA + CCQ + Paiements + Marketing — tout modifiable."
        actions={
          <>
            <Link href="/timeclock"><Button variant="outline">Pointage GPS</Button></Link>
            <Link href="/construction/jobs"><Button>Chantiers ERP</Button></Link>
          </>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Chantiers actifs" value={String(kpi.activeJobs)} hint={formatCurrency(kpi.contractBacklog) + " backlog"} />
        <StatCard label="Pipeline CRM" value={formatCurrency(kpi.pipeline)} hint={`${kpi.openChangeOrders} OC ouverts`} />
        <StatCard label="Alertes CCQ" value={String(kpi.ccqAlerts)} icon={<AlertTriangle className="h-4 w-4" />} />
        <StatCard label="Retenues ouvertes" value={formatCurrency(kpi.holdbackOpen)} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {pillars.map((p) => {
          const Icon = p.icon;
          return (
            <Link key={p.href} href={p.href} className="rounded-xl border border-border bg-card p-4 shadow-soft transition hover:border-brand-300">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <Icon className="h-4 w-4" />
              </div>
              <p className="font-semibold">{p.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
            </Link>
          );
        })}
      </div>
      <Card className="mt-6">
        <CardHeader><CardTitle>Chantiers récents</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {jobs.slice(0, 4).map((job) => (
            <Link key={job.id} href="/construction/jobs" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3 transition hover:bg-slate-50 dark:hover:bg-slate-900/40">
              <div>
                <p className="text-sm font-medium">{job.number} · {job.name}</p>
                <p className="text-xs text-muted-foreground">{job.city} · {job.clientName}</p>
              </div>
              <p className="text-sm font-semibold">{job.progressPct}%</p>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ——— Estimates ———
const estimateFields: FieldDef[] = [
  { key: "number", label: "N° estimé", required: true },
  { key: "title", label: "Titre", required: true, col: "full" },
  { key: "clientName", label: "Client", required: true },
  { key: "validUntil", label: "Valide jusqu'au", type: "date" },
  { key: "status", label: "Statut", type: "select", options: [
    { value: "draft", label: "Brouillon" }, { value: "sent", label: "Envoyé" },
    { value: "accepted", label: "Accepté" }, { value: "rejected", label: "Refusé" }, { value: "expired", label: "Expiré" },
  ]},
  { key: "subtotal", label: "Sous-total ($)", type: "number" },
  { key: "tps", label: "TPS ($)", type: "number" },
  { key: "tvq", label: "TVQ ($)", type: "number" },
  { key: "total", label: "Total TTC ($)", type: "number" },
];

export function ConstructionEstimatesPageClient() {
  const { data, loading, error, saveEntity, removeEntity } = useConstructionWorkspace();
  const items = data?.estimates ?? [];
  if (loading) return <p className="p-8 text-muted-foreground">Chargement…</p>;
  if (error) return <p className="p-8 text-red-700">{error}</p>;
  return (
    <div>
      <PageHeader title="Estimés & soumissions" description="Créez et modifiez vos soumissions construction." />
      <ConstructionCrudPanel<ConstructionEstimate>
        entity="estimates" title="Estimés" items={items} fields={estimateFields} addLabel="Nouvel estimé"
        emptyItem={() => ({ id: "", number: `EST-${Date.now()}`, clientName: "", title: "", status: "draft", subtotal: 0, tps: 0, tvq: 0, total: 0, validUntil: new Date().toISOString().slice(0, 10), lines: [] })}
        onSave={async (e, p) => { await saveEntity(e, p); }}
        onRemove={async (e, id) => { await removeEntity(e, id); }}
        columns={[
          { key: "number", label: "N°", format: (r) => r.number },
          { key: "title", label: "Titre" },
          { key: "clientName", label: "Client" },
          { key: "total", label: "Total", format: (r) => formatCurrency(r.total) },
          { key: "status", label: "Statut" },
        ]}
      />
    </div>
  );
}

// ——— Change Orders ———
const coFields: FieldDef[] = [
  { key: "number", label: "N° OC", required: true },
  { key: "jobName", label: "Chantier", required: true },
  { key: "title", label: "Titre", required: true },
  { key: "reason", label: "Raison", type: "textarea", col: "full" },
  { key: "amount", label: "Montant ($)", type: "number" },
  { key: "status", label: "Statut", type: "select", options: [
    { value: "draft", label: "Brouillon" }, { value: "submitted", label: "Soumis" },
    { value: "approved", label: "Approuvé" }, { value: "rejected", label: "Refusé" }, { value: "invoiced", label: "Facturé" },
  ]},
  { key: "submittedAt", label: "Date soumission", type: "date" },
  { key: "approvedAt", label: "Date approbation", type: "date" },
];

export function ConstructionChangeOrdersPageClient() {
  const { data, loading, error, saveEntity, removeEntity } = useConstructionWorkspace();
  const items = data?.changeOrders ?? [];
  if (loading) return <p className="p-8 text-muted-foreground">Chargement…</p>;
  if (error) return <p className="p-8 text-red-700">{error}</p>;
  return (
    <div>
      <PageHeader title="Ordres de changement" description="Extras et approbations — modifiables." />
      <ConstructionCrudPanel<ChangeOrder>
        entity="changeOrders" title="Ordres de changement" items={items} fields={coFields} addLabel="Nouvel OC"
        emptyItem={() => ({ id: "", number: "", jobId: "", jobName: "", title: "", reason: "", amount: 0, status: "draft" })}
        onSave={async (e, p) => { await saveEntity(e, p); }}
        onRemove={async (e, id) => { await removeEntity(e, id); }}
        columns={[
          { key: "number", label: "N°" },
          { key: "jobName", label: "Chantier" },
          { key: "title", label: "Titre" },
          { key: "amount", label: "Montant", format: (r) => formatCurrency(r.amount) },
          { key: "status", label: "Statut" },
        ]}
      />
    </div>
  );
}

// ——— CRM ———
const leadFields: FieldDef[] = [
  { key: "name", label: "Projet / lead", required: true, col: "full" },
  { key: "source", label: "Source" },
  { key: "projectType", label: "Type de projet" },
  { key: "city", label: "Ville" },
  { key: "owner", label: "Responsable" },
  { key: "valueEstimate", label: "Valeur estimée ($)", type: "number" },
  { key: "stage", label: "Étape", type: "select", options: [
    { value: "new", label: "Nouveau" }, { value: "qualified", label: "Qualifié" },
    { value: "estimate", label: "Estimation" }, { value: "negotiation", label: "Négociation" },
    { value: "won", label: "Gagné" }, { value: "lost", label: "Perdu" },
  ]},
];

export function ConstructionCrmPageClient() {
  const { data, loading, error, saveEntity, removeEntity } = useConstructionWorkspace();
  const items = data?.leads ?? [];
  if (loading) return <p className="p-8 text-muted-foreground">Chargement…</p>;
  if (error) return <p className="p-8 text-red-700">{error}</p>;
  const pipeline = items.filter((l) => !["won", "lost"].includes(l.stage)).reduce((s, l) => s + l.valueEstimate, 0);
  return (
    <div>
      <PageHeader title="CRM Construction" description="Pipeline de soumissions modifiable." />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Leads ouverts" value={String(items.filter((l) => !["won", "lost"].includes(l.stage)).length)} />
        <StatCard label="Pipeline" value={formatCurrency(pipeline)} />
      </div>
      <ConstructionCrudPanel<ConstructionLead>
        entity="leads" title="Leads" items={items} fields={leadFields} addLabel="Nouveau lead"
        emptyItem={() => ({ id: "", name: "", source: "Référence", projectType: "Rénovation", valueEstimate: 0, stage: "new", owner: "", city: "Montréal" })}
        onSave={async (e, p) => { await saveEntity(e, p); }}
        onRemove={async (e, id) => { await removeEntity(e, id); }}
        columns={[
          { key: "name", label: "Projet" },
          { key: "source", label: "Source" },
          { key: "stage", label: "Étape", format: (r) => r.stage },
          { key: "valueEstimate", label: "Valeur", format: (r) => formatCurrency(r.valueEstimate) },
          { key: "owner", label: "Owner" },
        ]}
      />
    </div>
  );
}

// ——— CCQ ———
const workerFields: FieldDef[] = [
  { key: "name", label: "Nom", required: true },
  { key: "ccqNumber", label: "N° CCQ" },
  { key: "trade", label: "Métier", type: "select", options: Object.entries(TRADE_LABELS).map(([v, l]) => ({ value: v, label: l })) },
  { key: "competency", label: "Compétence", type: "select", options: Object.entries(COMPETENCY_LABELS).map(([v, l]) => ({ value: v, label: l })) },
  { key: "cardExpires", label: "Expiration carte", type: "date" },
  { key: "hoursThisPeriod", label: "Heures période", type: "number" },
  { key: "apprenticeshipRatioOk", label: "Ratio apprenti OK", type: "checkbox" },
  { key: "trainingDue", label: "Formation due", type: "date" },
];

const declFields: FieldDef[] = [
  { key: "workerName", label: "Travailleur", required: true },
  { key: "jobName", label: "Chantier", required: true },
  { key: "trade", label: "Métier", type: "select", options: Object.entries(TRADE_LABELS).map(([v, l]) => ({ value: v, label: l })) },
  { key: "weekEnding", label: "Semaine fin", type: "date" },
  { key: "hours", label: "Heures", type: "number" },
  { key: "status", label: "Statut", type: "select", options: [
    { value: "draft", label: "Brouillon" }, { value: "ready", label: "Prêt" }, { value: "submitted", label: "Soumis" },
  ]},
];

export function ConstructionCcqPageClient() {
  const { data, loading, error, saveEntity, removeEntity } = useConstructionWorkspace();
  const workers = data?.ccqWorkers ?? [];
  const decls = data?.ccqDeclarations ?? [];
  if (loading) return <p className="p-8 text-muted-foreground">Chargement…</p>;
  if (error) return <p className="p-8 text-red-700">{error}</p>;
  return (
    <div>
      <PageHeader title="CCQ — Conformité Québec" description="Travailleurs et déclarations modifiables." />
      <div className="space-y-8">
        <ConstructionCrudPanel<CcqWorker>
          entity="ccqWorkers" title="Travailleurs & métiers" items={workers} fields={workerFields} addLabel="Ajouter travailleur"
          emptyItem={() => ({ id: "", name: "", trade: "charpentier-menuisier", competency: "compagnon", ccqNumber: "", cardExpires: "", hoursThisPeriod: 0, apprenticeshipRatioOk: true })}
          onSave={async (e, p) => { await saveEntity(e, p); }}
          onRemove={async (e, id) => { await removeEntity(e, id); }}
          columns={[
            { key: "name", label: "Nom" },
            { key: "trade", label: "Métier", format: (r) => TRADE_LABELS[r.trade] },
            { key: "competency", label: "Statut", format: (r) => COMPETENCY_LABELS[r.competency] },
            { key: "hoursThisPeriod", label: "Heures", format: (r) => `${r.hoursThisPeriod}h` },
          ]}
        />
        <ConstructionCrudPanel<CcqHourDeclaration>
          entity="ccqDeclarations" title="Déclarations d'heures" items={decls} fields={declFields} addLabel="Nouvelle déclaration"
          emptyItem={() => ({ id: "", workerId: "", workerName: "", jobId: "", jobName: "", trade: "charpentier-menuisier", weekEnding: "", hours: 0, status: "draft" })}
          onSave={async (e, p) => { await saveEntity(e, p); }}
          onRemove={async (e, id) => { await removeEntity(e, id); }}
          columns={[
            { key: "workerName", label: "Travailleur" },
            { key: "jobName", label: "Chantier" },
            { key: "hours", label: "Heures", format: (r) => `${r.hours}h` },
            { key: "status", label: "Statut" },
          ]}
        />
      </div>
    </div>
  );
}

// ——— Payments ———
const invFields: FieldDef[] = [
  { key: "number", label: "N° facture", required: true },
  { key: "jobName", label: "Chantier", required: true },
  { key: "periodLabel", label: "Période", col: "full" },
  { key: "completionPct", label: "Complété (%)", type: "number" },
  { key: "amount", label: "Montant ($)", type: "number" },
  { key: "holdback", label: "Retenue ($)", type: "number" },
  { key: "netDue", label: "Net à recevoir ($)", type: "number" },
  { key: "dueDate", label: "Échéance", type: "date" },
  { key: "status", label: "Statut", type: "select", options: [
    { value: "draft", label: "Brouillon" }, { value: "sent", label: "Envoyée" },
    { value: "partial", label: "Partielle" }, { value: "paid", label: "Payée" },
  ]},
];

export function ConstructionPaymentsPageClient() {
  const { data, loading, error, saveEntity, removeEntity } = useConstructionWorkspace();
  const items = data?.progressInvoices ?? [];
  if (loading) return <p className="p-8 text-muted-foreground">Chargement…</p>;
  if (error) return <p className="p-8 text-red-700">{error}</p>;
  return (
    <div>
      <PageHeader title="Paiements chantier" description="Factures d'avancement modifiables." actions={
        <Link href="/payments"><Button variant="outline">Stripe / paiements</Button></Link>
      } />
      <ConstructionCrudPanel<ProgressInvoice>
        entity="progressInvoices" title="Factures d'avancement" items={items} fields={invFields} addLabel="Nouvelle facture"
        emptyItem={() => ({ id: "", jobId: "", jobName: "", number: "", periodLabel: "", completionPct: 0, amount: 0, holdback: 0, netDue: 0, status: "draft", dueDate: new Date().toISOString().slice(0, 10) })}
        onSave={async (e, p) => { await saveEntity(e, p); }}
        onRemove={async (e, id) => { await removeEntity(e, id); }}
        columns={[
          { key: "number", label: "Facture" },
          { key: "jobName", label: "Chantier" },
          { key: "amount", label: "Montant", format: (r) => formatCurrency(r.amount) },
          { key: "netDue", label: "Net", format: (r) => formatCurrency(r.netDue) },
          { key: "status", label: "Statut" },
          { key: "dueDate", label: "Échéance", format: (r) => formatDate(r.dueDate) },
        ]}
      />
    </div>
  );
}

// ——— Marketing ———
const mktFields: FieldDef[] = [
  { key: "name", label: "Campagne", required: true, col: "full" },
  { key: "channel", label: "Canal", type: "select", options: [
    { value: "google", label: "Google" }, { value: "meta", label: "Meta" },
    { value: "seo", label: "SEO" }, { value: "referral", label: "Référence" }, { value: "email", label: "Courriel" },
  ]},
  { key: "status", label: "Statut", type: "select", options: [
    { value: "active", label: "Active" }, { value: "paused", label: "Pause" }, { value: "ended", label: "Terminée" },
  ]},
  { key: "spend", label: "Dépenses ($)", type: "number" },
  { key: "leads", label: "Leads", type: "number" },
  { key: "contracts", label: "Contrats", type: "number" },
  { key: "revenue", label: "Revenus ($)", type: "number" },
];

export function ConstructionMarketingPageClient() {
  const { data, loading, error, saveEntity, removeEntity } = useConstructionWorkspace();
  const items = data?.marketingCampaigns ?? [];
  if (loading) return <p className="p-8 text-muted-foreground">Chargement…</p>;
  if (error) return <p className="p-8 text-red-700">{error}</p>;
  const spend = items.reduce((s, c) => s + c.spend, 0);
  const revenue = items.reduce((s, c) => s + c.revenue, 0);
  return (
    <div>
      <PageHeader title="Marketing PME" description="Campagnes modifiables." actions={
        <Link href="/social-ads"><Button variant="outline">Pubs réseaux</Button></Link>
      } />
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <StatCard label="Dépenses" value={formatCurrency(spend)} />
        <StatCard label="Revenus" value={formatCurrency(revenue)} hint={spend > 0 ? `ROI ${Math.round((revenue / spend) * 10) / 10}x` : undefined} />
      </div>
      <ConstructionCrudPanel<MarketingCampaign>
        entity="marketingCampaigns" title="Campagnes" items={items} fields={mktFields} addLabel="Nouvelle campagne"
        emptyItem={() => ({ id: "", name: "", channel: "google", status: "active", spend: 0, leads: 0, contracts: 0, revenue: 0 })}
        onSave={async (e, p) => { await saveEntity(e, p); }}
        onRemove={async (e, id) => { await removeEntity(e, id); }}
        columns={[
          { key: "name", label: "Campagne" },
          { key: "channel", label: "Canal" },
          { key: "spend", label: "Spend", format: (r) => formatCurrency(r.spend) },
          { key: "leads", label: "Leads" },
          { key: "revenue", label: "Revenus", format: (r) => formatCurrency(r.revenue) },
          { key: "status", label: "Statut" },
        ]}
      />
    </div>
  );
}
