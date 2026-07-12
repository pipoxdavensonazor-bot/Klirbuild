import { getConstructionWorkspace } from "@/lib/construction/construction-service";
import { getDashboardStats } from "@/lib/dashboard/dashboard-service";
import { listInvoices } from "@/lib/invoices/invoice-service";
import type { MarketProfile } from "@/lib/markets/regions";
import { listTasks } from "@/lib/tasks/task-service";

function fmtMoney(amount: number, currency: string) {
  const code = currency === "XCD" ? "USD" : currency;
  return amount.toLocaleString("fr-CA", { style: "currency", currency: code });
}

export async function buildBusinessContext(companyId: string, market: MarketProfile) {
  const [stats, tasks, invoices] = await Promise.all([
    getDashboardStats(companyId),
    listTasks(companyId),
    listInvoices(companyId),
  ]);

  const openTasks = tasks.filter((t) => t.status !== "done");
  const overdue = invoices.filter((i) => i.status === "overdue");

  return [
    `Revenus MTD : ${fmtMoney(stats.revenue, market.currency)}`,
    `Pipeline : ${fmtMoney(stats.pipeline, market.currency)}`,
    `Tâches ouvertes : ${stats.tasksDue}`,
    openTasks.length
      ? `Exemples : ${openTasks
          .slice(0, 5)
          .map((t) => `${t.title} (${t.status}, ${t.priority})`)
          .join("; ")}`
      : null,
    `Factures en retard : ${overdue.length}`,
    overdue.length
      ? overdue
          .slice(0, 5)
          .map((i) => `${i.number} — ${i.clientName} (${fmtMoney(i.total, market.currency)})`)
          .join("; ")
      : null,
    `Clients : ${stats.clients} · Projets actifs : ${stats.projects}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function buildConstructionContext(companyId: string, market: MarketProfile) {
  const { data, kpis } = await getConstructionWorkspace(companyId);

  const activeJobs = data.jobs.filter((j) =>
    ["in_progress", "sold", "planning"].includes(j.status)
  );
  const riskyJobs = activeJobs.filter(
    (j) => j.budgetCost > 0 && j.actualCost / j.budgetCost > 0.7 && j.progressPct < 90
  );
  const pendingOc = data.changeOrders.filter((c) =>
    ["draft", "submitted"].includes(c.status)
  );
  const hotLeads = data.leads.filter((l) =>
    ["estimate", "negotiation", "qualified"].includes(l.stage)
  );

  return [
    `KPIs : ${kpis.activeJobs} chantiers actifs · backlog ${fmtMoney(kpis.contractBacklog, market.currency)} · pipeline leads ${fmtMoney(kpis.pipeline, market.currency)} · ${kpis.openChangeOrders} OC ouverts · risque marge ${kpis.marginRisk} · alertes CCQ ${kpis.ccqAlerts}`,
    activeJobs.length
      ? `Chantiers :\n${activeJobs
          .slice(0, 8)
          .map(
            (j) =>
              `- ${j.number} ${j.name} · ${j.status} · ${j.progressPct}% · coût ${fmtMoney(j.actualCost, market.currency)} / budget ${fmtMoney(j.budgetCost, market.currency)}`
          )
          .join("\n")}`
      : "Aucun chantier actif.",
    riskyJobs.length
      ? `Risque budget :\n${riskyJobs
          .map(
            (j) =>
              `- ${j.number} : ${Math.round((j.actualCost / j.budgetCost) * 100)}% budget à ${j.progressPct}% avancement`
          )
          .join("\n")}`
      : null,
    pendingOc.length
      ? `OC en attente :\n${pendingOc
          .map((c) => `- ${c.number} ${c.title} · ${fmtMoney(c.amount, market.currency)} · ${c.status}`)
          .join("\n")}`
      : "Aucun OC en attente.",
    hotLeads.length
      ? `Leads chauds :\n${hotLeads
          .map((l) => `- ${l.name} · ${l.stage} · ${fmtMoney(l.valueEstimate, market.currency)}`)
          .join("\n")}`
      : null,
    data.ccqWorkers.length
      ? `CCQ : ${data.ccqWorkers.length} travailleurs · ${kpis.ccqAlerts} alerte(s) conformité`
      : null,
  ]
    .filter(Boolean)
    .join("\n\n");
}
