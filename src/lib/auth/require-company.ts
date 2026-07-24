import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/auth-service";
import type { DemoSession } from "@/lib/auth/demo-session";

export type CompanyContext = {
  session: DemoSession;
  companyId: string;
};

/** Session + companyId, or a 401 response. Use on every private /api route. */
export async function requireCompanyContext(): Promise<
  CompanyContext | NextResponse
> {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  return { session, companyId: session.companyId };
}

export function isUnauthorized(
  value: CompanyContext | NextResponse
): value is NextResponse {
  return value instanceof NextResponse;
}
