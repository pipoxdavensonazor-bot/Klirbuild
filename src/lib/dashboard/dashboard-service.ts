import { hasDatabase } from "@/lib/auth/auth-service";
import { listDeals, listLeads } from "@/lib/crm/crm-service";
import { listClients } from "@/lib/clients/client-service";
import { listInvoices } from "@/lib/invoices/invoice-service";
import { listProjects } from "@/lib/projects/project-service";
import { listTasks } from "@/lib/tasks/task-service";
import { activities, kpi, revenueSeries } from "@/lib/mock-data";
import type { ActivityItem } from "@/types";

export type DashboardStats = {
  revenue: number;
  invoicesOpen: number;
  clients: number;
  projects: number;
  tasksDue: number;
  pipeline: number;
  revenueSeries: { month: string; revenue: number }[];
  activities: ActivityItem[];
};

function monthKey(iso: string) {
  return iso.slice(0, 7);
}

export async function getDashboardStats(companyId: string): Promise<DashboardStats> {
  if (!hasDatabase()) {
    return {
      revenue: kpi.revenue,
      invoicesOpen: kpi.invoicesOpen,
      clients: kpi.clients,
      projects: kpi.projects,
      tasksDue: kpi.tasksDue,
      pipeline: kpi.pipeline,
      revenueSeries,
      activities,
    };
  }

  const [invoices, clients, projects, tasks, leads, deals] = await Promise.all([
    listInvoices(companyId),
    listClients(companyId),
    listProjects(companyId),
    listTasks(companyId),
    listLeads(companyId),
    listDeals(companyId),
  ]);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const paidMtd = invoices
    .filter((i) => i.status === "paid" && i.paidAt && new Date(i.paidAt) >= monthStart)
    .reduce((s, i) => s + i.total, 0);

  const invoicesOpen = invoices.filter((i) =>
    ["sent", "pending", "overdue"].includes(i.status)
  ).length;

  const tasksDue = tasks.filter((t) => t.status !== "done").length;
  const activeProjects = projects.filter((p) => p.status === "active").length;

  const pipeline = deals
    .filter((d) => !["won", "lost"].includes(d.stage))
    .reduce((s, d) => s + d.value, 0);

  const byMonth = new Map<string, number>();
  for (const inv of invoices.filter((i) => i.status === "paid" && i.paidAt)) {
    const key = monthKey(inv.paidAt!);
    byMonth.set(key, (byMonth.get(key) ?? 0) + inv.total);
  }
  const series = Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, revenue]) => ({
      month: month.slice(5) + "/" + month.slice(2, 4),
      revenue,
    }));

  const recentActivities: ActivityItem[] = [
    ...invoices.slice(0, 3).map((i) => ({
      id: `act_inv_${i.id}`,
      type: "invoice",
      title: `Facture ${i.number}`,
      description: `${i.clientName} · ${i.status}`,
      at: i.issueDate,
    })),
    ...leads.slice(0, 2).map((l) => ({
      id: `act_lead_${l.id}`,
      type: "lead",
      title: `Lead ${l.name}`,
      description: l.status,
      at: l.createdAt,
    })),
  ].slice(0, 8);

  return {
    revenue: paidMtd,
    invoicesOpen,
    clients: clients.length,
    projects: activeProjects,
    tasksDue,
    pipeline,
    revenueSeries: series.length ? series : [{ month: "MTD", revenue: paidMtd }],
    activities: recentActivities,
  };
}
