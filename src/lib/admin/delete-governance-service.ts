import { hasDatabase } from "@/lib/auth/auth-service";
import { prisma } from "@/lib/db";
import type { Role } from "@/types";
import { canApp } from "@/lib/workforce/types";

export const SENSITIVE_RESOURCE_TYPES = [
  "document",
  "client",
  "invoice",
  "employee",
  "payslip",
] as const;

export type SensitiveResourceType = (typeof SENSITIVE_RESOURCE_TYPES)[number];

export function isAdminDeleter(role: Role) {
  return (
    role === "SUPER_ADMIN" ||
    role === "COMPANY_ADMIN" ||
    canApp(role, "users:manage")
  );
}

export async function requestSensitiveDelete(input: {
  companyId: string;
  role: Role;
  email: string;
  name?: string;
  resourceType: string;
  resourceId: string;
  resourceLabel?: string;
  reason?: string;
}) {
  if (!hasDatabase()) return { error: "DATABASE_URL requis." as const };
  if (!SENSITIVE_RESOURCE_TYPES.includes(input.resourceType as SensitiveResourceType)) {
    return { error: "Type de ressource non sensible / non géré." as const };
  }

  if (isAdminDeleter(input.role)) {
    const applied = await applySensitiveDelete(
      input.companyId,
      input.resourceType,
      input.resourceId,
      input.email
    );
    if ("error" in applied && applied.error) return applied;
    return { ok: true as const, deleted: true as const };
  }

  const pending = await prisma.deleteRequest.findFirst({
    where: {
      companyId: input.companyId,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      status: "pending",
    },
  });
  if (pending) {
    return { error: "Une demande est déjà en attente pour cet élément." as const };
  }

  const row = await prisma.deleteRequest.create({
    data: {
      companyId: input.companyId,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      resourceLabel: input.resourceLabel,
      reason: input.reason?.trim() || null,
      status: "pending",
      requestedByEmail: input.email,
      requestedByName: input.name,
    },
  });

  const { createNotification } = await import(
    "@/lib/notifications/notification-service"
  );
  await createNotification({
    companyId: input.companyId,
    title: "Demande de suppression",
    body: `${input.email} demande de supprimer ${input.resourceLabel || input.resourceType}`,
    href: "/admin/governance",
  });

  return { ok: true as const, deleted: false as const, request: mapDeleteRequest(row) };
}

export async function listDeleteRequests(companyId: string, status?: string) {
  if (!hasDatabase()) return [];
  const rows = await prisma.deleteRequest.findMany({
    where: {
      companyId,
      ...(status ? { status } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return rows.map(mapDeleteRequest);
}

export async function reviewDeleteRequest(input: {
  companyId: string;
  requestId: string;
  role: Role;
  reviewerEmail: string;
  decision: "approve" | "reject";
  note?: string;
}) {
  if (!hasDatabase()) return { error: "DATABASE_URL requis." as const };
  if (!isAdminDeleter(input.role)) {
    return { error: "Seul un administrateur peut trancher." as const };
  }

  const req = await prisma.deleteRequest.findFirst({
    where: { id: input.requestId, companyId: input.companyId },
  });
  if (!req) return { error: "Demande introuvable." as const };
  if (req.status !== "pending") return { error: "Demande déjà traitée." as const };

  if (input.decision === "reject") {
    const row = await prisma.deleteRequest.update({
      where: { id: req.id },
      data: {
        status: "rejected",
        reviewedByEmail: input.reviewerEmail,
        reviewedAt: new Date(),
        reviewNote: input.note?.trim() || null,
      },
    });
    return { ok: true as const, request: mapDeleteRequest(row) };
  }

  const applied = await applySensitiveDelete(
    input.companyId,
    req.resourceType,
    req.resourceId,
    input.reviewerEmail
  );
  if ("error" in applied && applied.error) return applied;

  const row = await prisma.deleteRequest.update({
    where: { id: req.id },
    data: {
      status: "approved",
      reviewedByEmail: input.reviewerEmail,
      reviewedAt: new Date(),
      reviewNote: input.note?.trim() || null,
    },
  });
  return { ok: true as const, request: mapDeleteRequest(row), deleted: true as const };
}

async function applySensitiveDelete(
  companyId: string,
  resourceType: string,
  resourceId: string,
  actorEmail: string
) {
  if (resourceType === "document") {
    const updated = await prisma.document.updateMany({
      where: { id: resourceId, companyId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    if (!updated.count) return { error: "Document introuvable." as const };
  } else if (resourceType === "client") {
    const updated = await prisma.client.updateMany({
      where: { id: resourceId, companyId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    if (!updated.count) return { error: "Client introuvable." as const };
  } else if (resourceType === "invoice") {
    const updated = await prisma.invoice.updateMany({
      where: { id: resourceId, companyId },
      data: { status: "cancelled" },
    });
    if (!updated.count) return { error: "Facture introuvable." as const };
  } else if (resourceType === "employee") {
    const updated = await prisma.employeeProfile.updateMany({
      where: { id: resourceId, companyId },
      data: { status: "terminated" },
    });
    if (!updated.count) return { error: "Employé introuvable." as const };
  } else if (resourceType === "payslip") {
    return {
      error: "Les fiches de paie ne se suppriment pas — archivez via la paie." as const,
    };
  } else {
    return { error: "Type non supporté." as const };
  }

  await prisma.auditLog.create({
    data: {
      companyId,
      actorId: actorEmail,
      action: `${resourceType}.sensitive_delete`,
      meta: { resourceId },
    },
  });
  return { ok: true as const };
}

function mapDeleteRequest(row: {
  id: string;
  companyId: string;
  resourceType: string;
  resourceId: string;
  resourceLabel: string | null;
  reason: string | null;
  status: string;
  requestedByEmail: string;
  requestedByName: string | null;
  reviewedByEmail: string | null;
  reviewedAt: Date | null;
  reviewNote: string | null;
  createdAt: Date;
}) {
  return {
    id: row.id,
    companyId: row.companyId,
    resourceType: row.resourceType,
    resourceId: row.resourceId,
    resourceLabel: row.resourceLabel ?? undefined,
    reason: row.reason ?? undefined,
    status: row.status,
    requestedByEmail: row.requestedByEmail,
    requestedByName: row.requestedByName ?? undefined,
    reviewedByEmail: row.reviewedByEmail ?? undefined,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    reviewNote: row.reviewNote ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}
