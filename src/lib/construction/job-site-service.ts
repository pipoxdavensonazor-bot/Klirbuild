import { hasDatabase } from "@/lib/auth/auth-service";
import { prisma } from "@/lib/db";
import { jobSites as mockSites } from "@/lib/workforce/mock-data";

export type JobSiteDto = {
  id: string;
  name: string;
  address?: string;
  clientName?: string;
  lat: number;
  lng: number;
  radiusM: number;
};

const memory = new Map<string, JobSiteDto[]>();

function mapRow(row: {
  id: string;
  name: string;
  address: string | null;
  clientName: string | null;
  lat: number;
  lng: number;
  radiusM: number;
}): JobSiteDto {
  return {
    id: row.id,
    name: row.name,
    address: row.address ?? undefined,
    clientName: row.clientName ?? undefined,
    lat: row.lat,
    lng: row.lng,
    radiusM: row.radiusM,
  };
}

export async function listJobSitesAdmin(companyId: string): Promise<JobSiteDto[]> {
  if (hasDatabase()) {
    try {
      const rows = await prisma.jobSite.findMany({
        where: { companyId },
        orderBy: { name: "asc" },
      });
      if (rows.length > 0) return rows.map(mapRow);
    } catch {
      /* fall through */
    }
  }
  if (!memory.has(companyId)) {
    memory.set(
      companyId,
      mockSites.map((s) => ({
        id: s.id,
        name: s.name,
        address: s.address,
        clientName: undefined,
        lat: s.lat,
        lng: s.lng,
        radiusM: s.radiusM,
      }))
    );
  }
  return memory.get(companyId) ?? [];
}

export async function createJobSite(
  companyId: string,
  input: {
    name: string;
    address?: string;
    clientName?: string;
    lat?: number;
    lng?: number;
    radiusM?: number;
  }
) {
  const name = input.name.trim();
  if (!name) return { error: "Nom du chantier requis." as const };

  const payload = {
    name,
    address: input.address?.trim() || null,
    clientName: input.clientName?.trim() || null,
    lat: input.lat ?? 45.5017,
    lng: input.lng ?? -73.5673,
    radiusM: input.radiusM ?? 150,
  };

  if (hasDatabase()) {
    try {
      const row = await prisma.jobSite.create({
        data: { companyId, ...payload },
      });
      return { jobSite: mapRow(row) };
    } catch {
      /* fall through */
    }
  }

  const site: JobSiteDto = {
    id: `site_${Date.now()}`,
    name: payload.name,
    address: payload.address ?? undefined,
    clientName: payload.clientName ?? undefined,
    lat: payload.lat,
    lng: payload.lng,
    radiusM: payload.radiusM,
  };
  const list = await listJobSitesAdmin(companyId);
  list.unshift(site);
  memory.set(companyId, list);
  return { jobSite: site };
}

export async function updateJobSite(
  companyId: string,
  id: string,
  input: Partial<{
    name: string;
    address: string;
    clientName: string;
    lat: number;
    lng: number;
    radiusM: number;
  }>
) {
  if (hasDatabase()) {
    try {
      const existing = await prisma.jobSite.findFirst({ where: { id, companyId } });
      if (!existing) return { error: "Chantier introuvable." as const };
      const row = await prisma.jobSite.update({
        where: { id },
        data: {
          ...(input.name?.trim() ? { name: input.name.trim() } : {}),
          ...(input.address !== undefined ? { address: input.address || null } : {}),
          ...(input.clientName !== undefined
            ? { clientName: input.clientName || null }
            : {}),
          ...(input.lat !== undefined ? { lat: input.lat } : {}),
          ...(input.lng !== undefined ? { lng: input.lng } : {}),
          ...(input.radiusM !== undefined ? { radiusM: input.radiusM } : {}),
        },
      });
      return { jobSite: mapRow(row) };
    } catch {
      /* fall through */
    }
  }

  const list = await listJobSitesAdmin(companyId);
  const idx = list.findIndex((s) => s.id === id);
  if (idx < 0) return { error: "Chantier introuvable." as const };
  list[idx] = {
    ...list[idx],
    ...(input.name?.trim() ? { name: input.name.trim() } : {}),
    ...(input.address !== undefined ? { address: input.address || undefined } : {}),
    ...(input.clientName !== undefined
      ? { clientName: input.clientName || undefined }
      : {}),
    ...(input.lat !== undefined ? { lat: input.lat } : {}),
    ...(input.lng !== undefined ? { lng: input.lng } : {}),
    ...(input.radiusM !== undefined ? { radiusM: input.radiusM } : {}),
  };
  memory.set(companyId, list);
  return { jobSite: list[idx] };
}

export async function deleteJobSite(companyId: string, id: string) {
  if (hasDatabase()) {
    try {
      const existing = await prisma.jobSite.findFirst({ where: { id, companyId } });
      if (!existing) return { error: "Chantier introuvable." as const };
      await prisma.jobSite.delete({ where: { id } });
      return { ok: true as const };
    } catch {
      /* fall through */
    }
  }

  const list = await listJobSitesAdmin(companyId);
  const next = list.filter((s) => s.id !== id);
  if (next.length === list.length) return { error: "Chantier introuvable." as const };
  memory.set(companyId, next);
  return { ok: true as const };
}
