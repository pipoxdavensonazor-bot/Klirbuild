import Link from "next/link";
import { PageHeader, StatCard } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { constructionJobs } from "@/modules/construction-os/mock-data";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function ConstructionJobsPage() {
  const active = constructionJobs.filter((j) =>
    ["in_progress", "sold"].includes(j.status)
  );
  const totalContract = active.reduce((s, j) => s + j.contractValue, 0);
  const totalActual = active.reduce((s, j) => s + j.actualCost, 0);

  return (
    <div>
      <PageHeader
        title="Chantiers ERP"
        description="Job costing, avancement, budget vs réel — cœur opérationnel Construction OS."
        actions={
          <>
            <Link href="/construction/estimates">
              <Button variant="outline">Nouvel estimé</Button>
            </Link>
            <Button>Nouveau chantier</Button>
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Actifs" value={String(active.length)} />
        <StatCard label="Valeur contrats" value={formatCurrency(totalContract)} />
        <StatCard label="Coûts réels" value={formatCurrency(totalActual)} />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted-foreground dark:bg-slate-900/50">
            <tr>
              <th className="px-4 py-3">Chantier</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">Contrat</th>
              <th className="px-4 py-3">Budget / Réel</th>
              <th className="px-4 py-3">Avancement</th>
              <th className="px-4 py-3">Surintendant</th>
            </tr>
          </thead>
          <tbody>
            {constructionJobs.map((job) => {
              const burn = job.budgetCost
                ? Math.round((job.actualCost / job.budgetCost) * 100)
                : 0;
              return (
                <tr key={job.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <p className="font-medium">
                      {job.number} · {job.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {job.address}, {job.city} ({job.province})
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Début {formatDate(job.startDate)}
                      {job.endDate ? ` → ${formatDate(job.endDate)}` : ""}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={job.status} />
                  </td>
                  <td className="px-4 py-3">
                    {job.contractValue
                      ? formatCurrency(job.contractValue)
                      : "—"}
                    <p className="text-xs text-muted-foreground">
                      Retenue {job.holdbackPct}%
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p>
                      {formatCurrency(job.budgetCost)} /{" "}
                      {formatCurrency(job.actualCost)}
                    </p>
                    <p
                      className={`text-xs ${
                        burn > 90 ? "text-red-600" : "text-muted-foreground"
                      }`}
                    >
                      {burn}% du budget consommé
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="mb-1 text-sm font-medium">{job.progressPct}%</div>
                    <div className="h-2 w-28 rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-2 rounded-full bg-brand-500"
                        style={{ width: `${job.progressPct}%` }}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3">{job.superintendent}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
