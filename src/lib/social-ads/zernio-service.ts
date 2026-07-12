import { prisma } from "@/lib/db";
import type { SocialPlatform } from "@/lib/reports/types";
import { catalogPlatformById } from "@/lib/social-ads/zernio-connections-catalog";
import {
  audienceSlotsForPlatform,
  fromZernioPlatform,
  TO_ZERNIO,
} from "@/lib/social-ads/zernio-platforms";
import {
  hasZernioApiKey,
  zernioCreatePost,
  zernioCreateProfile,
  zernioGetAnalytics,
  zernioGetConnectUrl,
  zernioListAccounts,
  zernioNextQueueSlot,
  ZernioApiError,
} from "@/lib/social-ads/zernio-client";

export function isZernioEnabled() {
  return hasZernioApiKey();
}

export async function ensureZernioProfile(companyId: string, companyName: string) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { zernioProfileId: true, name: true },
  });
  if (!company) throw new ZernioApiError("Entreprise introuvable.", 404);
  if (company.zernioProfileId) return company.zernioProfileId;

  const profile = await zernioCreateProfile(
    companyName || company.name,
    `Profil KlirBuild — ${companyId}`
  );
  await prisma.company.update({
    where: { id: companyId },
    data: { zernioProfileId: profile._id },
  });
  return profile._id;
}

export async function getZernioConnectUrl(
  companyId: string,
  companyName: string,
  platformOrKey: string,
  redirectUrl?: string
) {
  const profileId = await ensureZernioProfile(companyId, companyName);
  const fromCatalog = catalogPlatformById(platformOrKey);
  const zernioPlatform =
    fromCatalog?.zernioKey ??
    TO_ZERNIO[platformOrKey as SocialPlatform] ??
    platformOrKey;
  const authUrl = await zernioGetConnectUrl(zernioPlatform, profileId, redirectUrl);
  return { authUrl, profileId, zernioPlatform };
}

export async function syncZernioAccounts(companyId: string, companyName: string) {
  const profileId = await ensureZernioProfile(companyId, companyName);
  const accounts = await zernioListAccounts();
  const profileAccounts = accounts.filter(
    (a) => !a.profileId || a.profileId === profileId
  );

  let synced = 0;
  for (const acc of profileAccounts) {
    const platform = fromZernioPlatform(acc.platform);
    if (!platform) continue;

    await prisma.socialAccountConnection.upsert({
      where: { companyId_platform: { companyId, platform } },
      create: {
        companyId,
        platform,
        accountName: acc.displayName ?? acc.username ?? platform,
        handle: acc.username ? `@${acc.username.replace(/^@/, "")}` : platform,
        status: acc.status === "error" ? "needs_reauth" : "connected",
        adAccountId: acc._id,
        zernioAccountId: acc._id,
        managedBy: "zernio",
        followers: acc.followersCount ?? null,
        connectedAt: new Date(),
        currency: "CAD",
      },
      update: {
        accountName: acc.displayName ?? acc.username ?? platform,
        handle: acc.username ? `@${acc.username.replace(/^@/, "")}` : undefined,
        status: acc.status === "error" ? "needs_reauth" : "connected",
        adAccountId: acc._id,
        zernioAccountId: acc._id,
        managedBy: "zernio",
        followers: acc.followersCount ?? undefined,
        connectedAt: new Date(),
      },
    });
    synced++;
  }

  return { synced, profileId };
}

export async function getZernioNextSlot(companyId: string, companyName: string) {
  const profileId = await ensureZernioProfile(companyId, companyName);
  const slot = await zernioNextQueueSlot(profileId);
  return { profileId, nextSlot: slot };
}

export async function getAudienceRecommendations(platform: SocialPlatform) {
  const slots = audienceSlotsForPlatform(platform);
  let analyticsBoost: Record<string, number> = {};
  if (hasZernioApiKey()) {
    try {
      const data = await zernioGetAnalytics(5);
      const items = data.analytics ?? data.posts ?? [];
      for (const item of items) {
        if (item.platform && typeof item.engagement === "number") {
          analyticsBoost[item.platform] = item.engagement;
        }
      }
    } catch {
      /* fallback to static slots */
    }
  }
  return { slots, analyticsBoost };
}

export type PublishInput = {
  name: string;
  content: string;
  accountId?: string;
  accountIds?: string[];
  platform?: SocialPlatform;
  mode: "now" | "schedule" | "queue";
  scheduledFor?: string;
  timezone?: string;
  mediaUrls?: string[];
  objective?: string;
  dailyBudget?: number;
};

function zernioPlatformForAccount(platform: string) {
  const fromCatalog = catalogPlatformById(platform);
  if (fromCatalog) return fromCatalog.zernioKey;
  return TO_ZERNIO[platform as SocialPlatform] ?? platform;
}

export async function publishViaZernio(
  companyId: string,
  companyName: string,
  input: PublishInput
) {
  const content = input.content.trim();
  if (!content) return { error: "Contenu requis." as const };

  const targetIds =
    input.accountIds?.filter(Boolean) ??
    (input.accountId ? [input.accountId] : []);

  if (!targetIds.length) {
    return { error: "Sélectionnez au moins un compte connecté." as const };
  }

  const accounts = await prisma.socialAccountConnection.findMany({
    where: { id: { in: targetIds }, companyId, status: "connected" },
  });

  if (!accounts.length) {
    return { error: "Aucun compte connecté valide." as const };
  }

  const platforms: Array<{ platform: string; accountId: string }> = [];
  for (const account of accounts) {
    const zernioAccountId = account.zernioAccountId ?? account.adAccountId;
    if (!zernioAccountId) {
      return {
        error: `Compte Zernio manquant pour ${account.platform} — reconnectez le compte.`,
      } as const;
    }
    platforms.push({
      platform: zernioPlatformForAccount(account.platform),
      accountId: zernioAccountId,
    });
  }

  const profileId = await ensureZernioProfile(companyId, companyName);

  const postBody: Parameters<typeof zernioCreatePost>[0] = {
    content,
    platforms,
    timezone: input.timezone ?? "America/Toronto",
  };

  if (input.mediaUrls?.length) {
    postBody.mediaItems = input.mediaUrls.map((url) => ({ url, type: "image" }));
  }

  if (input.mode === "now") {
    postBody.publishNow = true;
  } else if (input.mode === "queue") {
    postBody.queuedFromProfile = profileId;
  } else if (input.scheduledFor) {
    postBody.scheduledFor = input.scheduledFor;
  } else {
    return { error: "Date de publication requise." as const };
  }

  const zernioPost = await zernioCreatePost(postBody);

  const status =
    input.mode === "now"
      ? "active"
      : input.mode === "queue" || input.scheduledFor
        ? "draft"
        : "active";

  const campaigns = [];
  for (const account of accounts) {
    const row = await prisma.socialAdCampaignRecord.create({
      data: {
        companyId,
        accountId: account.id,
        name: input.name.trim() || "Publication",
        platform: account.platform,
        objective: input.objective ?? "awareness",
        status,
        dailyBudget: input.dailyBudget ?? 0,
        zernioPostId: zernioPost._id,
        content,
        scheduledFor: zernioPost.scheduledFor
          ? new Date(zernioPost.scheduledFor)
          : input.scheduledFor
            ? new Date(input.scheduledFor)
            : null,
        publishMode: input.mode,
        startDate: new Date(),
      },
    });
    campaigns.push({
      id: row.id,
      name: row.name,
      platform: row.platform as SocialPlatform,
      accountId: row.accountId,
      objective: row.objective as "leads" | "traffic" | "awareness" | "conversions",
      status: row.status as "draft" | "active" | "paused" | "ended",
      dailyBudget: Number(row.dailyBudget),
      spend: Number(row.spend),
      impressions: row.impressions,
      clicks: row.clicks,
      leads: row.leads,
      startDate: row.startDate.toISOString().slice(0, 10),
      endDate: row.endDate?.toISOString().slice(0, 10),
      zernioPostId: row.zernioPostId ?? undefined,
      content: row.content ?? undefined,
      scheduledFor: row.scheduledFor?.toISOString(),
      publishMode: row.publishMode ?? undefined,
    });
  }

  const networkLabels = accounts
    .map((a) => catalogPlatformById(a.platform)?.name ?? a.platform)
    .join(", ");

  return {
    campaigns,
    campaign: campaigns[0],
    zernioPost,
    publishedCount: accounts.length,
    message:
      input.mode === "now"
        ? `Publication instantanée envoyée sur ${accounts.length} réseau(x) : ${networkLabels}.`
        : input.mode === "queue"
          ? `Publication planifiée sur ${accounts.length} réseau(x) au prochain créneau optimal.`
          : `Publication planifiée sur ${accounts.length} réseau(x) pour ${input.scheduledFor}.`,
  };
}
