import { NextResponse } from "next/server";
import { enrichSession, getRequestSession } from "@/lib/auth/auth-service";
import { DEMO_COMPANY_ID } from "@/lib/billing/constants";
import { updateProject } from "@/lib/projects/project-service";
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
      : undefined;
  const name = typeof body.name === "string" ? body.name : undefined;
  const clientId =
    typeof body.clientId === "string" ? body.clientId : body.clientId === null ? null : undefined;
  const budget =
    typeof body.budget === "number"
      ? body.budget
      : body.budget !== undefined
        ? Number(body.budget)
        : undefined;

  if (!status && !name?.trim() && clientId === undefined && budget === undefined) {
    return NextResponse.json({ error: "Aucune modification fournie." }, { status: 400 });
  }

  const result = await updateProject(companyId, id, {
    name,
    clientId,
    budget: budget !== undefined && !Number.isNaN(budget) ? budget : undefined,
    status,
  });
  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ project: result.project });
}
