import { hasDatabase } from "@/lib/auth/auth-service";
import { DATABASE_REQUIRED_MESSAGE } from "@/lib/api/database-guard";
import { assertJobSiteQuota } from "@/lib/billing/require-plan-server";
import { prisma } from "@/lib/db";

export type JobSiteDto = {
  id: string;
  name: string;
  address?: string;
  clientName?: string;
  lat: number;
  lng: number;
  radiusM: number;
};

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
  if (!hasDatabase()) return [];
  const rows = await prisma.jobSite.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
  });
  return rows.map(mapRow);
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
  if (!hasDatabase()) return { error: DATABASE_REQUIRED_MESSAGE };

  const quota = await assertJobSiteQuota(companyId);
  if (!quota.ok) return { error: quota.error };

  const row = await prisma.jobSite.create({
    data: {
      companyId,
      name,
      address: input.address?.trim() || null,
      clientName: input.clientName?.trim() || null,
      lat: input.lat ?? 45.5017,
      lng: input.lng ?? -73.5673,
      radiusM: input.radiusM ?? 150,
    },
  });
  return { jobSite: mapRow(row) };
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
  if (!hasDatabase()) return { error: DATABASE_REQUIRED_MESSAGE };

  const existing = await prisma.jobSite.findFirst({ where: { id, companyId } });
  if (!existing) return { error: "Chantier introuvable." as const };

  const row = await prisma.jobSite.update({
    where: { id },
    data: {
      ...(input.name?.trim() ? { name: input.name.trim() } : {}),
      ...(input.address !== undefined ? { address: input.address || null } : {}),
      ...(input.clientName !== undefined ? { clientName: input.clientName || null } : {}),
      ...(input.lat !== undefined ? { lat: input.lat } : {}),
      ...(input.lng !== undefined ? { lng: input.lng } : {}),
      ...(input.radiusM !== undefined ? { radiusM: input.radiusM } : {}),
    },
  });
  return { jobSite: mapRow(row) };
}

export async function deleteJobSite(companyId: string, id: string) {
  if (!hasDatabase()) return { error: DATABASE_REQUIRED_MESSAGE };

  const existing = await prisma.jobSite.findFirst({ where: { id, companyId } });
  if (!existing) return { error: "Chantier introuvable." as const };

  await prisma.jobSite.delete({ where: { id } });
  return { ok: true as const };
}
