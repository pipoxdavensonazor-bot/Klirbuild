import fs from "fs";
import path from "path";
import type { Client, ClientStatus } from "@/types";
import { clients as mockClients } from "@/lib/mock-data";
import { DEMO_COMPANY_ID } from "@/lib/billing/constants";
import { hasDatabase } from "@/lib/auth/auth-service";
import { prisma } from "@/lib/db";

const DATA_DIR = path.join(process.cwd(), ".data");
const STORE_PATH = path.join(DATA_DIR, "clients.json");

type StoredClient = Client;

function ensureStore() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(STORE_PATH)) {
      fs.writeFileSync(STORE_PATH, JSON.stringify([], null, 2), "utf8");
    }
  } catch {
    /* serverless: read-only filesystem */
  }
}

function readFileClients(companyId: string): StoredClient[] {
  try {
    ensureStore();
    if (!fs.existsSync(STORE_PATH)) return [];
    const all = JSON.parse(fs.readFileSync(STORE_PATH, "utf8")) as StoredClient[];
    return all.filter((c) => c.companyId === companyId);
  } catch {
    return [];
  }
}

function writeFileClient(client: StoredClient) {
  try {
    ensureStore();
    if (!fs.existsSync(STORE_PATH)) return;
    const all = JSON.parse(fs.readFileSync(STORE_PATH, "utf8")) as StoredClient[];
    all.push(client);
    fs.writeFileSync(STORE_PATH, JSON.stringify(all, null, 2), "utf8");
  } catch {
    /* ignore on serverless */
  }
}

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
  if (hasDatabase()) {
    const rows = await prisma.client.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapDbClient);
  }

  const fileRows = readFileClients(companyId);
  const mockRows = mockClients.filter((c) => c.companyId === companyId);
  const seen = new Set<string>();
  const merged: Client[] = [];
  for (const c of [...fileRows, ...mockRows]) {
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    merged.push(c);
  }
  return merged;
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

  if (hasDatabase()) {
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

  const client: Client = {
    id: `cli_${Date.now()}`,
    companyId: input.companyId,
    name: payload.name,
    email: payload.email,
    phone: payload.phone,
    status: payload.status,
    tags: [],
    city: payload.city,
    industry: payload.industry,
    owner: payload.ownerName,
    createdAt: new Date().toISOString().slice(0, 10),
    lifetimeValue: 0,
  };

  try {
    writeFileClient(client);
  } catch {
    /* fichier indisponible (ex. Vercel) — le client garde l’entrée en mémoire */
  }

  return { client };
}

export function defaultCompanyId(fallback?: string) {
  return fallback ?? DEMO_COMPANY_ID;
}
