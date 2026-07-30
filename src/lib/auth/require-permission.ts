import { NextResponse } from "next/server";
import {
  requireCompanyContext,
  type CompanyContext,
} from "@/lib/auth/require-company";
import { can, type Permission } from "@/types";

export function forbiddenResponse(message = "Permission refusée.") {
  return NextResponse.json({ error: message }, { status: 403 });
}

/** Session + companyId, or 401/403 if missing permission. */
export async function requirePermission(
  permission: Permission | Permission[]
): Promise<CompanyContext | NextResponse> {
  const ctx = await requireCompanyContext();
  if (ctx instanceof NextResponse) return ctx;

  const needed = Array.isArray(permission) ? permission : [permission];
  const allowed = needed.some((p) => can(ctx.session.role, p));
  if (!allowed) return forbiddenResponse();

  return ctx;
}

export function hasPermission(
  ctx: CompanyContext,
  permission: Permission | Permission[]
): boolean {
  const needed = Array.isArray(permission) ? permission : [permission];
  return needed.some((p) => can(ctx.session.role, p));
}
