import { NextResponse } from "next/server";
import { enrichSession, getRequestSession, hasDatabase } from "@/lib/auth/auth-service";
import { prisma } from "@/lib/db";
import { isZernioEnabled } from "@/lib/social-ads/zernio-service";
import type { MarketRegionId } from "@/lib/markets/regions";

export async function GET() {
  const session = await getRequestSession();
  if (!session) {
    return NextResponse.json({ authenticated: false });
  }

  const enriched = await enrichSession(session);

  if (hasDatabase()) {
    const user = await prisma.user.findUnique({
      where: { email: enriched.email },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            plan: true,
            subscriptionStatus: true,
            marketRegion: true,
          },
        },
      },
    });
    const employee = await prisma.employeeProfile.findFirst({
      where: { companyId: enriched.companyId, email: enriched.email },
      select: { id: true },
    });
    if (user?.company) {
      return NextResponse.json({
        authenticated: true,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: user.companyId,
        companyName: user.company.name,
        plan: user.company.plan,
        subscriptionStatus: user.company.subscriptionStatus,
        marketRegion: (user.company.marketRegion || "CA-QC") as MarketRegionId,
        employeeId: employee?.id ?? null,
        zernioEnabled: isZernioEnabled(),
      });
    }
  }

  return NextResponse.json({
    authenticated: true,
    email: enriched.email,
    role: enriched.role,
    companyId: enriched.companyId,
    plan: "growth",
    marketRegion: "CA-QC" as MarketRegionId,
    employeeId: null,
    zernioEnabled: isZernioEnabled(),
  });
}
