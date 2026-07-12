import type { Project, ProjectStatus } from "@/types";
import { clients as mockClients, projects as mockProjects } from "@/lib/mock-data";
import { hasDatabase } from "@/lib/auth/auth-service";
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

function mergeProjects(api: Project[]): Project[] {
  if (hasDatabase()) return api;
  const seen = new Set<string>();
  const out: Project[] = [];
  for (const p of [...api, ...mockProjects]) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    out.push(p);
  }
  return out;
}

export async function getProject(companyId: string, id: string): Promise<Project | null> {
  if (hasDatabase()) {
    const row = await prisma.project.findFirst({
      where: { id, companyId },
      include: { client: { select: { name: true } } },
    });
    return row ? mapDbProject(row) : null;
  }
  const all = await listProjects(companyId);
  return all.find((p) => p.id === id) ?? null;
}

export async function listProjects(companyId: string, clientId?: string): Promise<Project[]> {
  if (hasDatabase()) {
    const rows = await prisma.project.findMany({
      where: { companyId, ...(clientId ? { clientId } : {}) },
      include: { client: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapDbProject);
  }

  const mock = (() => {
    if (!clientId) return mockProjects;
    const client = mockClients.find((c) => c.id === clientId);
    if (!client) return [];
    return mockProjects.filter(
      (p) => p.clientId === clientId || p.clientName === client.name
    );
  })();
  return mergeProjects(mock);
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

  const status = input.status ?? "planned";
  const budget = input.budget ?? 0;
  const due = new Date();
  due.setMonth(due.getMonth() + 3);

  if (hasDatabase()) {
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

  const { clients } = await import("@/lib/mock-data");
  const mockClient = input.clientId
    ? clients.find((c) => c.id === input.clientId)
    : undefined;

  const project: Project = {
    id: `prj_${Date.now()}`,
    name,
    clientId: input.clientId,
    clientName: mockClient?.name ?? "—",
    status,
    progress: status === "completed" ? 100 : status === "active" ? 25 : 0,
    members: [],
    dueDate: due.toISOString().slice(0, 10),
    budget,
  };
  return { project };
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
  const status = input.status;
  const progress =
    status === "completed"
      ? 100
      : status === "active"
        ? 50
        : status === "on_hold"
          ? 25
          : undefined;

  if (hasDatabase()) {
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

  const all = await listProjects(companyId);
  const project = all.find((p) => p.id === id);
  if (!project) return { error: "Projet introuvable." as const };

  const { clients } = await import("@/lib/mock-data");
  const mockClient = input.clientId
    ? clients.find((c) => c.id === input.clientId)
    : undefined;

  const next: Project = {
    ...project,
    ...(input.name?.trim() ? { name: input.name.trim() } : {}),
    ...(input.clientId !== undefined
      ? { clientId: input.clientId ?? undefined, clientName: mockClient?.name ?? "—" }
      : {}),
    ...(input.budget !== undefined ? { budget: input.budget } : {}),
    ...(status ? { status, progress: progress ?? project.progress } : {}),
  };
  return { project: next };
}
