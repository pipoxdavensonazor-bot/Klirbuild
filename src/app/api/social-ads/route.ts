import { NextResponse } from "next/server";
import { requireCompanyContext } from "@/lib/auth/require-company";
import { prisma } from "@/lib/db";
import {
  connectSocialAccountViaKlirline,
  createSocialCampaign,
  disconnectSocialAccount,
  listSocialAccounts,
  listSocialCampaigns,
  reauthSocialAccount,
  socialAdsLoadErrorMessage,
  syncCampaignInsights,
} from "@/lib/social-ads/social-ads-service";
import {
  klirlineMarketingPortalUrl,
  klirlineOAuthUrl,
} from "@/lib/social-ads/klirline-marketing";
import {
  getAudienceRecommendations,
  getZernioConnectUrl,
  getZernioNextSlot,
  isZernioEnabled,
  publishViaZernio,
  syncZernioAccounts,
} from "@/lib/social-ads/zernio-service";
import {
  ensureConnectionSlot,
  getZernioConnectionsMeta,
  listZernioConnectionTiles,
} from "@/lib/social-ads/zernio-connections-service";
import { ZernioApiError } from "@/lib/social-ads/zernio-client";
import type { SocialPlatform } from "@/lib/reports/types";
import { requireCompanyPlanFeature } from "@/lib/billing/require-plan-server";

export const runtime = "nodejs";

async function companyContext(): Promise<
  { companyId: string; companyName: string } | NextResponse
> {
  const auth = await requireCompanyContext();
  if (auth instanceof NextResponse) return auth;
  let companyName = "Mon entreprise";
  if (process.env.DATABASE_URL) {
    const company = await prisma.company.findUnique({
      where: { id: auth.companyId },
      select: { name: true },
    });
    if (company?.name) companyName = company.name;
  }
  return { companyId: auth.companyId, companyName };
}

export async function GET(request: Request) {
  try {
    const ctx = await companyContext();
    if (ctx instanceof NextResponse) return ctx;
    const { companyId, companyName } = ctx;
    const denied = await requireCompanyPlanFeature(companyId, "social_ads");
    if (denied) return denied;
    const url = new URL(request.url);
    const platform = url.searchParams.get("platform") as SocialPlatform | null;

    const [accounts, campaigns] = await Promise.all([
      listSocialAccounts(companyId, companyName),
      listSocialCampaigns(companyId),
    ]);

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "https://www.klirline.app";

    let audience = null;
    let nextSlot = null;
    if (platform) {
      audience = await getAudienceRecommendations(platform);
      if (isZernioEnabled()) {
        try {
          nextSlot = await getZernioNextSlot(companyId, companyName);
        } catch {
          nextSlot = null;
        }
      }
    }

    const zernioEnabled = isZernioEnabled();
    const [connections, zernioMeta] = zernioEnabled
      ? await Promise.all([
          listZernioConnectionTiles(companyId, companyName),
          getZernioConnectionsMeta(companyId, companyName),
        ])
      : [[], { profileId: null, dashboardUrl: "https://zernio.com/dashboard/connections", enabled: false }];

    return NextResponse.json({
      accounts,
      campaigns,
      connections,
      zernioMeta,
      provider: zernioEnabled ? "zernio" : "klirline",
      zernio: {
        enabled: zernioEnabled,
        dashboardUrl: "https://zernio.com/dashboard/connections",
        docsUrl: "https://docs.zernio.com",
        profileId: zernioMeta.profileId,
      },
      klirline: {
        hubUrl: klirlineMarketingPortalUrl(companyId),
        contact: "Contact@klirline.ca",
        managedBy: isZernioEnabled()
          ? "Zernio API — publication multi-réseaux"
          : "Klirline.ca — partenaire marketing officiel",
      },
      audience,
      nextSlot,
      callbackUrl: `${appUrl}/api/social-ads/callback`,
    });
  } catch (err) {
    console.error("[social-ads GET]", err);
    return NextResponse.json(
      {
        accounts: [],
        campaigns: [],
        error: socialAdsLoadErrorMessage(err),
        provider: isZernioEnabled() ? "zernio" : "klirline",
        klirline: {
          contact: "Contact@klirline.ca",
          managedBy: "Klirline.ca",
        },
        zernio: { enabled: isZernioEnabled() },
      },
      { status: 200 }
    );
  }
}

export async function POST(request: Request) {
  const ctx = await companyContext();
  if (ctx instanceof NextResponse) return ctx;
  const { companyId, companyName } = ctx;
  const denied = await requireCompanyPlanFeature(companyId, "social_ads");
  if (denied) return denied;
  const body = await request.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "connect";

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "https://www.klirline.app";
  const callbackUrl = `${appUrl}/api/social-ads/callback`;

  try {
    if (action === "oauth_url") {
      const platformOrKey =
        (typeof body.platformId === "string" && body.platformId) ||
        (body.platform as SocialPlatform | undefined);
      if (!platformOrKey) {
        return NextResponse.json({ error: "Plateforme requise." }, { status: 400 });
      }
      if (isZernioEnabled()) {
        await ensureConnectionSlot(companyId, platformOrKey, companyName);
        const redirectUrl = `${callbackUrl}?company_id=${encodeURIComponent(companyId)}`;
        const { authUrl } = await getZernioConnectUrl(
          companyId,
          companyName,
          platformOrKey,
          redirectUrl
        );
        return NextResponse.json({ oauthUrl: authUrl, provider: "zernio" });
      }
      const platform = platformOrKey as SocialPlatform;
      return NextResponse.json({
        oauthUrl: klirlineOAuthUrl({
          companyId,
          companyName,
          platform,
          returnUrl: callbackUrl,
        }),
        provider: "klirline",
      });
    }

    if (action === "sync_accounts") {
      if (!isZernioEnabled()) {
        return NextResponse.json({ error: "ZERNIO_API_KEY non configuré." }, { status: 503 });
      }
      const result = await syncZernioAccounts(companyId, companyName);
      const [accounts, connections] = await Promise.all([
        listSocialAccounts(companyId, companyName),
        listZernioConnectionTiles(companyId, companyName),
      ]);
      return NextResponse.json({ ...result, accounts, connections });
    }

    if (action === "connect") {
      const platform = body.platform as SocialPlatform;
      const accountId = typeof body.accountId === "string" ? body.accountId : "";
      if (!platform && !accountId) {
        return NextResponse.json({ error: "Plateforme ou ID requis." }, { status: 400 });
      }
      let plat = platform;
      if (!plat && accountId) {
        const accounts = await listSocialAccounts(companyId, companyName);
        plat = accounts.find((a) => a.id === accountId)?.platform ?? "meta";
      }
      const result = await connectSocialAccountViaKlirline(companyId, plat, {
        accountName: typeof body.accountName === "string" ? body.accountName : companyName,
        handle: typeof body.handle === "string" ? body.handle : undefined,
        adAccountId: typeof body.adAccountId === "string" ? body.adAccountId : undefined,
        klirlineRef: typeof body.klirlineRef === "string" ? body.klirlineRef : undefined,
      });
      return NextResponse.json({
        ...result,
        message: `Compte ${plat} connecté.`,
      });
    }

    if (action === "disconnect") {
      const id = typeof body.id === "string" ? body.id : "";
      if (!id) return NextResponse.json({ error: "ID requis." }, { status: 400 });
      const result = await disconnectSocialAccount(companyId, id);
      if ("error" in result && result.error) {
        return NextResponse.json({ error: result.error }, { status: 404 });
      }
      return NextResponse.json(result);
    }

    if (action === "reauth") {
      const id = typeof body.id === "string" ? body.id : "";
      if (!id) return NextResponse.json({ error: "ID requis." }, { status: 400 });
      await reauthSocialAccount(companyId, id);
      const platform = (body.platform as SocialPlatform) ?? "meta";
      if (isZernioEnabled()) {
        const { authUrl } = await getZernioConnectUrl(companyId, companyName, platform);
        return NextResponse.json({ oauthUrl: authUrl });
      }
      return NextResponse.json({
        oauthUrl: klirlineOAuthUrl({
          companyId,
          companyName,
          platform,
          returnUrl: callbackUrl,
        }),
      });
    }

    if (action === "sync") {
      const result = await syncCampaignInsights(companyId);
      const campaigns = await listSocialCampaigns(companyId);
      return NextResponse.json({ ...result, campaigns });
    }

    if (action === "audience") {
      const platform = body.platform as SocialPlatform;
      if (!platform) return NextResponse.json({ error: "Plateforme requise." }, { status: 400 });
      const audience = await getAudienceRecommendations(platform);
      let nextSlot = null;
      if (isZernioEnabled()) {
        try {
          nextSlot = await getZernioNextSlot(companyId, companyName);
        } catch {
          nextSlot = null;
        }
      }
      return NextResponse.json({ audience, nextSlot });
    }

    if (action === "publish") {
      if (!isZernioEnabled()) {
        const result = await createSocialCampaign(companyId, {
          name: typeof body.name === "string" ? body.name : "",
          accountId: typeof body.accountId === "string" ? body.accountId : "",
          platform: body.platform as SocialPlatform,
          objective: body.objective,
          dailyBudget: typeof body.dailyBudget === "number" ? body.dailyBudget : undefined,
        });
        if ("error" in result && result.error) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }
        return NextResponse.json(result);
      }

      const mode = body.mode as "now" | "schedule" | "queue";
      const headline = typeof body.headline === "string" ? body.headline : "";
      const primaryText = typeof body.primaryText === "string" ? body.primaryText : "";
      const callToAction = typeof body.callToAction === "string" ? body.callToAction : "";
      const content = [headline, primaryText, callToAction].filter(Boolean).join("\n\n");

      const accountIds = Array.isArray(body.accountIds)
        ? body.accountIds.filter((id: unknown) => typeof id === "string")
        : undefined;

      const result = await publishViaZernio(companyId, companyName, {
        name: typeof body.name === "string" ? body.name : "Publication",
        content: content || (typeof body.content === "string" ? body.content : ""),
        accountId: typeof body.accountId === "string" ? body.accountId : undefined,
        accountIds,
        platform: body.platform as SocialPlatform | undefined,
        mode: mode ?? "now",
        scheduledFor: typeof body.scheduledFor === "string" ? body.scheduledFor : undefined,
        timezone: typeof body.timezone === "string" ? body.timezone : "America/Toronto",
        mediaUrls: Array.isArray(body.mediaUrls) ? body.mediaUrls : undefined,
        objective: typeof body.objective === "string" ? body.objective : undefined,
        dailyBudget: typeof body.dailyBudget === "number" ? body.dailyBudget : undefined,
      });

      if ("error" in result && result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json(result);
    }

    if (action === "launch_campaign") {
      const result = await createSocialCampaign(companyId, {
        name: typeof body.name === "string" ? body.name : "",
        accountId: typeof body.accountId === "string" ? body.accountId : "",
        platform: body.platform as SocialPlatform,
        objective: body.objective,
        dailyBudget: typeof body.dailyBudget === "number" ? body.dailyBudget : undefined,
      });
      if ("error" in result && result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
  } catch (err) {
    if (err instanceof ZernioApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
