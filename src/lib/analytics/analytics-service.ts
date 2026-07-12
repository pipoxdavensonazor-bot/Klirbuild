import { hasDatabase } from "@/lib/auth/auth-service";
import { listDeals, listLeads } from "@/lib/crm/crm-service";
import { listClients } from "@/lib/clients/client-service";
import { listInvoices } from "@/lib/invoices/invoice-service";
import { listProjects } from "@/lib/projects/project-service";
import { listTasks } from "@/lib/tasks/task-service";

const EMPTY_ANALYTICS: AnalyticsStats = {
  revenueMtd: 0,
  mrr: 0,
  pipeline: 0,
  winRate: 0,
  revenueSeries: [],
  moduleVolume: [],
  summary: "Aucune donnée — connectez Postgres.",
  overdueInvoices: 0,
  tasksOpen: 0,
  activeProjects: 0,
  leadsOpen: 0,
};

export type AnalyticsVolume = { name: string; value: number };

export type AnalyticsStats = {
  revenueMtd: number;
  mrr: number;
  pipeline: number;
  winRate: number;
  revenueSeries: { month: string; revenue: number }[];
  moduleVolume: AnalyticsVolume[];
  summary: string;
  overdueInvoices: number;
  tasksOpen: number;
  activeProjects: number;
  leadsOpen: number;
};

function monthKey(iso: string) {
  return iso.slice(0, 7);
}

function formatMonthLabel(key: string) {
  return `${key.slice(5)}/${key.slice(2, 4)}`;
}

export async function getAnalyticsStats(companyId: string): Promise<AnalyticsStats> {
  if (!hasDatabase()) return EMPTY_ANALYTICS;

  const [invoiceList, clientList, projectList, taskList, leadList, dealList] =
    await Promise.all([
      listInvoices(companyId),
      listClients(companyId),
      listProjects(companyId),
      listTasks(companyId),
      listLeads(companyId),
      listDeals(companyId),
    ]);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const paidMtd = invoiceList
    .filter((i) => i.status === "paid" && i.paidAt && new Date(i.paidAt) >= monthStart)
    .reduce((s, i) => s + i.total, 0);

  const byMonth = new Map<string, number>();
  for (const inv of invoiceList.filter((i) => i.status === "paid" && i.paidAt)) {
    const key = monthKey(inv.paidAt!);
    byMonth.set(key, (byMonth.get(key) ?? 0) + inv.total);
  }

  const sortedMonths = Array.from(byMonth.entries()).sort(([a], [b]) => a.localeCompare(b));
  const last3 = sortedMonths.slice(-3);
  const mrr =
    last3.length > 0
      ? Math.round(last3.reduce((s, [, v]) => s + v, 0) / last3.length)
      : paidMtd;

  const series = sortedMonths.slice(-7).map(([month, revenue]) => ({
    month: formatMonthLabel(month),
    revenue,
  }));

  const pipeline = dealList
    .filter((d) => !["won", "lost"].includes(d.stage))
    .reduce((s, d) => s + d.value, 0);

  const won = dealList.filter((d) => d.stage === "won").length;
  const winRate = Math.round((won / Math.max(dealList.length, 1)) * 100) || 0;

  const overdueInvoices = invoiceList.filter((i) => i.status === "overdue").length;
  const tasksOpen = taskList.filter((t) => t.status !== "done").length;
  const activeProjects = projectList.filter((p) => p.status === "active").length;
  const leadsOpen = leadList.filter((l) => l.status !== "unqualified").length;

  const pipelineFmt = pipeline.toLocaleString("fr-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  });

  let summary = `Revenus du mois : ${paidMtd.toLocaleString("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 })}. Pipeline CRM : ${pipelineFmt}.`;
  if (overdueInvoices > 0) {
    summary += ` Attention : ${overdueInvoices} facture(s) en retard.`;
  } else {
    summary += ` Aucune facture en retard.`;
  }
  summary += ` ${tasksOpen} tâche(s) ouverte(s) sur ${activeProjects} projet(s) actif(s). Taux de conversion deals : ${winRate} %.`;

  return {
    revenueMtd: paidMtd,
    mrr,
    pipeline,
    winRate,
    revenueSeries: series.length ? series : [{ month: "MTD", revenue: paidMtd }],
    moduleVolume: [
      { name: "Clients", value: clientList.length },
      { name: "Factures", value: invoiceList.length },
      { name: "Tâches", value: taskList.length },
      { name: "Deals", value: dealList.length },
    ],
    summary,
    overdueInvoices,
    tasksOpen,
    activeProjects,
    leadsOpen,
  };
}
