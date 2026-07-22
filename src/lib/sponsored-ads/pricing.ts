/** Tarifs inventaire pubs in-app KlirBuild (CAD). */
export const SPONSORED_AD_PRICING = {
  defaultCpmCad: 8,
  defaultCpcCad: 1.5,
  minDailyBudgetCad: 10,
  minTotalBudgetCad: 50,
  /** KlirBuild conserve 100 % du spend inventaire (réseau propriétaire). */
  platformFeePct: 100,
  surfaces: ["dashboard", "feed", "sidebar"] as const,
} as const;

export type SponsoredSurface =
  (typeof SPONSORED_AD_PRICING.surfaces)[number];

export function chargeForImpression(cpmCad: number) {
  return Math.round((cpmCad / 1000) * 10_000) / 10_000;
}

export function chargeForClick(cpcCad: number) {
  return Math.round(cpcCad * 100) / 100;
}

export function estimateMonthlyAdRevenue(
  activeCampaigns: { dailyBudgetCad: number }[]
) {
  return activeCampaigns.reduce((sum, c) => sum + Number(c.dailyBudgetCad) * 30, 0);
}
