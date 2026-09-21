import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/auth-service";
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
import { connectSocialAccountViaKlirline } from "@/lib/social-ads/social-ads-service";
import {
  getPostizConnectUrl,
  isPostizEnabled,
  publishViaPostiz,
  syncPostizAccounts,
} from "@/lib/social-ads/postiz-service";
import { resolveSocialProvider } from "@/lib/social-ads/social-provider";
import type { SocialPlatform } from "@/lib/reports/types";

export const runtime = "nodejs";

async function hostContext() {
  const session = await requireSession();
  if (session instanceof NextResponse) return { error: session };
  if (!canApp(session.role, "live:host") && !canApp(session.role, "meetings:host")) {
    return {
      error: NextResponse.json({ error: "Permission refusée." }, { status: 403 }),
    };
  }
  let companyName = "Mon entreprise";
  const company = await prisma.company.findUnique({
    where: { id: session.companyId },
    select: { name: true },
  });
  if (company?.name) companyName = company.name;
  return { enriched: session, companyName };
}

export async function GET() {
  const ctx = await hostContext();
  if ("error" in ctx && ctx.error) return ctx.error;

  const provider = resolveSocialProvider();
  // Keep Postiz channels in sync when listing
  if (provider === "postiz") {
    try {
      await syncPostizAccounts(ctx.enriched.companyId);
    } catch {
      /* list still works offline */
    }
  }

  const destinations = await listLiveSocialDestinations(ctx.enriched.companyId);
  return NextResponse.json({
    destinations,
    provider,
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
  const provider = resolveSocialProvider();

  if (action === "oauth_url") {
    const platform =
      typeof body.platform === "string" ? body.platform.trim() : "";
    if (!isLiveSocialPlatform(platform)) {
      return NextResponse.json({ error: "Plateforme invalide." }, { status: 400 });
    }

    if (provider === "zernio") {
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

    if (provider === "postiz") {
      try {
        const { authUrl } = await getPostizConnectUrl(platform);
        return NextResponse.json({
          oauthUrl: authUrl,
          provider: "postiz",
          hint: "Après autorisation, revenez au Feed — les comptes se synchronisent automatiquement.",
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Connexion Postiz impossible.";
        return NextResponse.json({ error: message, provider: "postiz" }, { status: 400 });
      }
    }

    return NextResponse.json(
      {
        error:
          "Liez le compte ici (nom de page), ou configurez POSTIZ_API_KEY (gratuit self-host) / ZERNIO_API_KEY pour OAuth natif.",
        code: "USE_IN_APP_CONNECT",
        provider: "in_app",
      },
      { status: 400 }
    );
  }

  if (action === "sync_accounts") {
    if (provider === "postiz") {
      try {
        const result = await syncPostizAccounts(companyId);
        return NextResponse.json({
          ok: true,
          ...result,
          destinations: await listLiveSocialDestinations(companyId),
          provider,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Sync Postiz impossible.";
        return NextResponse.json({ error: message }, { status: 400 });
      }
    }
    return NextResponse.json(
      { error: "Sync disponible avec POSTIZ_API_KEY ou ZERNIO_API_KEY." },
      { status: 400 }
    );
  }

  if (action === "connect_account") {
    const platform =
      typeof body.platform === "string" ? body.platform.trim() : "";
    if (!isLiveSocialPlatform(platform)) {
      return NextResponse.json({ error: "Plateforme invalide." }, { status: 400 });
    }
    const accountName =
      typeof body.accountName === "string" && body.accountName.trim()
        ? body.accountName.trim()
        : `Page ${platform}`;
    const handle =
      typeof body.handle === "string" ? body.handle.trim() : undefined;
    const result = await connectSocialAccountViaKlirline(
      companyId,
      platform as SocialPlatform,
      {
        accountName,
        handle,
        klirlineRef: `in-app/${companyId}/${platform}`,
      }
    );
    if ("error" in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      account: result.account,
      destinations: await listLiveSocialDestinations(companyId),
      provider,
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

    if (isZernioEnabled()) {
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
        provider: "zernio",
        destinations: await listLiveSocialDestinations(companyId),
      });
    }

    if (isPostizEnabled()) {
      // Refresh Postiz ids before publish
      try {
        await syncPostizAccounts(companyId);
      } catch {
        /* continue with stored ids */
      }
      const published = await publishViaPostiz(companyId, {
        content,
        accountIds: accounts.map((a) => a.id),
      });
      if ("error" in published && published.error) {
        return NextResponse.json({ error: published.error }, { status: 400 });
      }
      return NextResponse.json({
        ok: true,
        published,
        provider: "postiz",
        destinations: await listLiveSocialDestinations(companyId),
      });
    }

    return NextResponse.json({
      ok: true,
      simulated: true,
      message:
        "Comptes prêts. Ajoutez POSTIZ_API_KEY (gratuit self-host) ou ZERNIO_API_KEY pour publier automatiquement l’annonce live.",
      content,
      accountIds: accounts.map((a) => a.id),
      destinations: await listLiveSocialDestinations(companyId),
    });
  }

  return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
}
