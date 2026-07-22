import { hasDatabase } from "@/lib/auth/auth-service";
import { DATABASE_REQUIRED_MESSAGE } from "@/lib/api/database-guard";
import { prisma } from "@/lib/db";
import { putUpload, uploadsEnabled, publicUploadUrl } from "@/lib/storage/blobs";

export type DocumentDto = {
  id: string;
  name: string;
  folder: string;
  type: string;
  sizeBytes: number;
  tags: string[];
  updatedAt: string;
  url?: string;
};

function appBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    process.env.URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}

function mapDoc(row: {
  id: string;
  name: string;
  type: string | null;
  sizeBytes: number;
  storageKey: string | null;
  tags: string[];
  updatedAt: Date;
  folder?: { name: string } | null;
}): DocumentDto {
  return {
    id: row.id,
    name: row.name,
    folder: row.folder?.name ?? "Général",
    type: row.type ?? "file",
    sizeBytes: row.sizeBytes,
    tags: row.tags,
    updatedAt: row.updatedAt.toISOString().slice(0, 10),
    url: row.storageKey ? publicUploadUrl(row.storageKey, appBaseUrl()) : undefined,
  };
}

export async function listDocuments(companyId: string): Promise<DocumentDto[]> {
  if (!hasDatabase()) return [];
  const rows = await prisma.document.findMany({
    where: { companyId, deletedAt: null },
    include: { folder: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(mapDoc);
}

export async function uploadDocument(
  companyId: string,
  input: { file: File; folderName?: string; tags?: string[] }
) {
  if (!hasDatabase()) return { error: DATABASE_REQUIRED_MESSAGE };
  if (!uploadsEnabled()) {
    return {
      error:
        "Stockage fichiers indisponible (Workers KV non configuré)." as const,
    };
  }

  const MAX_BYTES = 25 * 1024 * 1024;
  if (input.file.size > MAX_BYTES) {
    return { error: "Taille max 25 Mo." as const };
  }

  const safeName = input.file.name.replace(/[^\w.\-() ]+/g, "_").slice(0, 120);
  const ext = safeName.includes(".") ? safeName.split(".").pop() : "bin";
  const key = `documents/${companyId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const buffer = await input.file.arrayBuffer();
  await putUpload(key, buffer, input.file.type || "application/octet-stream");

  const folderName = input.folderName?.trim() || "Général";
  const existingFolder = await prisma.folder.findFirst({
    where: { companyId, name: folderName },
  });
  const folder =
    existingFolder ??
    (await prisma.folder.create({ data: { companyId, name: folderName } }));

  const row = await prisma.document.create({
    data: {
      companyId,
      folderId: folder.id,
      name: safeName,
      type: input.file.type || ext || "file",
      sizeBytes: input.file.size,
      storageKey: key,
      tags: input.tags ?? [],
    },
    include: { folder: { select: { name: true } } },
  });

  return { document: mapDoc(row) };
}

export async function upsertDocument(
  companyId: string,
  input: { id?: string; name: string; folderName?: string; type?: string; tags?: string[] }
) {
  const name = input.name.trim();
  if (!name) return { error: "Nom requis." as const };
  if (!hasDatabase()) return { error: DATABASE_REQUIRED_MESSAGE };

  const folderName = input.folderName?.trim() || "Général";
  const existingFolder = await prisma.folder.findFirst({
    where: { companyId, name: folderName },
  });
  const folder =
    existingFolder ??
    (await prisma.folder.create({ data: { companyId, name: folderName } }));

  if (input.id) {
    const row = await prisma.document.update({
      where: { id: input.id },
      data: {
        name,
        folderId: folder.id,
        type: input.type ?? undefined,
        tags: input.tags ?? undefined,
      },
      include: { folder: { select: { name: true } } },
    });
    return { document: mapDoc(row) };
  }

  const row = await prisma.document.create({
    data: {
      companyId,
      folderId: folder.id,
      name,
      type: input.type ?? "file",
      tags: input.tags ?? [],
    },
    include: { folder: { select: { name: true } } },
  });
  return { document: mapDoc(row) };
}

export async function getDocumentsStorageBytes(companyId: string) {
  if (!hasDatabase()) return 0;
  const agg = await prisma.document.aggregate({
    where: { companyId, deletedAt: null },
    _sum: { sizeBytes: true },
  });
  return agg._sum.sizeBytes ?? 0;
}
