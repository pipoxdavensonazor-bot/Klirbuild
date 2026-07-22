import { prisma } from "@/lib/db";
import { getPlan } from "@/lib/billing/plans";
import { platformAdRevenueSummary } from "@/lib/sponsored-ads/sponsored-ads-service";
import { isDailyConfigured } from "@/lib/meetings/daily-service";
import { isZernioEnabled } from "@/lib/social-ads/zernio-service";

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
    (sum, c) =>
      sum + (PLAN_MRR[c.plan] ?? getPlan(c.plan as never).monthlyPrice),
    0
  );

  const ads = await platformAdRevenueSummary();
  const usersTotal = companies.reduce((s, c) => s + c._count.users, 0);

  const stack = {
    video: isDailyConfigured()
      ? { ok: true, provider: "daily" as const, label: "Daily.co natif" }
      : { ok: true, provider: "jitsi" as const, label: "Jitsi Meet (gratuit)" },
    email: {
      ok: Boolean(process.env.RESEND_API_KEY?.trim()),
      label: process.env.RESEND_API_KEY?.trim() ? "Resend OK" : "Resend manquant",
    },
    stripe: {
      ok: Boolean(process.env.STRIPE_SECRET_KEY?.trim()),
      label: process.env.STRIPE_SECRET_KEY?.trim()
        ? "Stripe OK"
        : "Stripe manquant (billing)",
    },
    googleOAuth: {
      ok: Boolean(
        process.env.GOOGLE_CLIENT_ID?.trim() &&
          process.env.GOOGLE_CLIENT_SECRET?.trim()
      ),
      label:
        process.env.GOOGLE_CLIENT_ID?.trim() &&
        process.env.GOOGLE_CLIENT_SECRET?.trim()
          ? "Google OAuth OK"
          : "Google OAuth manquant",
    },
    zernio: {
      ok: isZernioEnabled(),
      label: isZernioEnabled() ? "Zernio OK" : "Zernio optionnel",
    },
    ai: {
      ok: Boolean(
        process.env.OPENROUTER_API_KEY?.trim() ||
          process.env.OPENAI_API_KEY?.trim() ||
          process.env.GEMINI_API_KEY?.trim()
      ),
      label: process.env.OPENROUTER_API_KEY?.trim()
        ? "OpenRouter OK"
        : process.env.OPENAI_API_KEY?.trim()
          ? "OpenAI OK"
          : process.env.GEMINI_API_KEY?.trim()
            ? "Gemini OK"
            : "IA mock",
    },
  };

  return {
    companiesCount: companies.length,
    usersTotal,
    suspendedCount: companies.filter((c) => c.suspended).length,
    estimatedMrrCad,
    estimatedArrCad: estimatedMrrCad * 12,
    ads,
    projectedMonthlyRevenueCad: estimatedMrrCad + ads.last30DaysAdRevenueCad,
    stack,
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
