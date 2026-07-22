import { NextResponse } from "next/server";
import {
  isPlatformAdminResponse,
  requirePlatformAdmin,
} from "@/lib/admin/require-platform-admin";
import { getPlatformOverview } from "@/lib/admin/platform-overview";

export const runtime = "nodejs";

export async function GET() {
  const gate = await requirePlatformAdmin();
  if (isPlatformAdminResponse(gate)) return gate;

  const overview = await getPlatformOverview();
  return NextResponse.json(overview);
}
