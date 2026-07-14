import { NextResponse } from "next/server";
import { hasDatabase } from "@/lib/auth/auth-service";
import { prisma } from "@/lib/db";
import {
  getPlan,
  planHasFeature,
  type PlanFeatureKey,
  type SubscriptionPlanId,
} from "@/lib/billing/plans";

export async function getCompanyPlanId(
  companyId: string
): Promise<SubscriptionPlanId> {
  if (!hasDatabase()) return "starter";
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { plan: true },
  });
  const plan = company?.plan as SubscriptionPlanId | undefined;
  if (plan === "starter" || plan === "growth" || plan === "business" || plan === "enterprise") {
    return plan;
  }
  return "starter";
}

/** 403 si le plan entreprise n'inclut pas la feature. */
export async function requireCompanyPlanFeature(
  companyId: string,
  feature: PlanFeatureKey
): Promise<NextResponse | null> {
  const planId = await getCompanyPlanId(companyId);
  if (planHasFeature(planId, feature)) return null;
  return NextResponse.json(
    {
      error: `Fonctionnalité réservée à un plan supérieur (${feature}).`,
      feature,
      plan: planId,
    },
    { status: 403 }
  );
}

type QuotaFail = {
  ok: false;
  error: string;
  plan: SubscriptionPlanId;
  max: number;
  current: number;
};

async function assertCountQuota(input: {
  companyId: string;
  label: string;
  maxKey: "maxJobs" | "maxClients" | "maxProjects" | "maxInvoices";
  count: () => Promise<number>;
}): Promise<{ ok: true } | QuotaFail> {
  const planId = await getCompanyPlanId(input.companyId);
  const max = getPlan(planId)[input.maxKey];
  if (!hasDatabase() || max >= 9999) return { ok: true };
  const current = await input.count();
  if (current >= max) {
    return {
      ok: false,
      error: `Limite ${input.label} atteinte (${current}/${max}) pour le plan ${planId}. Passez à un plan supérieur.`,
      plan: planId,
      max,
      current,
    };
  }
  return { ok: true };
}

export function assertJobSiteQuota(companyId: string) {
  return assertCountQuota({
    companyId,
    label: "de chantiers",
    maxKey: "maxJobs",
    count: () => prisma.jobSite.count({ where: { companyId } }),
  });
}

export function assertClientQuota(companyId: string) {
  return assertCountQuota({
    companyId,
    label: "clients",
    maxKey: "maxClients",
    count: () => prisma.client.count({ where: { companyId } }),
  });
}

export function assertProjectQuota(companyId: string) {
  return assertCountQuota({
    companyId,
    label: "projets",
    maxKey: "maxProjects",
    count: () => prisma.project.count({ where: { companyId } }),
  });
}

export function assertInvoiceQuota(companyId: string) {
  return assertCountQuota({
    companyId,
    label: "factures",
    maxKey: "maxInvoices",
    count: () => prisma.invoice.count({ where: { companyId } }),
  });
}
