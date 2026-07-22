import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/auth-service";
import {
  getActivePlacement,
  trackSponsoredEvent,
} from "@/lib/sponsored-ads/sponsored-ads-service";
import type { SponsoredSurface } from "@/lib/sponsored-ads/pricing";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const url = new URL(request.url);
  const surface = (url.searchParams.get("surface") ||
    "dashboard") as SponsoredSurface;

  const placement = await getActivePlacement({
    surface,
    viewerCompanyId: session.companyId,
  });

  if (!placement) {
    return NextResponse.json({ placement: null });
  }

  // Compte l'impression (revenu plateforme)
  await trackSponsoredEvent({
    campaignId: placement.id,
    type: "impression",
    viewerCompanyId: session.companyId,
    viewerEmail: session.email,
  });

  return NextResponse.json({
    placement: {
      id: placement.id,
      title: placement.title,
      headline: placement.headline,
      body: placement.body,
      ctaLabel: placement.ctaLabel,
      ctaUrl: placement.ctaUrl,
      imageUrl: placement.imageUrl,
      surface: placement.surface,
      sponsored: true,
    },
  });
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const body = await request.json().catch(() => ({}));
  const campaignId = typeof body.campaignId === "string" ? body.campaignId : "";
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId requis" }, { status: 400 });
  }

  const result = await trackSponsoredEvent({
    campaignId,
    type: "click",
    viewerCompanyId: session.companyId,
    viewerEmail: session.email,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
