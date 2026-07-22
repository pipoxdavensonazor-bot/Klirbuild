import { NextResponse } from "next/server";
import {
  enrichSession,
  getRequestSession,
  hasDatabase,
} from "@/lib/auth/auth-service";
import type { DemoSession } from "@/lib/auth/demo-session";
import { prisma } from "@/lib/db";

export type PlatformAdminSession = DemoSession & {
  isPlatformAdmin: true;
};

/**
 * Guard API — admin Klirline Inc. uniquement (toutes entreprises).
 */
export async function requirePlatformAdmin(): Promise<
  PlatformAdminSession | NextResponse
> {
  const session = await getRequestSession();
  if (!session) {
    return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  }

  const enriched = await enrichSession(session);

  if (enriched.isPlatformAdmin) {
    return { ...enriched, isPlatformAdmin: true };
  }

  if (hasDatabase()) {
    const user = await prisma.user.findUnique({
      where: { email: enriched.email },
      select: { isPlatformAdmin: true, role: true },
    });
    if (user?.isPlatformAdmin || user?.role === "SUPER_ADMIN") {
      return { ...enriched, isPlatformAdmin: true };
    }
  }

  return NextResponse.json(
    { error: "Accès réservé à l'administrateur plateforme KlirBuild." },
    { status: 403 }
  );
}

export function isPlatformAdminResponse(
  value: PlatformAdminSession | NextResponse
): value is NextResponse {
  return value instanceof NextResponse;
}
