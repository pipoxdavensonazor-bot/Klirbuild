import { hasDatabase } from "@/lib/auth/auth-service";
import { prisma } from "@/lib/db";
import { tasks as mockTasks } from "@/lib/mock-data";

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

const memory = new Map<string, TaskDto[]>();

export async function listTasks(companyId: string): Promise<TaskDto[]> {
  if (hasDatabase()) {
    try {
      const rows = await prisma.task.findMany({
        where: { project: { companyId } },
        include: { project: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 200,
      });
      if (rows.length > 0) {
        return rows.map((r) => ({
          id: r.id,
          title: r.title,
          projectId: r.projectId,
          projectName: r.project.name,
          status: r.status,
          priority: r.priority,
          assigneeName: r.assigneeName ?? undefined,
          dueDate: r.dueDate?.toISOString().slice(0, 10),
        }));
      }
      return [];
    } catch {
      return [];
    }
  }
  if (!memory.has(companyId)) {
    memory.set(
      companyId,
      mockTasks.map((t) => ({
        id: t.id,
        title: t.title,
        projectId: t.projectId ?? "prj_1",
        projectName: t.projectName,
        status: t.status,
        priority: t.priority,
        assigneeName: t.assignee,
        dueDate: t.dueDate,
      }))
    );
  }
  return memory.get(companyId) ?? [];
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

  if (hasDatabase()) {
    try {
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
        return {
          task: {
            id: row.id,
            title: row.title,
            projectId: row.projectId,
            projectName: row.project.name,
            status: row.status,
            priority: row.priority,
            assigneeName: row.assigneeName ?? undefined,
            dueDate: row.dueDate?.toISOString().slice(0, 10),
          },
        };
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
      return {
        task: {
          id: row.id,
          title: row.title,
          projectId: row.projectId,
          projectName: row.project.name,
          status: row.status,
          priority: row.priority,
          assigneeName: row.assigneeName ?? undefined,
          dueDate: row.dueDate?.toISOString().slice(0, 10),
        },
      };
    } catch {
      /* fall through */
    }
  }

  const list = await listTasks(companyId);
  if (input.id) {
    const idx = list.findIndex((t) => t.id === input.id);
    if (idx < 0) return { error: "Tâche introuvable." as const };
    list[idx] = { ...list[idx], ...input, title };
    memory.set(companyId, list);
    return { task: list[idx] };
  }

  const task: TaskDto = {
    id: `task_${Date.now()}`,
    title,
    projectId: input.projectId ?? "prj_1",
    projectName: input.projectName ?? "Projet",
    status: input.status ?? "todo",
    priority: input.priority ?? "medium",
    assigneeName: input.assigneeName,
    dueDate: input.dueDate,
  };
  list.unshift(task);
  memory.set(companyId, list);
  return { task };
}

export async function deleteTask(companyId: string, id: string) {
  if (hasDatabase()) {
    try {
      const existing = await prisma.task.findFirst({
        where: { id, project: { companyId } },
      });
      if (!existing) return { error: "Tâche introuvable." as const };
      await prisma.task.delete({ where: { id } });
      return { ok: true as const };
    } catch {
      /* fall through */
    }
  }
  const list = await listTasks(companyId);
  const next = list.filter((t) => t.id !== id);
  if (next.length === list.length) return { error: "Tâche introuvable." as const };
  memory.set(companyId, next);
  return { ok: true as const };
}
