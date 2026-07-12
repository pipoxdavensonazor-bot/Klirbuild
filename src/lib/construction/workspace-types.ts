import type {
  ChangeOrder,
  ConstructionEstimate,
  ConstructionJob,
  ConstructionLead,
  CcqHourDeclaration,
  CcqWorker,
  MarketingCampaign,
  ProgressInvoice,
} from "@/modules/construction-os/types";
import {
  changeOrders,
  ccqDeclarations,
  ccqWorkers,
  constructionEstimates,
  constructionJobs,
  constructionLeads,
  marketingCampaigns,
  progressInvoices,
} from "@/modules/construction-os/mock-data";

export type ConstructionEntityKey =
  | "jobs"
  | "estimates"
  | "changeOrders"
  | "leads"
  | "ccqWorkers"
  | "ccqDeclarations"
  | "progressInvoices"
  | "marketingCampaigns";

export type ConstructionWorkspaceData = {
  jobs: ConstructionJob[];
  estimates: ConstructionEstimate[];
  changeOrders: ChangeOrder[];
  leads: ConstructionLead[];
  ccqWorkers: CcqWorker[];
  ccqDeclarations: CcqHourDeclaration[];
  progressInvoices: ProgressInvoice[];
  marketingCampaigns: MarketingCampaign[];
};

export function defaultWorkspace(): ConstructionWorkspaceData {
  return {
    jobs: structuredClone(constructionJobs),
    estimates: structuredClone(constructionEstimates),
    changeOrders: structuredClone(changeOrders),
    leads: structuredClone(constructionLeads),
    ccqWorkers: structuredClone(ccqWorkers),
    ccqDeclarations: structuredClone(ccqDeclarations),
    progressInvoices: structuredClone(progressInvoices),
    marketingCampaigns: structuredClone(marketingCampaigns),
  };
}

export function constructionKpisFrom(data: ConstructionWorkspaceData) {
  const active = data.jobs.filter((j) => ["in_progress", "sold"].includes(j.status));
  const pipeline = data.leads
    .filter((l) => !["won", "lost"].includes(l.stage))
    .reduce((s, l) => s + l.valueEstimate, 0);
  const contractBacklog = active.reduce((s, j) => s + j.contractValue, 0);
  const marginRisk = active.filter(
    (j) => j.actualCost / Math.max(j.budgetCost, 1) > 0.85 && j.progressPct < 90
  ).length;
  const ccqAlerts = data.ccqWorkers.filter(
    (w) =>
      !w.apprenticeshipRatioOk ||
      new Date(w.cardExpires) < new Date(Date.now() + 30 * 86400000) ||
      Boolean(w.trainingDue)
  ).length;
  const mktSpend = data.marketingCampaigns.reduce((s, c) => s + c.spend, 0);
  const mktRevenue = data.marketingCampaigns.reduce((s, c) => s + c.revenue, 0);
  const holdbackOpen = data.progressInvoices
    .filter((i) => i.status !== "paid")
    .reduce((s, i) => s + i.holdback, 0);

  return {
    activeJobs: active.length,
    contractBacklog,
    pipeline,
    marginRisk,
    ccqAlerts,
    mktSpend,
    mktRevenue,
    holdbackOpen,
    openChangeOrders: data.changeOrders.filter((c) =>
      ["draft", "submitted"].includes(c.status)
    ).length,
  };
}

export function newEntityId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
