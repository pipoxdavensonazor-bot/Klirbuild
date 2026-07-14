import type { AppPermission } from "@/lib/workforce/types";

export type SubscriptionPlanId = "starter" | "growth" | "business" | "enterprise";

export type PlanFeatureKey =
  | "dashboard"
  | "crm"
  | "quotes_invoices"
  | "projects"
  | "timeclock"
  | "locations"
  | "payroll"
  | "accounting"
  | "t4"
  | "social_ads"
  | "team_chat"
  | "meetings"
  | "documents"
  | "ai"
  | "automations"
  | "analytics"
  | "construction_os"
  | "ccq"
  | "markets"
  | "auto_pilot"
  | "compliance_hub"
  | "api_access"
  | "priority_support";

export type SubscriptionPlan = {
  id: SubscriptionPlanId;
  name: string;
  tagline: string;
  monthlyPrice: number;
  yearlyPrice: number;
  popular?: boolean;
  maxUsers: number;
  maxJobs: number;
  maxStorageGb: number;
  features: PlanFeatureKey[];
  highlights: string[];
};

/** Map nav routes / modules to plan feature keys */
export const ROUTE_PLAN_FEATURE: Record<string, PlanFeatureKey | undefined> = {
  "/dashboard": "dashboard",
  "/crm": "crm",
  "/clients": "crm",
  "/inbox": "crm",
  "/quotes": "quotes_invoices",
  "/invoices": "quotes_invoices",
  "/payments": "quotes_invoices",
  "/projects": "projects",
  "/tasks": "projects",
  "/timeclock": "timeclock",
  "/locations": "locations",
  "/payroll": "payroll",
  "/accounting": "accounting",
  "/reports/t4": "t4",
  "/social-ads": "social_ads",
  "/team-chat": "team_chat",
  "/meetings": "meetings",
  "/feed": "meetings",
  "/documents": "documents",
  "/ai": "ai",
  "/automations": "automations",
  "/analytics": "analytics",
  "/construction": "construction_os",
  "/markets": "markets",
  "/auto-pilot": "auto_pilot",
  "/compliance": "compliance_hub",
  "/settings": "dashboard",
  "/billing": "dashboard",
  "/help": "dashboard",
};

export const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: "starter",
    name: "Starter",
    tagline: "Pour petites équipes qui démarrent",
    monthlyPrice: 79,
    yearlyPrice: 790,
    maxUsers: 5,
    maxJobs: 10,
    maxStorageGb: 10,
    features: [
      "dashboard",
      "crm",
      "quotes_invoices",
      "projects",
      "timeclock",
      "team_chat",
      "documents",
      "markets",
    ],
    highlights: [
      "Jusqu'à 5 utilisateurs",
      "10 chantiers actifs",
      "CRM + devis / factures",
      "Profil marché CA / US / Caraïbes",
      "Pointage GPS de base",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    tagline: "Le plus populaire pour PME en croissance",
    monthlyPrice: 149,
    yearlyPrice: 1490,
    popular: true,
    maxUsers: 25,
    maxJobs: 50,
    maxStorageGb: 100,
    features: [
      "dashboard",
      "crm",
      "quotes_invoices",
      "projects",
      "timeclock",
      "locations",
      "payroll",
      "accounting",
      "t4",
      "team_chat",
      "meetings",
      "documents",
      "ai",
      "analytics",
      "construction_os",
      "ccq",
      "markets",
      "compliance_hub",
    ],
    highlights: [
      "Jusqu'à 25 utilisateurs",
      "50 chantiers + Construction OS",
      "Taxes multi-marchés + conformité",
      "Paie + T4 / W-2 ready",
      "Visio + live streaming",
    ],
  },
  {
    id: "business",
    name: "Business",
    tagline: "Opérations avancées et marketing",
    monthlyPrice: 299,
    yearlyPrice: 2990,
    maxUsers: 100,
    maxJobs: 200,
    maxStorageGb: 500,
    features: [
      "dashboard",
      "crm",
      "quotes_invoices",
      "projects",
      "timeclock",
      "locations",
      "payroll",
      "accounting",
      "t4",
      "social_ads",
      "team_chat",
      "meetings",
      "documents",
      "ai",
      "automations",
      "analytics",
      "construction_os",
      "ccq",
      "markets",
      "compliance_hub",
      "auto_pilot",
      "priority_support",
    ],
    highlights: [
      "Jusqu'à 100 utilisateurs",
      "Auto-Pilot US + Caraïbes",
      "Pubs réseaux + automatisations",
      "Support prioritaire",
      "Tout Growth inclus",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "Sur mesure pour grands entrepreneurs",
    monthlyPrice: 0,
    yearlyPrice: 0,
    maxUsers: 9999,
    maxJobs: 9999,
    maxStorageGb: 5000,
    features: [
      "dashboard",
      "crm",
      "quotes_invoices",
      "projects",
      "timeclock",
      "locations",
      "payroll",
      "accounting",
      "t4",
      "social_ads",
      "team_chat",
      "meetings",
      "documents",
      "ai",
      "automations",
      "analytics",
      "construction_os",
      "ccq",
      "markets",
      "compliance_hub",
      "auto_pilot",
      "api_access",
      "priority_support",
    ],
    highlights: [
      "Utilisateurs illimités",
      "Multi-îles + multi-états",
      "API & intégrations",
      "SLA & onboarding dédié",
      "Tarification sur devis",
    ],
  },
];

export function getPlan(id: SubscriptionPlanId) {
  return subscriptionPlans.find((p) => p.id === id) ?? subscriptionPlans[0];
}

export function planHasFeature(planId: SubscriptionPlanId, feature: PlanFeatureKey) {
  return getPlan(planId).features.includes(feature);
}

export function routeAllowedForPlan(planId: SubscriptionPlanId, href: string) {
  // Find longest matching route prefix
  const keys = Object.keys(ROUTE_PLAN_FEATURE).sort((a, b) => b.length - a.length);
  const match = keys.find((k) => href === k || href.startsWith(`${k}/`));
  if (!match) return true;
  const feature = ROUTE_PLAN_FEATURE[match];
  if (!feature) return true;
  return planHasFeature(planId, feature);
}

export function formatPlanPrice(plan: SubscriptionPlan, cycle: "monthly" | "yearly") {
  if (plan.id === "enterprise") return "Sur devis";
  const amount = cycle === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Optional: map features to permissions for dual checks */
export const FEATURE_PERMISSION_HINT: Partial<Record<PlanFeatureKey, AppPermission>> = {
  crm: "crm:read",
  quotes_invoices: "invoices:read",
  projects: "projects:read",
  timeclock: "timeclock:use",
  locations: "location:view",
  payroll: "payroll:read",
  accounting: "accounting:read",
  t4: "payroll:read",
  social_ads: "crm:write",
  team_chat: "chat:use",
  meetings: "meetings:join",
  documents: "documents:read",
  ai: "ai:use",
  automations: "automations:manage",
  analytics: "analytics:read",
};
