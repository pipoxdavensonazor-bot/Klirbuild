import { NextResponse } from "next/server";
import { hasDatabase } from "@/lib/auth/auth-service";
import { prisma } from "@/lib/db";
import {
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
