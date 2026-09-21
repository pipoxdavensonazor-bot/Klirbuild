import { prisma } from "@/lib/db";
import { hasDatabase } from "@/lib/auth/auth-service";
import {
  fromPostizPlatform,
  hasPostizApiKey,
  postizCreatePost,
  postizGetConnectUrl,
  postizListIntegrations,
  PostizApiError,
  TO_POSTIZ,
} from "@/lib/social-ads/postiz-client";

export function isPostizEnabled() {
  return hasPostizApiKey();
}

export async function getPostizConnectUrl(platform: string) {
  const integration = TO_POSTIZ[platform] ?? platform;
  const url = await postizGetConnectUrl(integration);
  return { authUrl: url, provider: "postiz" as const };
}

/** Pull connected channels from Postiz into SocialAccountConnection rows. */
export async function syncPostizAccounts(companyId: string) {
  if (!hasDatabase()) throw new PostizApiError("DATABASE_URL requis.", 503);

  const integrations = await postizListIntegrations();
  let synced = 0;

  for (const acc of integrations) {
    if (acc.disabled) continue;
    const platform =
      fromPostizPlatform(acc.identifier || "") ||
      fromPostizPlatform(acc.name || "");
    if (!platform) continue;
    // Live destinations only care about these four (+ keep linkedin if present)
    if (
      !["facebook", "instagram", "tiktok", "youtube", "linkedin"].includes(
        platform
      )
    ) {
      continue;
    }

    await prisma.socialAccountConnection.upsert({
      where: { companyId_platform: { companyId, platform } },
      create: {
        companyId,
        platform,
        accountName: acc.name || platform,
        handle: acc.profile ? `@${acc.profile.replace(/^@/, "")}` : platform,
        status: "connected",
        adAccountId: acc.id,
        managedBy: "postiz",
        connectedAt: new Date(),
        currency: "CAD",
      },
      update: {
        accountName: acc.name || platform,
        handle: acc.profile
          ? `@${acc.profile.replace(/^@/, "")}`
          : undefined,
        status: "connected",
        adAccountId: acc.id,
        managedBy: "postiz",
        connectedAt: new Date(),
      },
    });
    synced++;
  }

  return { synced, total: integrations.length };
}

export async function publishViaPostiz(
  companyId: string,
  input: {
    content: string;
    accountIds: string[];
  }
) {
  if (!hasDatabase()) return { error: "DATABASE_URL requis." as const };

  const accounts = await prisma.socialAccountConnection.findMany({
    where: {
      companyId,
      id: { in: input.accountIds },
      status: "connected",
      managedBy: "postiz",
    },
  });

  if (!accounts.length) {
    // Also allow any connected account that has an adAccountId (postiz id)
    const fallback = await prisma.socialAccountConnection.findMany({
      where: {
        companyId,
        id: { in: input.accountIds },
        status: "connected",
        adAccountId: { not: null },
      },
    });
    if (!fallback.length) {
      return {
        error:
          "Aucun compte Postiz lié. Cliquez Connecter puis synchronisez les comptes." as const,
      };
    }
    accounts.push(...fallback);
  }

  const date = new Date().toISOString();
  const posts = accounts
    .filter((a) => a.adAccountId)
    .map((a) => {
      const type = TO_POSTIZ[a.platform] ?? a.platform;
      const settings: Record<string, unknown> = { __type: type };
      if (type === "facebook") {
        /* optional url */
      }
      if (type === "instagram") {
        settings.post_type = "post";
      }
      if (type === "youtube") {
        settings.title = input.content.slice(0, 90);
        settings.type = "public";
        settings.selfDeclaredMadeForKids = false;
      }
      if (type === "tiktok") {
        settings.privacy_level = "PUBLIC_TO_EVERYONE";
        settings.content_posting_method = "DIRECT_POST";
      }
      return {
        integration: { id: a.adAccountId as string },
        value: [{ content: input.content, image: [] as unknown[] }],
        settings,
      };
    });

  if (!posts.length) {
    return { error: "Identifiants Postiz manquants — reconnectez les comptes." as const };
  }

  try {
    const result = await postizCreatePost({
      type: "now",
      date,
      posts,
    });
    return { ok: true as const, result, accountIds: accounts.map((a) => a.id) };
  } catch (err) {
    const message =
      err instanceof PostizApiError
        ? err.message
        : "Publication Postiz échouée.";
    return { error: message };
  }
}
