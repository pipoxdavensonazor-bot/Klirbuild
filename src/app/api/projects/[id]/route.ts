import { NextResponse } from "next/server";
import { requireCompanyContext } from "@/lib/auth/require-company";
import { getProject, updateProject } from "@/lib/projects/project-service";
import { listTasks } from "@/lib/tasks/task-service";
import type { ProjectStatus } from "@/types";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

const STATUSES: ProjectStatus[] = ["planned", "active", "on_hold", "completed"];

export async function GET(_request: Request, ctx: Ctx) {
  const auth = await requireCompanyContext();
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const project = await getProject(auth.companyId, id);
  if (!project) {
    return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });
  }
  const tasks = await listTasks(auth.companyId, id);
  return NextResponse.json({ project, tasks });
}

export async function PATCH(request: Request, ctx: Ctx) {
  const auth = await requireCompanyContext();
  if (auth instanceof NextResponse) return auth;
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

  const result = await updateProject(auth.companyId, id, {
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
