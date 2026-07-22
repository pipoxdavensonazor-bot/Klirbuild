import { prisma } from "@/lib/db";
import {
  chargeForClick,
  chargeForImpression,
  SPONSORED_AD_PRICING,
  type SponsoredSurface,
} from "@/lib/sponsored-ads/pricing";

function num(v: unknown) {
  return Number(v ?? 0);
}

export async function listSponsoredCampaigns(opts?: {
  advertiserCompanyId?: string;
  status?: string;
}) {
  return prisma.sponsoredAdCampaign.findMany({
    where: {
      advertiserCompanyId: opts?.advertiserCompanyId,
      status: opts?.status as never,
    },
    include: {
      advertiserCompany: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createSponsoredCampaign(input: {
  advertiserCompanyId: string;
  title: string;
  headline: string;
  body: string;
  ctaLabel?: string;
  ctaUrl: string;
  imageUrl?: string;
  surface?: SponsoredSurface;
  dailyBudgetCad?: number;
  totalBudgetCad?: number;
  submitForReview?: boolean;
}) {
  const daily = Math.max(
    SPONSORED_AD_PRICING.minDailyBudgetCad,
    Number(input.dailyBudgetCad ?? 25)
  );
  const total = Math.max(
    SPONSORED_AD_PRICING.minTotalBudgetCad,
    Number(input.totalBudgetCad ?? daily * 10)
  );

  return prisma.sponsoredAdCampaign.create({
    data: {
      advertiserCompanyId: input.advertiserCompanyId,
      title: input.title.trim(),
      headline: input.headline.trim(),
      body: input.body.trim(),
      ctaLabel: (input.ctaLabel || "En savoir plus").trim(),
      ctaUrl: input.ctaUrl.trim(),
      imageUrl: input.imageUrl?.trim() || null,
      surface: input.surface || "dashboard",
      status: input.submitForReview ? "pending_review" : "draft",
      dailyBudgetCad: daily,
      totalBudgetCad: total,
      bidCpmCad: SPONSORED_AD_PRICING.defaultCpmCad,
      bidCpcCad: SPONSORED_AD_PRICING.defaultCpcCad,
      platformFeePct: SPONSORED_AD_PRICING.platformFeePct,
      startAt: new Date(),
    },
  });
}

export async function reviewSponsoredCampaign(input: {
  id: string;
  status: "active" | "rejected" | "paused";
  reviewedByEmail: string;
  reviewNote?: string;
}) {
  return prisma.sponsoredAdCampaign.update({
    where: { id: input.id },
    data: {
      status: input.status,
      reviewedByEmail: input.reviewedByEmail,
      reviewNote: input.reviewNote?.trim() || null,
    },
  });
}

export async function getActivePlacement(opts: {
  surface: SponsoredSurface;
  viewerCompanyId: string;
}) {
  const now = new Date();
  const campaigns = await prisma.sponsoredAdCampaign.findMany({
    where: {
      status: "active",
      surface: opts.surface,
      advertiserCompanyId: { not: opts.viewerCompanyId },
      OR: [{ endAt: null }, { endAt: { gt: now } }],
    },
    orderBy: [{ spentCad: "asc" }, { createdAt: "asc" }],
    take: 12,
  });

  const eligible = campaigns.filter((c) => {
    const spent = num(c.spentCad);
    const total = num(c.totalBudgetCad);
    return spent < total;
  });

  if (!eligible.length) return null;
  // Rotation simple round-robin sur le moins dépensé
  return eligible[0]!;
}

export async function trackSponsoredEvent(input: {
  campaignId: string;
  type: "impression" | "click";
  viewerCompanyId?: string;
  viewerEmail?: string;
}) {
  const campaign = await prisma.sponsoredAdCampaign.findUnique({
    where: { id: input.campaignId },
  });
  if (!campaign || campaign.status !== "active") {
    return { ok: false as const, error: "Campagne inactive" };
  }

  const spent = num(campaign.spentCad);
  const total = num(campaign.totalBudgetCad);
  if (spent >= total) {
    await prisma.sponsoredAdCampaign.update({
      where: { id: campaign.id },
      data: { status: "completed" },
    });
    return { ok: false as const, error: "Budget épuisé" };
  }

  const charge =
    input.type === "impression"
      ? chargeForImpression(num(campaign.bidCpmCad))
      : chargeForClick(num(campaign.bidCpcCad));

  const nextSpent = Math.min(total, Math.round((spent + charge) * 100) / 100);
  const completed = nextSpent >= total;

  await prisma.$transaction([
    prisma.sponsoredAdEvent.create({
      data: {
        campaignId: campaign.id,
        type: input.type,
        viewerCompanyId: input.viewerCompanyId || null,
        viewerEmail: input.viewerEmail || null,
        chargedCad: charge,
      },
    }),
    prisma.sponsoredAdCampaign.update({
      where: { id: campaign.id },
      data: {
        spentCad: nextSpent,
        impressions: { increment: input.type === "impression" ? 1 : 0 },
        clicks: { increment: input.type === "click" ? 1 : 0 },
        status: completed ? "completed" : campaign.status,
      },
    }),
  ]);

  return {
    ok: true as const,
    chargedCad: charge,
    platformRevenueCad:
      (charge * num(campaign.platformFeePct)) / 100,
  };
}

export async function platformAdRevenueSummary() {
  const [active, aggregates, recentSpend] = await Promise.all([
    prisma.sponsoredAdCampaign.count({ where: { status: "active" } }),
    prisma.sponsoredAdCampaign.aggregate({
      _sum: { spentCad: true, totalBudgetCad: true },
      _count: true,
    }),
    prisma.sponsoredAdEvent.aggregate({
      where: {
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      _sum: { chargedCad: true },
      _count: true,
    }),
  ]);

  const lifetimeSpend = num(aggregates._sum.spentCad);
  const last30 = num(recentSpend._sum.chargedCad);

  return {
    activeCampaigns: active,
    totalCampaigns: aggregates._count,
    lifetimeAdRevenueCad: lifetimeSpend,
    last30DaysAdRevenueCad: last30,
    bookedBudgetCad: num(aggregates._sum.totalBudgetCad),
  };
}
