import { hasDatabase } from "@/lib/auth/auth-service";
import { DATABASE_REQUIRED_MESSAGE } from "@/lib/api/database-guard";
import { prisma } from "@/lib/db";

export type TaskDto = {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  status: string;
  priority: string;
  assigneeName?: string;
  dueDate?: string;
};

function mapTask(row: {
  id: string;
  title: string;
  projectId: string;
  status: string;
  priority: string;
  assigneeName: string | null;
  dueDate: Date | null;
  project: { name: string };
}): TaskDto {
  return {
    id: row.id,
    title: row.title,
    projectId: row.projectId,
    projectName: row.project.name,
    status: row.status,
    priority: row.priority,
    assigneeName: row.assigneeName ?? undefined,
    dueDate: row.dueDate?.toISOString().slice(0, 10),
  };
}

export async function listTasks(companyId: string, projectId?: string): Promise<TaskDto[]> {
  if (!hasDatabase()) return [];
  const rows = await prisma.task.findMany({
    where: {
      project: { companyId },
      ...(projectId ? { projectId } : {}),
    },
    include: { project: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return rows.map(mapTask);
}

export async function upsertTask(
  companyId: string,
  input: {
    id?: string;
    title: string;
    projectId?: string;
    projectName?: string;
    status?: string;
    priority?: string;
    assigneeName?: string;
    dueDate?: string;
  }
) {
  const title = input.title.trim();
  if (!title) return { error: "Titre requis." as const };
  if (!hasDatabase()) return { error: DATABASE_REQUIRED_MESSAGE as const };

  let projectId = input.projectId;
  if (!projectId) {
    const project = await prisma.project.findFirst({
      where: { companyId },
      orderBy: { createdAt: "desc" },
    });
    if (!project) return { error: "Créez d'abord un projet." as const };
    projectId = project.id;
  }

  if (input.id) {
    const existing = await prisma.task.findFirst({
      where: { id: input.id, project: { companyId } },
    });
    if (!existing) return { error: "Tâche introuvable." as const };
    const row = await prisma.task.update({
      where: { id: input.id },
      data: {
        title,
        ...(input.status ? { status: input.status } : {}),
        ...(input.priority ? { priority: input.priority } : {}),
        ...(input.assigneeName !== undefined
          ? { assigneeName: input.assigneeName || null }
          : {}),
        ...(input.dueDate ? { dueDate: new Date(input.dueDate) } : {}),
      },
      include: { project: { select: { name: true } } },
    });
    return { task: mapTask(row) };
  }

  const row = await prisma.task.create({
    data: {
      projectId,
      title,
      status: input.status ?? "todo",
      priority: input.priority ?? "medium",
      assigneeName: input.assigneeName ?? null,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
    },
    include: { project: { select: { name: true } } },
  });
  return { task: mapTask(row) };
}

export async function deleteTask(companyId: string, id: string) {
  if (!hasDatabase()) return { error: DATABASE_REQUIRED_MESSAGE as const };
  const existing = await prisma.task.findFirst({
    where: { id, project: { companyId } },
  });
  if (!existing) return { error: "Tâche introuvable." as const };
  await prisma.task.delete({ where: { id } });
  return { ok: true as const };
}
