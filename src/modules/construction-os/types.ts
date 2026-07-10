export type JobStatus =
  | "estimating"
  | "sold"
  | "in_progress"
  | "on_hold"
  | "completed"
  | "warranty";

export type EstimateStatus = "draft" | "sent" | "accepted" | "rejected" | "expired";

export type ChangeOrderStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "invoiced";

export type CcqTradeCode =
  | "charpentier-menuisier"
  | "electricien"
  | "ferblantier"
  | "monteur-mecaniciens"
  | "peintre"
  | "manoeuvre"
  | "operateur-pelle";

export type CcqCompetency =
  | "apprenti_1"
  | "apprenti_2"
  | "apprenti_3"
  | "compagnon"
  | "contremaitre";

export type ConstructionJob = {
  id: string;
  number: string;
  name: string;
  clientName: string;
  address: string;
  city: string;
  province: "QC" | "ON" | "AB" | "BC";
  status: JobStatus;
  contractValue: number;
  budgetCost: number;
  actualCost: number;
  progressPct: number;
  holdbackPct: number;
  startDate: string;
  endDate?: string;
  superintendent: string;
  trades: CcqTradeCode[];
};

export type EstimateLine = {
  id: string;
  category: "labor" | "material" | "subcontract" | "equipment" | "other";
  description: string;
  qty: number;
  unit: string;
  unitCost: number;
  total: number;
};

export type ConstructionEstimate = {
  id: string;
  number: string;
  jobId?: string;
  clientName: string;
  title: string;
  status: EstimateStatus;
  subtotal: number;
  tps: number;
  tvq: number;
  total: number;
  validUntil: string;
  lines: EstimateLine[];
};

export type ChangeOrder = {
  id: string;
  number: string;
  jobId: string;
  jobName: string;
  title: string;
  reason: string;
  amount: number;
  status: ChangeOrderStatus;
  submittedAt?: string;
  approvedAt?: string;
};

export type CcqWorker = {
  id: string;
  name: string;
  trade: CcqTradeCode;
  competency: CcqCompetency;
  ccqNumber: string;
  cardExpires: string;
  hoursThisPeriod: number;
  apprenticeshipRatioOk: boolean;
  trainingDue?: string;
};

export type CcqHourDeclaration = {
  id: string;
  workerId: string;
  workerName: string;
  jobId: string;
  jobName: string;
  trade: CcqTradeCode;
  weekEnding: string;
  hours: number;
  status: "draft" | "ready" | "submitted";
};

export type ProgressInvoice = {
  id: string;
  jobId: string;
  jobName: string;
  number: string;
  periodLabel: string;
  completionPct: number;
  amount: number;
  holdback: number;
  netDue: number;
  status: "draft" | "sent" | "partial" | "paid";
  dueDate: string;
};

export type MarketingCampaign = {
  id: string;
  name: string;
  channel: "google" | "meta" | "seo" | "referral" | "email";
  status: "active" | "paused" | "ended";
  spend: number;
  leads: number;
  contracts: number;
  revenue: number;
};

export type ConstructionLead = {
  id: string;
  name: string;
  source: string;
  projectType: string;
  valueEstimate: number;
  stage: "new" | "qualified" | "estimate" | "negotiation" | "won" | "lost";
  owner: string;
  city: string;
};

export const TRADE_LABELS: Record<CcqTradeCode, string> = {
  "charpentier-menuisier": "Charpentier-menuisier",
  electricien: "Électricien",
  ferblantier: "Ferblantier",
  "monteur-mecaniciens": "Monteur-mécanicien",
  peintre: "Peintre",
  manoeuvre: "Manœuvre",
  "operateur-pelle": "Opérateur (pelle)",
};

export const COMPETENCY_LABELS: Record<CcqCompetency, string> = {
  apprenti_1: "Apprenti 1re année",
  apprenti_2: "Apprenti 2e année",
  apprenti_3: "Apprenti 3e année",
  compagnon: "Compagnon",
  contremaitre: "Contremaître",
};
