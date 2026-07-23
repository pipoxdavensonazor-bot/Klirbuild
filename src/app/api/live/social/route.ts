import { NextResponse } from "next/server";
import { enrichSession, requireSession } from "@/lib/auth/auth-service";
import { canApp } from "@/lib/workforce/types";
import { prisma } from "@/lib/db";
import {
  isLiveSocialPlatform,
  listLiveSocialDestinations,
  liveAnnounceMessage,
  saveRtmpDestination,
} from "@/lib/meetings/live-social";
import {
  getZernioConnectUrl,
  isZernioEnabled,
  publishViaZernio,
} from "@/lib/social-ads/zernio-service";
import { ensureConnectionSlot } from "@/lib/social-ads/zernio-connections-service";
import { klirlineOAuthUrl } from "@/lib/social-ads/klirline-marketing";
import type { SocialPlatform } from "@/lib/reports/types";

export const runtime = "nodejs";

async function hostContext() {
  const session = await requireSession();
  if (session instanceof NextResponse) return { error: session };
  const enriched = await enrichSession(session);
  if (!canApp(enriched.role, "live:host") && !canApp(enriched.role, "meetings:host")) {
    return {
      error: NextResponse.json({ error: "Permission refusée." }, { status: 403 }),
    };
  }
  let companyName = "Mon entreprise";
  const company = await prisma.company.findUnique({
    where: { id: enriched.companyId },
    select: { name: true },
  });
  if (company?.name) companyName = company.name;
  return { enriched, companyName };
}

export async function GET() {
  const ctx = await hostContext();
  if ("error" in ctx && ctx.error) return ctx.error;

  const destinations = await listLiveSocialDestinations(ctx.enriched.companyId);
  return NextResponse.json({
    destinations,
    provider: isZernioEnabled() ? "zernio" : "klirline",
    platforms: ["facebook", "instagram", "tiktok", "youtube"],
  });
}

export async function POST(request: Request) {
  const ctx = await hostContext();
  if ("error" in ctx && ctx.error) return ctx.error;

  const body = await request.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "";
  const companyId = ctx.enriched.companyId;
  const companyName = ctx.companyName;
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://klirline.app";
  const callbackUrl = `${appUrl}/api/social-ads/callback`;

  if (action === "oauth_url") {
    const platform =
      typeof body.platform === "string" ? body.platform.trim() : "";
    if (!isLiveSocialPlatform(platform)) {
      return NextResponse.json({ error: "Plateforme invalide." }, { status: 400 });
    }
    if (isZernioEnabled()) {
      await ensureConnectionSlot(companyId, platform, companyName);
      const redirectUrl = `${callbackUrl}?company_id=${encodeURIComponent(companyId)}&return=/feed`;
      const { authUrl } = await getZernioConnectUrl(
        companyId,
        companyName,
        platform,
        redirectUrl
      );
      return NextResponse.json({ oauthUrl: authUrl, provider: "zernio" });
    }
    return NextResponse.json({
      oauthUrl: klirlineOAuthUrl({
        companyId,
        companyName,
        platform: platform as SocialPlatform,
        returnUrl: `${callbackUrl}?return=/feed`,
      }),
      provider: "klirline",
    });
  }

  if (action === "save_rtmp") {
    const platform =
      typeof body.platform === "string" ? body.platform.trim() : "";
    if (!isLiveSocialPlatform(platform)) {
      return NextResponse.json({ error: "Plateforme invalide." }, { status: 400 });
    }
    await saveRtmpDestination(companyId, platform, {
      rtmpUrl: typeof body.rtmpUrl === "string" ? body.rtmpUrl : undefined,
      streamKey: typeof body.streamKey === "string" ? body.streamKey : undefined,
    });
    const destinations = await listLiveSocialDestinations(companyId);
    return NextResponse.json({ ok: true, destinations });
  }

  if (action === "announce") {
    const title =
      typeof body.title === "string" && body.title.trim()
        ? body.title.trim()
        : "Live KlirBuild";
    const liveUrl =
      typeof body.liveUrl === "string" ? body.liveUrl.trim() : "";
    const platformIds = Array.isArray(body.platforms)
      ? body.platforms.filter(
          (p: unknown): p is string =>
            typeof p === "string" && isLiveSocialPlatform(p)
        )
      : [];
    if (!liveUrl) {
      return NextResponse.json({ error: "URL du live requise." }, { status: 400 });
    }
    if (!platformIds.length) {
      return NextResponse.json(
        { error: "Choisissez au moins un réseau." },
        { status: 400 }
      );
    }

    const accounts = await prisma.socialAccountConnection.findMany({
      where: {
        companyId,
        platform: { in: platformIds },
        status: "connected",
      },
    });

    if (!accounts.length) {
      return NextResponse.json(
        {
          error:
            "Aucun compte connecté. Connectez YouTube / Facebook / TikTok / Instagram d’abord.",
        },
        { status: 400 }
      );
    }

    const content = liveAnnounceMessage({ title, liveUrl, companyName });

    if (!isZernioEnabled()) {
      return NextResponse.json({
        ok: true,
        simulated: true,
        message:
          "Comptes prêts. Ajoutez ZERNIO_API_KEY pour publier automatiquement l’annonce live sur les réseaux.",
        content,
        accountIds: accounts.map((a) => a.id),
        destinations: await listLiveSocialDestinations(companyId),
      });
    }

    const published = await publishViaZernio(companyId, companyName, {
      name: `Live — ${title}`,
      content,
      accountIds: accounts.map((a) => a.id),
      mode: "now",
      objective: "awareness",
    });
    if ("error" in published && published.error) {
      return NextResponse.json({ error: published.error }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      published,
      destinations: await listLiveSocialDestinations(companyId),
    });
  }

  return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
}
