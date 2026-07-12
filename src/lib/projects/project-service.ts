import type { Project, ProjectStatus } from "@/types";
import { hasDatabase } from "@/lib/auth/auth-service";
import { DATABASE_REQUIRED_MESSAGE } from "@/lib/api/database-guard";
import { prisma } from "@/lib/db";

function dec(v: { toNumber(): number } | number) {
  return typeof v === "number" ? v : v.toNumber();
}

function mapDbProject(row: {
  id: string;
  clientId: string | null;
  name: string;
  status: string;
  progress: number;
  budget: { toNumber(): number } | number;
  dueDate: Date | null;
  client?: { name: string } | null;
}): Project {
  return {
    id: row.id,
    name: row.name,
    clientId: row.clientId ?? undefined,
    clientName: row.client?.name ?? "—",
    status: row.status as ProjectStatus,
    progress: row.progress,
    members: [],
    dueDate: row.dueDate?.toISOString().slice(0, 10) ?? "",
    budget: dec(row.budget),
  };
}

export async function getProject(companyId: string, id: string): Promise<Project | null> {
  if (!hasDatabase()) return null;
  const row = await prisma.project.findFirst({
    where: { id, companyId },
    include: { client: { select: { name: true } } },
  });
  return row ? mapDbProject(row) : null;
}

export async function listProjects(companyId: string, clientId?: string): Promise<Project[]> {
  if (!hasDatabase()) return [];
  const rows = await prisma.project.findMany({
    where: { companyId, ...(clientId ? { clientId } : {}) },
    include: { client: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(mapDbProject);
}

export async function createProject(input: {
  companyId: string;
  clientId?: string;
  name: string;
  budget?: number;
  status?: ProjectStatus;
}) {
  const name = input.name.trim();
  if (!name) return { error: "Nom du projet requis." as const };
  if (!hasDatabase()) return { error: DATABASE_REQUIRED_MESSAGE };

  const status = input.status ?? "planned";
  const budget = input.budget ?? 0;
  const due = new Date();
  due.setMonth(due.getMonth() + 3);

  const row = await prisma.project.create({
    data: {
      companyId: input.companyId,
      clientId: input.clientId || null,
      name,
      status,
      progress: status === "completed" ? 100 : status === "active" ? 25 : 0,
      budget,
      dueDate: due,
    },
    include: { client: { select: { name: true } } },
  });
  return { project: mapDbProject(row) };
}

export async function updateProjectStatus(
  companyId: string,
  id: string,
  status: ProjectStatus
) {
  return updateProject(companyId, id, { status });
}

export async function updateProject(
  companyId: string,
  id: string,
  input: {
    name?: string;
    clientId?: string | null;
    budget?: number;
    status?: ProjectStatus;
  }
) {
  if (!hasDatabase()) return { error: DATABASE_REQUIRED_MESSAGE };

  const status = input.status;
  const progress =
    status === "completed"
      ? 100
      : status === "active"
        ? 50
        : status === "on_hold"
          ? 25
          : undefined;

  const existing = await prisma.project.findFirst({ where: { id, companyId } });
  if (!existing) return { error: "Projet introuvable." as const };

  const row = await prisma.project.update({
    where: { id },
    data: {
      ...(input.name?.trim() ? { name: input.name.trim() } : {}),
      ...(input.clientId !== undefined ? { clientId: input.clientId || null } : {}),
      ...(input.budget !== undefined ? { budget: input.budget } : {}),
      ...(status ? { status, progress: progress ?? existing.progress } : {}),
    },
    include: { client: { select: { name: true } } },
  });
  return { project: mapDbProject(row) };
}
