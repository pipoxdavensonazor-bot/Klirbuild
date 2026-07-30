import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/auth-service";
import type { DemoSession } from "@/lib/auth/demo-session";

export type PlatformAdminSession = DemoSession & {
  isPlatformAdmin: true;
};

/**
 * Guard API — admin Klirline Inc. uniquement (toutes entreprises).
 * Privileges are revalidated from DB inside requireSession/enrichSession.
 */
export async function requirePlatformAdmin(): Promise<
  PlatformAdminSession | NextResponse
> {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  if (!session.isPlatformAdmin) {
    return NextResponse.json(
      { error: "Accès réservé à l'administrateur plateforme KlirBuild." },
      { status: 403 }
    );
  }

  return { ...session, isPlatformAdmin: true };
}

export function isPlatformAdminResponse(
  value: PlatformAdminSession | NextResponse
): value is NextResponse {
  return value instanceof NextResponse;
}
