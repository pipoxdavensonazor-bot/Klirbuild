import { prisma } from "@/lib/db";
import { getPlan } from "@/lib/billing/plans";
import { platformAdRevenueSummary } from "@/lib/sponsored-ads/sponsored-ads-service";

const PLAN_MRR: Record<string, number> = {
  starter: 79,
  growth: 149,
  business: 299,
};

export async function getPlatformOverview() {
  const companies = await prisma.company.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      plan: true,
      subscriptionStatus: true,
      suspended: true,
      createdAt: true,
      marketRegion: true,
      _count: { select: { users: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const paying = companies.filter(
    (c) =>
      !c.suspended &&
      (c.subscriptionStatus === "active" || c.subscriptionStatus === "trialing")
  );

  const estimatedMrrCad = paying.reduce(
    (sum, c) => sum + (PLAN_MRR[c.plan] ?? getPlan(c.plan as never).monthlyPrice),
    0
  );

  const ads = await platformAdRevenueSummary();
  const usersTotal = companies.reduce((s, c) => s + c._count.users, 0);

  return {
    companiesCount: companies.length,
    usersTotal,
    suspendedCount: companies.filter((c) => c.suspended).length,
    estimatedMrrCad,
    estimatedArrCad: estimatedMrrCad * 12,
    ads,
    /** Revenu mensuel projeté = SaaS MRR + pubs 30j annualisées / 12 */
    projectedMonthlyRevenueCad:
      estimatedMrrCad + ads.last30DaysAdRevenueCad,
    companies: companies.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      plan: c.plan,
      subscriptionStatus: c.subscriptionStatus,
      suspended: c.suspended,
      createdAt: c.createdAt.toISOString(),
      marketRegion: c.marketRegion,
      usersCount: c._count.users,
      mrrCad: PLAN_MRR[c.plan] ?? 0,
    })),
  };
}
