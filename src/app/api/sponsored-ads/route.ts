import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/auth-service";
import {
  createSponsoredCampaign,
  listSponsoredCampaigns,
} from "@/lib/sponsored-ads/sponsored-ads-service";
import { SPONSORED_AD_PRICING } from "@/lib/sponsored-ads/pricing";

export const runtime = "nodejs";

export async function GET() {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const campaigns = await listSponsoredCampaigns({
    advertiserCompanyId: session.companyId,
  });
  return NextResponse.json({
    campaigns,
    pricing: SPONSORED_AD_PRICING,
  });
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const body = await request.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title : "";
  const headline = typeof body.headline === "string" ? body.headline : "";
  const bodyText = typeof body.body === "string" ? body.body : "";
  const ctaUrl = typeof body.ctaUrl === "string" ? body.ctaUrl : "";

  if (!title || !headline || !bodyText || !ctaUrl) {
    return NextResponse.json(
      { error: "title, headline, body, ctaUrl requis" },
      { status: 400 }
    );
  }

  const campaign = await createSponsoredCampaign({
    advertiserCompanyId: session.companyId,
    title,
    headline,
    body: bodyText,
    ctaLabel: typeof body.ctaLabel === "string" ? body.ctaLabel : undefined,
    ctaUrl,
    imageUrl: typeof body.imageUrl === "string" ? body.imageUrl : undefined,
    surface: body.surface,
    dailyBudgetCad:
      typeof body.dailyBudgetCad === "number" ? body.dailyBudgetCad : undefined,
    totalBudgetCad:
      typeof body.totalBudgetCad === "number" ? body.totalBudgetCad : undefined,
    submitForReview: body.submitForReview !== false,
  });

  return NextResponse.json({ ok: true, campaign });
}
