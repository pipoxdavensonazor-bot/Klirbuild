import { NextResponse } from "next/server";
import {
  isPlatformAdminResponse,
  requirePlatformAdmin,
} from "@/lib/admin/require-platform-admin";
import {
  listSponsoredCampaigns,
  reviewSponsoredCampaign,
} from "@/lib/sponsored-ads/sponsored-ads-service";

export const runtime = "nodejs";

export async function GET() {
  const gate = await requirePlatformAdmin();
  if (isPlatformAdminResponse(gate)) return gate;

  const campaigns = await listSponsoredCampaigns();
  return NextResponse.json({ campaigns });
}

export async function PATCH(request: Request) {
  const gate = await requirePlatformAdmin();
  if (isPlatformAdminResponse(gate)) return gate;

  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  const status = body.status as "active" | "rejected" | "paused";
  if (!id || !["active", "rejected", "paused"].includes(status)) {
    return NextResponse.json({ error: "id + status invalides" }, { status: 400 });
  }

  const campaign = await reviewSponsoredCampaign({
    id,
    status,
    reviewedByEmail: gate.email,
    reviewNote: typeof body.reviewNote === "string" ? body.reviewNote : undefined,
  });

  return NextResponse.json({ ok: true, campaign });
}
