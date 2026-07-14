/**
 * Ensures User.totpSecret / totpEnabled exist (prod-safe IF NOT EXISTS).
 * Usage: npx tsx scripts/ensure-totp-columns.ts
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { PrismaClient } from "@prisma/client";

const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.log("NO_DATABASE_URL");
    process.exit(2);
  }
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.$queryRawUnsafe<{ column_name: string }[]>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'User'
         AND column_name IN ('totpSecret', 'totpEnabled')
       ORDER BY 1`
    );
    console.log(
      "totp_columns=" + (rows.map((r) => r.column_name).join(",") || "NONE")
    );
    if (rows.length < 2) {
      console.log("APPLYING_MIGRATION");
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "totpSecret" TEXT`
      );
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "totpEnabled" BOOLEAN NOT NULL DEFAULT false`
      );
      const again = await prisma.$queryRawUnsafe<{ column_name: string }[]>(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'User'
           AND column_name IN ('totpSecret', 'totpEnabled')
         ORDER BY 1`
      );
      console.log(
        "totp_columns_after=" +
          (again.map((r) => r.column_name).join(",") || "NONE")
      );
    } else {
      console.log("MIGRATION_ALREADY_APPLIED");
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("ERR", e instanceof Error ? e.message : e);
  process.exit(1);
});
