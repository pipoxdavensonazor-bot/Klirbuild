import { NextResponse } from "next/server";
import {
  isPlatformAdminResponse,
  requirePlatformAdmin,
} from "@/lib/admin/require-platform-admin";
import { sessionResponse } from "@/lib/auth/auth-service";
import { PLATFORM_COMPANY_ID } from "@/lib/billing/constants";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

/** Entre dans le contexte d'une entreprise (session companyId remplacé). */
export async function POST(request: Request) {
  const gate = await requirePlatformAdmin();
  if (isPlatformAdminResponse(gate)) return gate;

  const body = await request.json().catch(() => ({}));
  const companyId =
    typeof body.companyId === "string" ? body.companyId.trim() : "";
  const reset = body.reset === true;

  if (reset) {
    const home = gate.homeCompanyId || PLATFORM_COMPANY_ID;
    return sessionResponse({
      email: gate.email,
      companyId: home,
      role: gate.role,
      isPlatformAdmin: true,
      homeCompanyId: home,
    });
  }

  if (!companyId) {
    return NextResponse.json({ error: "companyId requis" }, { status: 400 });
  }

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) {
    return NextResponse.json({ error: "Entreprise introuvable" }, { status: 404 });
  }

  const home = gate.homeCompanyId || gate.companyId;
  return sessionResponse({
    email: gate.email,
    companyId: company.id,
    role: gate.role,
    isPlatformAdmin: true,
    homeCompanyId: home,
  });
}
