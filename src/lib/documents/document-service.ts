import { hasDatabase } from "@/lib/auth/auth-service";
import { prisma } from "@/lib/db";
import { documents as mockDocuments } from "@/lib/mock-data";

export type DocumentDto = {
  id: string;
  name: string;
  folder: string;
  type: string;
  sizeBytes: number;
  tags: string[];
  updatedAt: string;
};

function mapDoc(row: {
  id: string;
  name: string;
  type: string | null;
  sizeBytes: number;
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
  };
}

export async function listDocuments(companyId: string): Promise<DocumentDto[]> {
  if (hasDatabase()) {
    const rows = await prisma.document.findMany({
      where: { companyId, deletedAt: null },
      include: { folder: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
    });
    return rows.map(mapDoc);
  }
  return mockDocuments.map((d) => ({
    id: d.id,
    name: d.name,
    folder: d.folder,
    type: d.type,
    sizeBytes: 0,
    tags: d.tags,
    updatedAt: d.updatedAt,
  }));
}

export async function upsertDocument(
  companyId: string,
  input: { id?: string; name: string; folderName?: string; type?: string; tags?: string[] }
) {
  const name = input.name.trim();
  if (!name) return { error: "Nom requis." as const };
  if (!hasDatabase()) return { document: { id: `doc_${Date.now()}`, name } };

  let folderId: string | null = null;
  const folderName = input.folderName?.trim() || "Général";
  const existingFolder = await prisma.folder.findFirst({
    where: { companyId, name: folderName },
  });
  const folder =
    existingFolder ??
    (await prisma.folder.create({ data: { companyId, name: folderName } }));
  folderId = folder.id;

  if (input.id) {
    const row = await prisma.document.update({
      where: { id: input.id },
      data: {
        name,
        folderId,
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
      folderId,
      name,
      type: input.type ?? "file",
      tags: input.tags ?? [],
    },
    include: { folder: { select: { name: true } } },
  });
  return { document: mapDoc(row) };
}
