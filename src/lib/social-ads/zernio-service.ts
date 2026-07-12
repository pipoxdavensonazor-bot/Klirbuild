import { prisma } from "@/lib/db";
import type { SocialPlatform } from "@/lib/reports/types";
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
  platform: SocialPlatform
) {
  const profileId = await ensureZernioProfile(companyId, companyName);
  const zernioPlatform = TO_ZERNIO[platform] ?? platform;
  const authUrl = await zernioGetConnectUrl(zernioPlatform, profileId);
  return { authUrl, profileId };
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
  accountId: string;
  platform: SocialPlatform;
  mode: "now" | "schedule" | "queue";
  scheduledFor?: string;
  timezone?: string;
  mediaUrls?: string[];
  objective?: string;
  dailyBudget?: number;
};

export async function publishViaZernio(
  companyId: string,
  companyName: string,
  input: PublishInput
) {
  const content = input.content.trim();
  if (!content) return { error: "Contenu requis." as const };

  const account = await prisma.socialAccountConnection.findFirst({
    where: { id: input.accountId, companyId },
  });
  if (!account || account.status !== "connected") {
    return { error: "Compte non connecté." as const };
  }

  const zernioAccountId = account.zernioAccountId ?? account.adAccountId;
  if (!zernioAccountId) {
    return { error: "Compte Zernio manquant — reconnectez le compte." as const };
  }

  const profileId = await ensureZernioProfile(companyId, companyName);
  const zernioPlatform = TO_ZERNIO[input.platform] ?? TO_ZERNIO[account.platform as SocialPlatform];

  const postBody: Parameters<typeof zernioCreatePost>[0] = {
    content,
    platforms: [{ platform: zernioPlatform, accountId: zernioAccountId }],
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

  const row = await prisma.socialAdCampaignRecord.create({
    data: {
      companyId,
      accountId: input.accountId,
      name: input.name.trim() || "Publication",
      platform: input.platform,
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

  return {
    campaign: {
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
    },
    zernioPost,
    message:
      input.mode === "now"
        ? "Publication envoyée sur les réseaux via Zernio."
        : input.mode === "queue"
          ? `Publication planifiée au prochain créneau optimal (${zernioPost.scheduledFor ?? "file d'attente"}).`
          : `Publication planifiée pour ${input.scheduledFor}.`,
  };
}
