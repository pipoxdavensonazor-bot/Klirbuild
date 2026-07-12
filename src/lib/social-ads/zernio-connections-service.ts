import { hasDatabase } from "@/lib/auth/auth-service";
import { prisma } from "@/lib/db";
import type { SocialAccount } from "@/lib/reports/types";
import {
  catalogPlatformById,
  catalogPlatformByZernioKey,
  ZERNIO_CONNECTION_PLATFORMS,
} from "@/lib/social-ads/zernio-connections-catalog";
import { listSocialAccounts } from "@/lib/social-ads/social-ads-service";
import { ensureZernioProfile, isZernioEnabled } from "@/lib/social-ads/zernio-service";

export type ConnectionTile = {
  id: string;
  zernioKey: string;
  name: string;
  description: string;
  category: "social" | "ads" | "messaging";
  tileClass: string;
  monogram: string;
  status: SocialAccount["status"];
  accountId?: string;
  accountName?: string;
  handle?: string;
  zernioAccountId?: string;
  connectedAt?: string;
  followers?: number;
};

export async function ensureConnectionSlot(
  companyId: string,
  platformId: string,
  companyName: string
) {
  if (!hasDatabase()) return;
  const cat = catalogPlatformById(platformId);
  if (!cat) return;

  const existing = await prisma.socialAccountConnection.findUnique({
    where: { companyId_platform: { companyId, platform: platformId } },
  });
  if (existing) return;

  await prisma.socialAccountConnection.create({
    data: {
      companyId,
      platform: platformId,
      accountName: companyName,
      handle: `@${companyName.toLowerCase().replace(/\s+/g, "")}`,
      status: "disconnected",
      currency: "CAD",
      managedBy: "zernio",
    },
  });
}

export async function connectZernioCallbackAccount(
  companyId: string,
  companyName: string,
  input: {
    zernioPlatform: string;
    accountId?: string;
    username?: string;
    displayName?: string;
  }
) {
  const cat = catalogPlatformByZernioKey(input.zernioPlatform);
  const platformId = cat?.id ?? input.zernioPlatform.toLowerCase();
  const name = cat?.name ?? platformId;

  if (!hasDatabase()) return { platformId };

  await ensureConnectionSlot(companyId, platformId, companyName);

  const handle = input.username
    ? input.username.startsWith("@")
      ? input.username
      : `@${input.username}`
    : undefined;

  await prisma.socialAccountConnection.upsert({
    where: { companyId_platform: { companyId, platform: platformId } },
    create: {
      companyId,
      platform: platformId,
      accountName: input.displayName ?? input.username ?? name,
      handle: handle ?? name,
      status: "connected",
      adAccountId: input.accountId ?? null,
      zernioAccountId: input.accountId ?? null,
      managedBy: "zernio",
      connectedAt: new Date(),
      currency: "CAD",
    },
    update: {
      accountName: input.displayName ?? input.username ?? undefined,
      handle: handle ?? undefined,
      status: "connected",
      adAccountId: input.accountId ?? undefined,
      zernioAccountId: input.accountId ?? undefined,
      managedBy: "zernio",
      connectedAt: new Date(),
    },
  });

  return { platformId };
}

export async function listZernioConnectionTiles(
  companyId: string,
  companyName: string
): Promise<ConnectionTile[]> {
  const accounts = await listSocialAccounts(companyId, companyName);
  const byPlatform = new Map(accounts.map((a) => [a.platform as string, a]));

  return ZERNIO_CONNECTION_PLATFORMS.map((cat) => {
    const acc = byPlatform.get(cat.id);
    return {
      id: cat.id,
      zernioKey: cat.zernioKey,
      name: cat.name,
      description: cat.description,
      category: cat.category,
      tileClass: cat.tileClass,
      monogram: cat.monogram,
      status: acc?.status ?? "disconnected",
      accountId: acc?.id,
      accountName: acc?.accountName,
      handle: acc?.handle,
      zernioAccountId: acc?.adAccountId,
      connectedAt: acc?.connectedAt,
      followers: acc?.followers,
    };
  });
}

export async function getZernioConnectionsMeta(companyId: string, companyName: string) {
  let profileId: string | null = null;
  if (isZernioEnabled() && hasDatabase()) {
    try {
      profileId = await ensureZernioProfile(companyId, companyName);
    } catch {
      profileId = null;
    }
  }
  return {
    profileId,
    dashboardUrl: "https://zernio.com/dashboard/connections",
    enabled: isZernioEnabled(),
  };
}
