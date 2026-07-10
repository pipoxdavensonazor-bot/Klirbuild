import { calcSalesTaxes } from "@/lib/workforce/payroll";
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

export const constructionJobs: ConstructionJob[] = [
  {
    id: "job_1",
    number: "CH-2026-014",
    name: "Rénovation condo Plateau",
    clientName: "Famille Tremblay",
    address: "4521 Rue Saint-Denis",
    city: "Montréal",
    province: "QC",
    status: "in_progress",
    contractValue: 186000,
    budgetCost: 142000,
    actualCost: 97800,
    progressPct: 58,
    holdbackPct: 10,
    startDate: "2026-04-15",
    endDate: "2026-09-30",
    superintendent: "Sam Chen",
    trades: ["charpentier-menuisier", "electricien", "peintre"],
  },
  {
    id: "job_2",
    number: "CH-2026-021",
    name: "Agrandissement commercial Laval",
    clientName: "Nordic Facilities Inc.",
    address: "1200 Boul. Chomedey",
    city: "Laval",
    province: "QC",
    status: "in_progress",
    contractValue: 420000,
    budgetCost: 338000,
    actualCost: 152400,
    progressPct: 34,
    holdbackPct: 10,
    startDate: "2026-05-01",
    endDate: "2026-12-15",
    superintendent: "Alex Rivera",
    trades: ["charpentier-menuisier", "ferblantier", "monteur-mecaniciens", "manoeuvre"],
  },
  {
    id: "job_3",
    number: "CH-2026-028",
    name: "Cuisine & salle de bain Rosemont",
    clientName: "Lumen Retail Partners",
    address: "2100 Ave. Laurier E",
    city: "Montréal",
    province: "QC",
    status: "sold",
    contractValue: 64000,
    budgetCost: 48500,
    actualCost: 2100,
    progressPct: 5,
    holdbackPct: 10,
    startDate: "2026-07-20",
    superintendent: "Jordan Lee",
    trades: ["charpentier-menuisier", "peintre"],
  },
  {
    id: "job_4",
    number: "CH-2025-102",
    name: "Toiture industrielle Brossard",
    clientName: "Cascade Builders",
    address: "8800 Boul. Taschereau",
    city: "Brossard",
    province: "QC",
    status: "completed",
    contractValue: 98000,
    budgetCost: 72000,
    actualCost: 70500,
    progressPct: 100,
    holdbackPct: 10,
    startDate: "2025-10-01",
    endDate: "2026-02-28",
    superintendent: "Sam Chen",
    trades: ["ferblantier", "manoeuvre"],
  },
  {
    id: "job_5",
    number: "CH-2026-033",
    name: "Soumission — Clinique dentaire",
    clientName: "Harbour Dental Group",
    address: "À déterminer",
    city: "Longueuil",
    province: "QC",
    status: "estimating",
    contractValue: 0,
    budgetCost: 0,
    actualCost: 0,
    progressPct: 0,
    holdbackPct: 10,
    startDate: "2026-08-01",
    superintendent: "Alex Rivera",
    trades: ["electricien", "peintre", "charpentier-menuisier"],
  },
];

const estLines = [
  {
    id: "el_1",
    category: "labor" as const,
    description: "Charpenterie — démolition & structure",
    qty: 120,
    unit: "h",
    unitCost: 68,
    total: 8160,
  },
  {
    id: "el_2",
    category: "material" as const,
    description: "Bois d'œuvre & quincaillerie",
    qty: 1,
    unit: "lot",
    unitCost: 12400,
    total: 12400,
  },
  {
    id: "el_3",
    category: "subcontract" as const,
    description: "Électricité (sous-traitant licencié)",
    qty: 1,
    unit: "forfait",
    unitCost: 18500,
    total: 18500,
  },
  {
    id: "el_4",
    category: "equipment" as const,
    description: "Location benne + échafaudage",
    qty: 4,
    unit: "sem",
    unitCost: 850,
    total: 3400,
  },
];

const sub = estLines.reduce((s, l) => s + l.total, 0);
const taxes = calcSalesTaxes(sub);

export const constructionEstimates: ConstructionEstimate[] = [
  {
    id: "est_1",
    number: "EST-2026-088",
    jobId: "job_5",
    clientName: "Harbour Dental Group",
    title: "Aménagement clinique — phase 1",
    status: "sent",
    subtotal: taxes.subtotal,
    tps: taxes.tps,
    tvq: taxes.tvq,
    total: taxes.total,
    validUntil: "2026-08-01",
    lines: estLines,
  },
  {
    id: "est_2",
    number: "EST-2026-091",
    clientName: "Famille Gagnon",
    title: "Sous-sol fini — Laval",
    status: "draft",
    subtotal: 42000,
    tps: 2100,
    tvq: 4189.5,
    total: 48289.5,
    validUntil: "2026-07-25",
    lines: [
      {
        id: "el_5",
        category: "labor",
        description: "Main-d'œuvre générale",
        qty: 200,
        unit: "h",
        unitCost: 55,
        total: 11000,
      },
      {
        id: "el_6",
        category: "material",
        description: "Gypse, isolation, planchers",
        qty: 1,
        unit: "lot",
        unitCost: 31000,
        total: 31000,
      },
    ],
  },
  {
    id: "est_3",
    number: "EST-2026-072",
    jobId: "job_1",
    clientName: "Famille Tremblay",
    title: "Rénovation condo Plateau (accepté)",
    status: "accepted",
    subtotal: 161740,
    tps: 8087,
    tvq: 16133.56,
    total: 185960.56,
    validUntil: "2026-04-01",
    lines: [],
  },
];

export const changeOrders: ChangeOrder[] = [
  {
    id: "co_1",
    number: "OC-014-03",
    jobId: "job_1",
    jobName: "Rénovation condo Plateau",
    title: "Ajout îlot cuisine quartz",
    reason: "Demande client — upgrade comptoir",
    amount: 4800,
    status: "approved",
    submittedAt: "2026-06-10",
    approvedAt: "2026-06-12",
  },
  {
    id: "co_2",
    number: "OC-021-01",
    jobId: "job_2",
    jobName: "Agrandissement commercial Laval",
    title: "Renforcement structure dalle",
    reason: "Découverte conditions sol",
    amount: 18500,
    status: "submitted",
    submittedAt: "2026-07-02",
  },
  {
    id: "co_3",
    number: "OC-014-04",
    jobId: "job_1",
    jobName: "Rénovation condo Plateau",
    title: "Peinture premium murs salon",
    reason: "Changement de finition",
    amount: 1600,
    status: "draft",
  },
];

export const ccqWorkers: CcqWorker[] = [
  {
    id: "ccq_1",
    name: "Jordan Lee",
    trade: "charpentier-menuisier",
    competency: "compagnon",
    ccqNumber: "CCQ-884221",
    cardExpires: "2027-03-31",
    hoursThisPeriod: 72,
    apprenticeshipRatioOk: true,
  },
  {
    id: "ccq_2",
    name: "Maya Dubois",
    trade: "electricien",
    competency: "apprenti_2",
    ccqNumber: "CCQ-901442",
    cardExpires: "2026-11-30",
    hoursThisPeriod: 64,
    apprenticeshipRatioOk: true,
    trainingDue: "2026-09-15",
  },
  {
    id: "ccq_3",
    name: "Chris Patel",
    trade: "manoeuvre",
    competency: "apprenti_1",
    ccqNumber: "CCQ-912088",
    cardExpires: "2026-08-31",
    hoursThisPeriod: 40,
    apprenticeshipRatioOk: true,
  },
  {
    id: "ccq_4",
    name: "Sam Chen",
    trade: "charpentier-menuisier",
    competency: "contremaitre",
    ccqNumber: "CCQ-770113",
    cardExpires: "2028-01-15",
    hoursThisPeriod: 48,
    apprenticeshipRatioOk: true,
  },
  {
    id: "ccq_5",
    name: "Luc Bergeron",
    trade: "ferblantier",
    competency: "compagnon",
    ccqNumber: "CCQ-655901",
    cardExpires: "2026-07-20",
    hoursThisPeriod: 56,
    apprenticeshipRatioOk: false,
    trainingDue: "2026-07-18",
  },
];

export const ccqDeclarations: CcqHourDeclaration[] = [
  {
    id: "dec_1",
    workerId: "ccq_1",
    workerName: "Jordan Lee",
    jobId: "job_1",
    jobName: "Rénovation condo Plateau",
    trade: "charpentier-menuisier",
    weekEnding: "2026-07-05",
    hours: 40,
    status: "submitted",
  },
  {
    id: "dec_2",
    workerId: "ccq_2",
    workerName: "Maya Dubois",
    jobId: "job_2",
    jobName: "Agrandissement commercial Laval",
    trade: "electricien",
    weekEnding: "2026-07-05",
    hours: 38,
    status: "ready",
  },
  {
    id: "dec_3",
    workerId: "ccq_5",
    workerName: "Luc Bergeron",
    jobId: "job_2",
    jobName: "Agrandissement commercial Laval",
    trade: "ferblantier",
    weekEnding: "2026-07-12",
    hours: 32,
    status: "draft",
  },
];

export const progressInvoices: ProgressInvoice[] = [
  {
    id: "pinv_1",
    jobId: "job_1",
    jobName: "Rénovation condo Plateau",
    number: "FAC-CH-014-03",
    periodLabel: "Avancement 50→58%",
    completionPct: 58,
    amount: 14880,
    holdback: 1488,
    netDue: 13392,
    status: "sent",
    dueDate: "2026-07-25",
  },
  {
    id: "pinv_2",
    jobId: "job_2",
    jobName: "Agrandissement commercial Laval",
    number: "FAC-CH-021-02",
    periodLabel: "Avancement 20→34%",
    completionPct: 34,
    amount: 58800,
    holdback: 5880,
    netDue: 52920,
    status: "partial",
    dueDate: "2026-07-15",
  },
  {
    id: "pinv_3",
    jobId: "job_4",
    jobName: "Toiture industrielle Brossard",
    number: "FAC-CH-102-FINAL",
    periodLabel: "Finale + libération retenue",
    completionPct: 100,
    amount: 9800,
    holdback: 0,
    netDue: 9800,
    status: "paid",
    dueDate: "2026-03-15",
  },
];

export const marketingCampaigns: MarketingCampaign[] = [
  {
    id: "mkt_1",
    name: "Rénovation résidentielle MTL",
    channel: "google",
    status: "active",
    spend: 2400,
    leads: 38,
    contracts: 4,
    revenue: 312000,
  },
  {
    id: "mkt_2",
    name: "Agrandissements commerciaux",
    channel: "meta",
    status: "active",
    spend: 1100,
    leads: 12,
    contracts: 1,
    revenue: 420000,
  },
  {
    id: "mkt_3",
    name: "SEO local — entrepreneur général",
    channel: "seo",
    status: "active",
    spend: 600,
    leads: 22,
    contracts: 3,
    revenue: 198000,
  },
  {
    id: "mkt_4",
    name: "Newsletter clients passés",
    channel: "email",
    status: "paused",
    spend: 80,
    leads: 9,
    contracts: 1,
    revenue: 64000,
  },
];

export const constructionLeads: ConstructionLead[] = [
  {
    id: "clead_1",
    name: "Condo Griffintown — 2 salles de bain",
    source: "Google Ads",
    projectType: "Rénovation résidentielle",
    valueEstimate: 45000,
    stage: "estimate",
    owner: "Alex Rivera",
    city: "Montréal",
  },
  {
    id: "clead_2",
    name: "Entrepôt Saint-Laurent — quais",
    source: "Référence",
    projectType: "Commercial",
    valueEstimate: 280000,
    stage: "negotiation",
    owner: "Sam Chen",
    city: "Saint-Laurent",
  },
  {
    id: "clead_3",
    name: "Maison Sainte-Thérèse — agrandissement",
    source: "SEO",
    projectType: "Agrandissement",
    valueEstimate: 125000,
    stage: "qualified",
    owner: "Alex Rivera",
    city: "Sainte-Thérèse",
  },
  {
    id: "clead_4",
    name: "Restaurant Plateau — fit-out",
    source: "Meta",
    projectType: "Commercial",
    valueEstimate: 95000,
    stage: "new",
    owner: "Jordan Lee",
    city: "Montréal",
  },
];

export const constructionNav: {
  href: string;
  label: string;
  exact?: boolean;
}[] = [
  { href: "/construction", label: "Hub", exact: true },
  { href: "/construction/jobs", label: "Chantiers ERP" },
  { href: "/construction/estimates", label: "Estimés" },
  { href: "/construction/change-orders", label: "Ordres de changement" },
  { href: "/construction/crm", label: "CRM Construction" },
  { href: "/construction/ccq", label: "CCQ" },
  { href: "/construction/payments", label: "Paiements" },
  { href: "/construction/marketing", label: "Marketing" },
  { href: "/construction/ai", label: "IA Chantier" },
];

export function constructionKpis() {
  const active = constructionJobs.filter((j) =>
    ["in_progress", "sold"].includes(j.status)
  );
  const pipeline = constructionLeads
    .filter((l) => !["won", "lost"].includes(l.stage))
    .reduce((s, l) => s + l.valueEstimate, 0);
  const contractBacklog = active.reduce((s, j) => s + j.contractValue, 0);
  const marginRisk = active.filter(
    (j) => j.actualCost / Math.max(j.budgetCost, 1) > 0.85 && j.progressPct < 90
  ).length;
  const ccqAlerts = ccqWorkers.filter(
    (w) =>
      !w.apprenticeshipRatioOk ||
      new Date(w.cardExpires) < new Date("2026-08-01") ||
      Boolean(w.trainingDue)
  ).length;
  const mktSpend = marketingCampaigns.reduce((s, c) => s + c.spend, 0);
  const mktRevenue = marketingCampaigns.reduce((s, c) => s + c.revenue, 0);
  const holdbackOpen = progressInvoices
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
    openChangeOrders: changeOrders.filter((c) =>
      ["draft", "submitted"].includes(c.status)
    ).length,
  };
}
