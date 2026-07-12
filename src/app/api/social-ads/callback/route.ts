import { NextResponse } from "next/server";
import { connectSocialAccountViaKlirline } from "@/lib/social-ads/social-ads-service";
import { connectZernioCallbackAccount } from "@/lib/social-ads/zernio-connections-service";
import { isZernioEnabled, syncZernioAccounts } from "@/lib/social-ads/zernio-service";
import type { SocialPlatform } from "@/lib/reports/types";

export const runtime = "nodejs";

/**
 * Callback OAuth → KlirBuild
 * Klirline: ?company_id=...&platform=meta&status=ok
 * Zernio: ?company_id=...&connected=facebook&accountId=...&username=...
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const companyId = url.searchParams.get("company_id")?.trim() ?? "";
  const platform = (url.searchParams.get("platform")?.trim() ?? "meta") as SocialPlatform;
  const status = url.searchParams.get("status")?.trim() ?? "ok";
  const connected = url.searchParams.get("connected")?.trim();
  const ref = url.searchParams.get("ref")?.trim();
  const accountName = url.searchParams.get("account_name")?.trim();
  const handle = url.searchParams.get("handle")?.trim();
  const adAccountId = url.searchParams.get("ad_account_id")?.trim();
  const zernioAccountId = url.searchParams.get("accountId")?.trim();
  const username = url.searchParams.get("username")?.trim();
  const displayName = url.searchParams.get("displayName")?.trim();

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "https://www.klirline.app";
  const redirectBase = `${appUrl}/social-ads`;

  if (!companyId) {
    return NextResponse.redirect(
      `${redirectBase}?error=${encodeURIComponent("Paramètre company_id manquant")}&tab=connections`
    );
  }

  if (connected && connected !== "zernio" && isZernioEnabled()) {
    try {
      await connectZernioCallbackAccount(companyId, "Entreprise", {
        zernioPlatform: connected,
        accountId: zernioAccountId,
        username,
        displayName: displayName ?? accountName,
      });
    } catch {
      /* fallback to full sync */
    }
    try {
      await syncZernioAccounts(companyId, "Entreprise");
    } catch {
      /* redirect anyway */
    }
    return NextResponse.redirect(
      `${redirectBase}?tab=connections&connected=${encodeURIComponent(connected)}&provider=zernio`
    );
  }

  if (connected === "zernio" || (isZernioEnabled() && status === "ok" && !platform)) {
    try {
      await syncZernioAccounts(companyId, "Entreprise");
    } catch {
      /* redirect anyway */
    }
    return NextResponse.redirect(
      `${redirectBase}?tab=connections&connected=${encodeURIComponent(platform)}&provider=zernio`
    );
  }

  if (status !== "ok") {
    return NextResponse.redirect(
      `${redirectBase}?error=${encodeURIComponent("Connexion annulée ou échouée")}&tab=connections`
    );
  }

  await connectSocialAccountViaKlirline(companyId, platform, {
    accountName: accountName ?? undefined,
    handle: handle ?? undefined,
    adAccountId: adAccountId ?? undefined,
    klirlineRef: ref ?? undefined,
  });

  return NextResponse.redirect(
    `${redirectBase}?tab=connections&connected=${encodeURIComponent(platform)}`
  );
}
