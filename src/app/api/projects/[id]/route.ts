import { NextResponse } from "next/server";
import { enrichSession, getRequestSession } from "@/lib/auth/auth-service";
import { DEMO_COMPANY_ID } from "@/lib/billing/constants";
import { updateProjectStatus } from "@/lib/projects/project-service";
import type { ProjectStatus } from "@/types";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

const STATUSES: ProjectStatus[] = ["planned", "active", "on_hold", "completed"];

export async function PATCH(request: Request, ctx: Ctx) {
  const session = await getRequestSession();
  const companyId = session
    ? (await enrichSession(session)).companyId
    : DEMO_COMPANY_ID;
  const { id } = await ctx.params;
  const body = await request.json().catch(() => ({}));
  const status =
    typeof body.status === "string" && STATUSES.includes(body.status as ProjectStatus)
      ? (body.status as ProjectStatus)
      : null;

  if (!status) {
    return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
  }

  const result = await updateProjectStatus(companyId, id, status);
  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ project: result.project });
}
