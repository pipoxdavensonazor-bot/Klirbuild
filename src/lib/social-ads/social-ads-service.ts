import { hasDatabase } from "@/lib/auth/auth-service";
import { DEMO_COMPANY_ID } from "@/lib/billing/constants";
import { prisma } from "@/lib/db";
import {
  socialAccounts as mockAccounts,
  socialAdCampaigns as mockCampaigns,
} from "@/lib/reports/mock-data";
import type { SocialAccount, SocialAdCampaign, SocialPlatform } from "@/lib/reports/types";
import { KLIRLINE_OFFICIAL_PROFILES } from "@/lib/social-ads/klirline-marketing";
import { isDemoMode } from "@/lib/runtime";
import { isZernioEnabled } from "@/lib/social-ads/zernio-service";

const PLATFORMS: SocialPlatform[] = [
  "meta",
  "instagram",
  "facebook",
  "google",
  "linkedin",
  "tiktok",
  "youtube",
];

function dec(v: { toNumber(): number } | number) {
  return typeof v === "number" ? v : v.toNumber();
}

function mapAccount(row: {
  id: string;
  platform: string;
  accountName: string;
  handle: string;
  status: string;
  adAccountId: string | null;
  currency: string;
  followers: number | null;
  connectedAt: Date | null;
}): SocialAccount {
  return {
    id: row.id,
    platform: row.platform as SocialPlatform,
    accountName: row.accountName,
    handle: row.handle,
    status: row.status as SocialAccount["status"],
    adAccountId: row.adAccountId ?? undefined,
    currency: row.currency,
    connectedAt: row.connectedAt?.toISOString().slice(0, 10),
    followers: row.followers ?? undefined,
  };
}

function mapCampaign(row: {
  id: string;
  accountId: string;
  name: string;
  platform: string;
  objective: string;
  status: string;
  dailyBudget: { toNumber(): number } | number;
  spend: { toNumber(): number } | number;
  impressions: number;
  clicks: number;
  leads: number;
  startDate: Date;
  endDate: Date | null;
  zernioPostId?: string | null;
  content?: string | null;
  scheduledFor?: Date | null;
  publishMode?: string | null;
}): SocialAdCampaign {
  return {
    id: row.id,
    name: row.name,
    platform: row.platform as SocialPlatform,
    accountId: row.accountId,
    objective: row.objective as SocialAdCampaign["objective"],
    status: row.status as SocialAdCampaign["status"],
    dailyBudget: dec(row.dailyBudget),
    spend: dec(row.spend),
    impressions: row.impressions,
    clicks: row.clicks,
    leads: row.leads,
    startDate: row.startDate.toISOString().slice(0, 10),
    endDate: row.endDate?.toISOString().slice(0, 10),
    zernioPostId: row.zernioPostId ?? undefined,
    content: row.content ?? undefined,
    scheduledFor: row.scheduledFor?.toISOString(),
    publishMode: (row.publishMode as SocialAdCampaign["publishMode"]) ?? undefined,
  };
}

export function socialAdsLoadErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (
    msg.includes("COMPANY_NOT_FOUND") ||
    msg.includes("Foreign key constraint") ||
    msg.includes("violates foreign key")
  ) {
    return "Entreprise introuvable en base. Exécutez npm run db:seed sur la base Neon, puis redéployez.";
  }
  if (msg.includes("does not exist")) {
    if (msg.toLowerCase().includes("socialaccount") || msg.toLowerCase().includes("socialad")) {
      return "Tables marketing absentes. Redéployez Netlify (db push auto) ou exécutez npm run db:push.";
    }
    return "Tables manquantes. Exécutez npm run db:push sur la base Neon/Netlify.";
  }
  return "Impossible de charger les comptes. Vérifiez DATABASE_URL et npm run db:seed.";
}

async function ensureCompanyExists(companyId: string, companyName: string) {
  const existing = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true },
  });
  if (existing) return;

  if (companyId === DEMO_COMPANY_ID) {
    await prisma.company.create({
      data: {
        id: DEMO_COMPANY_ID,
        name: companyName || "KlirBuild Demo Co",
        email: "billing@klirline.demo",
        plan: "growth",
        subscriptionStatus: "trialing",
        enabledModules: ["construction-os", "crm", "payroll", "social_ads"],
      },
    });
    return;
  }

  throw new Error(`COMPANY_NOT_FOUND:${companyId}`);
}

async function ensurePlatformSlots(companyId: string, companyName: string) {
  await ensureCompanyExists(companyId, companyName);
  const existing = await prisma.socialAccountConnection.findMany({
    where: { companyId },
  });
  const have = new Set(existing.map((e) => e.platform));
  const toCreate = PLATFORMS.filter((p) => !have.has(p));
  if (!toCreate.length) return;

  await prisma.socialAccountConnection.createMany({
    data: toCreate.map((platform) => {
      const ref = KLIRLINE_OFFICIAL_PROFILES[platform];
      return {
        companyId,
        platform,
        accountName: companyName,
        handle: ref?.handle ?? `@${companyName.toLowerCase().replace(/\s+/g, "")}`,
        status: "disconnected",
        currency: "CAD",
        managedBy: isZernioEnabled() ? "zernio" : "klirline",
      };
    }),
  });
}

export async function listSocialAccounts(
  companyId: string,
  companyName: string
): Promise<SocialAccount[]> {
  if (hasDatabase()) {
    await ensurePlatformSlots(companyId, companyName);
    const rows = await prisma.socialAccountConnection.findMany({
      where: { companyId },
      orderBy: { platform: "asc" },
    });
    return rows.map(mapAccount);
  }
  return mockAccounts;
}

export async function listSocialCampaigns(companyId: string): Promise<SocialAdCampaign[]> {
  if (hasDatabase()) {
    const rows = await prisma.socialAdCampaignRecord.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapCampaign);
  }
  return mockCampaigns;
}

export async function connectSocialAccountViaKlirline(
  companyId: string,
  platform: SocialPlatform,
  input?: { accountName?: string; handle?: string; adAccountId?: string; klirlineRef?: string }
) {
  if (!hasDatabase()) {
    return { account: mockAccounts.find((a) => a.platform === platform) ?? mockAccounts[0] };
  }

  const row = await prisma.socialAccountConnection.upsert({
    where: { companyId_platform: { companyId, platform } },
    create: {
      companyId,
      platform,
      accountName: input?.accountName ?? "Compte entreprise",
      handle: input?.handle ?? KLIRLINE_OFFICIAL_PROFILES[platform]?.handle ?? "",
      status: "connected",
      adAccountId: input?.adAccountId ?? `klir_${platform}_${Date.now()}`,
      managedBy: "klirline",
      klirlineRef: input?.klirlineRef ?? `klirline.ca/${companyId}/${platform}`,
      connectedAt: new Date(),
      currency: "CAD",
    },
    update: {
      status: "connected",
      accountName: input?.accountName ?? undefined,
      handle: input?.handle ?? undefined,
      adAccountId: input?.adAccountId ?? undefined,
      klirlineRef: input?.klirlineRef ?? undefined,
      managedBy: "klirline",
      connectedAt: new Date(),
    },
  });

  return { account: mapAccount(row) };
}

export async function disconnectSocialAccount(companyId: string, accountId: string) {
  if (!isDemoMode()) {
    const row = await prisma.socialAccountConnection.findFirst({
      where: { id: accountId, companyId },
    });
    if (!row) return { error: "Compte introuvable." as const };
    await prisma.socialAccountConnection.update({
      where: { id: accountId },
      data: { status: "disconnected", adAccountId: null, zernioAccountId: null, connectedAt: null },
    });
    return { ok: true as const };
  }
  return { ok: true as const };
}

export async function reauthSocialAccount(companyId: string, accountId: string) {
  if (!isDemoMode()) {
    await prisma.socialAccountConnection.updateMany({
      where: { id: accountId, companyId },
      data: { status: "connected", connectedAt: new Date() },
    });
  }
  return { ok: true as const };
}

export async function createSocialCampaign(
  companyId: string,
  input: {
    name: string;
    accountId: string;
    platform: SocialPlatform;
    objective?: SocialAdCampaign["objective"];
    dailyBudget?: number;
  }
) {
  const name = input.name.trim();
  if (!name) return { error: "Nom requis." as const };

  if (!hasDatabase()) {
    const campaign: SocialAdCampaign = {
      id: `ad_${Date.now()}`,
      name,
      platform: input.platform,
      accountId: input.accountId,
      objective: input.objective ?? "leads",
      status: "active",
      dailyBudget: input.dailyBudget ?? 50,
      spend: 0,
      impressions: 0,
      clicks: 0,
      leads: 0,
      startDate: new Date().toISOString().slice(0, 10),
    };
    return { campaign };
  }

  const row = await prisma.socialAdCampaignRecord.create({
    data: {
      companyId,
      accountId: input.accountId,
      name,
      platform: input.platform,
      objective: input.objective ?? "leads",
      status: "active",
      dailyBudget: input.dailyBudget ?? 50,
      startDate: new Date(),
    },
  });
  return { campaign: mapCampaign(row) };
}

export async function syncCampaignInsights(companyId: string) {
  if (!hasDatabase()) return { synced: 0 };
  const campaigns = await prisma.socialAdCampaignRecord.findMany({
    where: { companyId, status: "active" },
  });
  for (const c of campaigns) {
    await prisma.socialAdCampaignRecord.update({
      where: { id: c.id },
      data: {
        impressions: { increment: Math.floor(Math.random() * 500) },
        clicks: { increment: Math.floor(Math.random() * 20) },
        spend: { increment: Number(c.dailyBudget) * 0.1 },
      },
    });
  }
  return { synced: campaigns.length };
}
