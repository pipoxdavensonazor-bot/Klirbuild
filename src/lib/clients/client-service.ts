import type { Client, ClientStatus } from "@/types";
import { DEMO_COMPANY_ID } from "@/lib/billing/constants";
import { hasDatabase } from "@/lib/auth/auth-service";
import { DATABASE_REQUIRED_MESSAGE } from "@/lib/api/database-guard";
import { prisma } from "@/lib/db";

function mapDbClient(row: {
  id: string;
  companyId: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  tags: string[];
  city: string | null;
  industry: string | null;
  ownerName: string | null;
  lifetimeValue: { toNumber(): number } | number;
  createdAt: Date;
}): Client {
  const ltv =
    typeof row.lifetimeValue === "number"
      ? row.lifetimeValue
      : row.lifetimeValue.toNumber();
  return {
    id: row.id,
    companyId: row.companyId,
    name: row.name,
    email: row.email ?? "",
    phone: row.phone ?? "",
    status: row.status as ClientStatus,
    tags: row.tags,
    city: row.city ?? "",
    industry: row.industry ?? "",
    owner: row.ownerName ?? "",
    createdAt: row.createdAt.toISOString().slice(0, 10),
    lifetimeValue: ltv,
  };
}

export async function listClients(companyId: string): Promise<Client[]> {
  if (!hasDatabase()) return [];
  const rows = await prisma.client.findMany({
    where: { companyId, deletedAt: null },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(mapDbClient);
}

export async function createClient(input: {
  companyId: string;
  name: string;
  email?: string;
  phone?: string;
  industry?: string;
  city?: string;
  ownerName?: string;
  status?: ClientStatus;
}) {
  const name = input.name.trim();
  if (!name) return { error: "Le nom du client est requis." as const };

  const payload = {
    name,
    email: input.email?.trim() ?? "",
    phone: input.phone?.trim() ?? "",
    industry: input.industry?.trim() ?? "",
    city: input.city?.trim() ?? "",
    ownerName: input.ownerName?.trim() ?? "",
    status: (input.status ?? "lead") as ClientStatus,
  };

  if (!hasDatabase()) return { error: DATABASE_REQUIRED_MESSAGE as const };

  const row = await prisma.client.create({
      data: {
        companyId: input.companyId,
        name: payload.name,
        email: payload.email || null,
        phone: payload.phone || null,
        industry: payload.industry || null,
        city: payload.city || null,
        ownerName: payload.ownerName || null,
        status: payload.status,
      },
    });
    return { client: mapDbClient(row) };
}

export function defaultCompanyId(fallback?: string) {
  return fallback ?? DEMO_COMPANY_ID;
}
