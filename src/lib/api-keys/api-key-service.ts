import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { hasDatabase } from "@/lib/auth/auth-service";
import { DATABASE_REQUIRED_MESSAGE } from "@/lib/api/database-guard";
import { prisma } from "@/lib/db";

const scryptAsync = promisify(scrypt);

async function hashKey(plain: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(plain, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyApiKey(plain: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = (await scryptAsync(plain, salt, 64)) as Buffer;
  const hashBuf = Buffer.from(hash, "hex");
  if (hashBuf.length !== derived.length) return false;
  return timingSafeEqual(hashBuf, derived);
}

function generatePlainKey() {
  return `klir_${randomBytes(24).toString("base64url")}`;
}

export type ApiKeySummary = {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

export async function listApiKeys(companyId: string): Promise<ApiKeySummary[]> {
  if (!hasDatabase()) return [];

  const rows = await prisma.apiKey.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    prefix: row.keyPrefix,
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
    revokedAt: row.revokedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function createApiKey(companyId: string, name: string) {
  if (!hasDatabase()) return { error: DATABASE_REQUIRED_MESSAGE };

  const trimmed = name.trim();
  if (!trimmed) return { error: "Nom requis." as const };

  const plain = generatePlainKey();
  const keyHash = await hashKey(plain);
  const keyPrefix = plain.slice(0, 12);

  const row = await prisma.apiKey.create({
    data: { companyId, name: trimmed, keyPrefix, keyHash },
  });

  return {
    key: {
      id: row.id,
      name: row.name,
      createdAt: row.createdAt.toISOString(),
    },
    plain,
  };
}

export async function revokeApiKey(companyId: string, id: string) {
  if (!hasDatabase()) return { error: DATABASE_REQUIRED_MESSAGE };

  const updated = await prisma.apiKey.updateMany({
    where: { id, companyId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  if (updated.count === 0) return { error: "Clé introuvable ou déjà révoquée." as const };
  return { ok: true as const };
}
