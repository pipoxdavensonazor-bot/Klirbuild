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
            enabledModules: true,
          },
        },
      },
    });
    const viewCompanyId = enriched.companyId || user?.companyId;
    const viewCompany =
      viewCompanyId && viewCompanyId !== user?.companyId
        ? await prisma.company.findUnique({
            where: { id: viewCompanyId },
            select: {
              id: true,
              name: true,
              plan: true,
              subscriptionStatus: true,
              marketRegion: true,
              enabledModules: true,
            },
          })
        : null;
    const company = viewCompany || user?.company;
    const employee = await prisma.employeeProfile.findFirst({
      where: { companyId: viewCompanyId || enriched.companyId, email: enriched.email },
      select: { id: true },
    });
    if (user && company) {
      const isPlatformAdmin =
        Boolean(user.isPlatformAdmin) ||
        user.role === "SUPER_ADMIN" ||
        Boolean(enriched.isPlatformAdmin);
      return NextResponse.json({
        authenticated: true,
        email: user.email,
        name: user.name,
        role: isPlatformAdmin ? user.role : user.role,
        companyId: company.id,
        companyName: company.name,
        plan: company.plan,
        subscriptionStatus: company.subscriptionStatus,
        marketRegion: (company.marketRegion || "CA-QC") as MarketRegionId,
        employeeId: employee?.id ?? null,
        enabledModules: company.enabledModules?.length
          ? company.enabledModules
          : ["construction-os", "crm"],
        zernioEnabled: isZernioEnabled(),
        isPlatformAdmin,
        homeCompanyId: enriched.homeCompanyId || user.companyId,
        viewingCompanyId: company.id,
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
    isPlatformAdmin: Boolean(enriched.isPlatformAdmin),
  });
}
