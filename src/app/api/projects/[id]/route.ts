import { NextResponse } from "next/server";
import { enrichSession, getRequestSession } from "@/lib/auth/auth-service";
import { DEMO_COMPANY_ID } from "@/lib/billing/constants";
import { getProject, updateProject } from "@/lib/projects/project-service";
import { listTasks } from "@/lib/tasks/task-service";
import type { ProjectStatus } from "@/types";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

const STATUSES: ProjectStatus[] = ["planned", "active", "on_hold", "completed"];

async function companyId() {
  const session = await getRequestSession();
  if (!session) return DEMO_COMPANY_ID;
  return (await enrichSession(session)).companyId;
}

export async function GET(_request: Request, ctx: Ctx) {
  const cid = await companyId();
  const { id } = await ctx.params;
  const project = await getProject(cid, id);
  if (!project) {
    return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });
  }
  const tasks = await listTasks(cid, id);
  return NextResponse.json({ project, tasks });
}

export async function PATCH(request: Request, ctx: Ctx) {
  const session = await getRequestSession();
  const cid = session
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

  const result = await updateProject(cid, id, {
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
