import { hasDatabase } from "@/lib/auth/auth-service";
import { prisma } from "@/lib/db";
import type { Role } from "@/types";
import { isAdminDeleter } from "@/lib/admin/delete-governance-service";
import { getBackupsBucket } from "@/lib/storage/r2";

export async function createCompanyBackup(input: {
  companyId: string;
  trigger: "auto" | "manual";
  createdByEmail?: string;
  role?: Role;
}) {
  if (!hasDatabase()) return { error: "DATABASE_URL requis." as const };
  if (
    input.trigger === "manual" &&
    input.role &&
    !isAdminDeleter(input.role)
  ) {
    return { error: "Seul un administrateur peut lancer une sauvegarde." as const };
  }

  const [
    company,
    clients,
    projects,
    invoices,
    quotes,
    employees,
    documents,
    meetings,
    feedPosts,
  ] = await Promise.all([
    prisma.company.findUnique({ where: { id: input.companyId } }),
    prisma.client.findMany({ where: { companyId: input.companyId, deletedAt: null }, take: 5000 }),
    prisma.project.findMany({ where: { companyId: input.companyId }, take: 2000 }),
    prisma.invoice.findMany({ where: { companyId: input.companyId }, take: 5000 }),
    prisma.quote.findMany({ where: { companyId: input.companyId }, take: 5000 }),
    prisma.employeeProfile.findMany({ where: { companyId: input.companyId }, take: 2000 }),
    prisma.document.findMany({
      where: { companyId: input.companyId, deletedAt: null },
      take: 5000,
    }),
    prisma.meeting.findMany({ where: { companyId: input.companyId }, take: 500 }),
    prisma.feedPost.findMany({ where: { companyId: input.companyId }, take: 500 }),
  ]);

  if (!company) return { error: "Entreprise introuvable." as const };

  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    trigger: input.trigger,
    company: {
      id: company.id,
      name: company.name,
      email: company.email,
      inboxEmail: company.inboxEmail,
    },
    counts: {
      clients: clients.length,
      projects: projects.length,
      invoices: invoices.length,
      quotes: quotes.length,
      employees: employees.length,
      documents: documents.length,
      meetings: meetings.length,
      feedPosts: feedPosts.length,
    },
    clients,
    projects,
    invoices,
    quotes,
    employees: employees.map((e) => ({
      ...e,
      sinNumber: undefined,
      sinMasked: e.sinMasked,
    })),
    documents,
    meetings,
    feedPosts,
  };

  const json = JSON.stringify(payload);
  const sizeBytes = Buffer.byteLength(json, "utf8");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const storageKey = `${input.companyId}/${stamp}.json`;
  const label = `Backup ${stamp.slice(0, 16)} (${input.trigger})`;

  try {
    const bucket = await getBackupsBucket();
    if (bucket) {
      await bucket.put(storageKey, json, {
        httpMetadata: { contentType: "application/json" },
        customMetadata: {
          companyId: input.companyId,
          trigger: input.trigger,
        },
      });
    } else {
      console.warn("[backup] BACKUPS_BUCKET R2 binding unavailable — metadata only");
    }
  } catch (e) {
    console.warn("[backup] R2 unavailable, storing metadata only", e);
  }

  const row = await prisma.companyBackup.create({
    data: {
      companyId: input.companyId,
      label,
      storageKey,
      sizeBytes,
      status: "ready",
      trigger: input.trigger,
      createdByEmail: input.createdByEmail,
    },
  });

  return {
    backup: mapBackup(row),
    downloadJson: json,
  };
}

export async function listCompanyBackups(companyId: string) {
  if (!hasDatabase()) return [];
  const rows = await prisma.companyBackup.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return rows.map(mapBackup);
}

export async function getBackupDownload(input: {
  companyId: string;
  backupId: string;
  role: Role;
}) {
  if (!isAdminDeleter(input.role)) {
    return { error: "Accès admin requis." as const };
  }
  if (!hasDatabase()) return { error: "DATABASE_URL requis." as const };

  const row = await prisma.companyBackup.findFirst({
    where: { id: input.backupId, companyId: input.companyId },
  });
  if (!row?.storageKey) return { error: "Sauvegarde introuvable." as const };

  try {
    const bucket = await getBackupsBucket();
    if (!bucket) return { error: "Stockage R2 indisponible." as const };
    const obj = await bucket.get(row.storageKey);
    if (!obj) return { error: "Fichier backup absent du stockage." as const };
    const data = await obj.text();
    return {
      filename: `${row.label.replace(/[^\w.-]+/g, "_")}.json`,
      body: data,
      contentType: "application/json",
    };
  } catch {
    return { error: "Stockage R2 indisponible." as const };
  }
}

export async function runAutoBackupsForAllCompanies() {
  if (!hasDatabase()) return { ok: false, count: 0 };
  const companies = await prisma.company.findMany({
    select: { id: true },
    take: 200,
  });
  let count = 0;
  for (const c of companies) {
    const recent = await prisma.companyBackup.findFirst({
      where: {
        companyId: c.id,
        trigger: "auto",
        createdAt: { gte: new Date(Date.now() - 20 * 60 * 60 * 1000) },
      },
    });
    if (recent) continue;
    const res = await createCompanyBackup({
      companyId: c.id,
      trigger: "auto",
    });
    if (!("error" in res)) count += 1;
  }
  return { ok: true, count };
}

function mapBackup(row: {
  id: string;
  companyId: string;
  label: string;
  storageKey: string | null;
  sizeBytes: number;
  status: string;
  trigger: string;
  createdByEmail: string | null;
  createdAt: Date;
}) {
  return {
    id: row.id,
    companyId: row.companyId,
    label: row.label,
    storageKey: row.storageKey ?? undefined,
    sizeBytes: row.sizeBytes,
    status: row.status,
    trigger: row.trigger,
    createdByEmail: row.createdByEmail ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}
