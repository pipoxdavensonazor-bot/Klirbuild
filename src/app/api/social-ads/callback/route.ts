import { NextResponse } from "next/server";
import { connectSocialAccountViaKlirline } from "@/lib/social-ads/social-ads-service";
import type { SocialPlatform } from "@/lib/reports/types";

export const runtime = "nodejs";

/**
 * Callback OAuth Klirline.ca → KlirBuild
 * URL: /api/social-ads/callback?company_id=...&platform=meta&status=ok&ref=...
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const companyId = url.searchParams.get("company_id")?.trim() ?? "";
  const platform = (url.searchParams.get("platform")?.trim() ?? "meta") as SocialPlatform;
  const status = url.searchParams.get("status")?.trim() ?? "ok";
  const ref = url.searchParams.get("ref")?.trim();
  const accountName = url.searchParams.get("account_name")?.trim();
  const handle = url.searchParams.get("handle")?.trim();
  const adAccountId = url.searchParams.get("ad_account_id")?.trim();

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "https://www.klirline.app";
  const redirectBase = `${appUrl}/social-ads`;

  if (!companyId || status !== "ok") {
    return NextResponse.redirect(
      `${redirectBase}?error=${encodeURIComponent("Connexion annulée ou échouée")}`
    );
  }

  await connectSocialAccountViaKlirline(companyId, platform, {
    accountName: accountName ?? undefined,
    handle: handle ?? undefined,
    adAccountId: adAccountId ?? undefined,
    klirlineRef: ref ?? undefined,
  });

  return NextResponse.redirect(
    `${redirectBase}?connected=${encodeURIComponent(platform)}`
  );
}
