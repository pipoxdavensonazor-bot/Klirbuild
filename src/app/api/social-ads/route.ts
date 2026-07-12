import { NextResponse } from "next/server";
import { enrichSession, getRequestSession } from "@/lib/auth/auth-service";
import { DEMO_COMPANY_ID } from "@/lib/billing/constants";
import { prisma } from "@/lib/db";
import {
  connectSocialAccountViaKlirline,
  createSocialCampaign,
  disconnectSocialAccount,
  listSocialAccounts,
  listSocialCampaigns,
  reauthSocialAccount,
  syncCampaignInsights,
} from "@/lib/social-ads/social-ads-service";
import {
  klirlineMarketingPortalUrl,
  klirlineOAuthUrl,
} from "@/lib/social-ads/klirline-marketing";
import type { SocialPlatform } from "@/lib/reports/types";

export const runtime = "nodejs";

async function companyContext() {
  const session = await getRequestSession();
  if (!session) {
    return { companyId: DEMO_COMPANY_ID, companyName: "KlirBuild Demo" };
  }
  const enriched = await enrichSession(session);
  let companyName = "Mon entreprise";
  if (process.env.DATABASE_URL) {
    const company = await prisma.company.findUnique({
      where: { id: enriched.companyId },
      select: { name: true },
    });
    if (company?.name) companyName = company.name;
  }
  return { companyId: enriched.companyId, companyName };
}

export async function GET() {
  const { companyId, companyName } = await companyContext();
  const [accounts, campaigns] = await Promise.all([
    listSocialAccounts(companyId, companyName),
    listSocialCampaigns(companyId),
  ]);
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "https://www.klirline.app";
  return NextResponse.json({
    accounts,
    campaigns,
    klirline: {
      hubUrl: klirlineMarketingPortalUrl(companyId),
      contact: "Contact@klirline.ca",
      managedBy: "Klirline.ca — partenaire marketing officiel",
    },
    callbackUrl: `${appUrl}/api/social-ads/callback`,
  });
}

export async function POST(request: Request) {
  const { companyId, companyName } = await companyContext();
  const body = await request.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "connect";

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "https://www.klirline.app";
  const callbackUrl = `${appUrl}/api/social-ads/callback`;

  if (action === "oauth_url") {
    const platform = body.platform as SocialPlatform;
    if (!platform) {
      return NextResponse.json({ error: "Plateforme requise." }, { status: 400 });
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
      message: `Compte ${plat} connecté via Klirline.ca`,
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
    return NextResponse.json({
      oauthUrl: klirlineOAuthUrl({
        companyId,
        companyName,
        platform: (body.platform as SocialPlatform) ?? "meta",
        returnUrl: callbackUrl,
      }),
    });
  }

  if (action === "sync") {
    const result = await syncCampaignInsights(companyId);
    const campaigns = await listSocialCampaigns(companyId);
    return NextResponse.json({ ...result, campaigns });
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
}
