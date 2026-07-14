/**
 * Fetch production DB URL from Netlify CLI (no disk write) and ensure TOTP columns.
 * Usage: npx tsx scripts/ensure-totp-from-netlify.ts
 */
import { spawnSync } from "child_process";
import { PrismaClient } from "@prisma/client";

function netlifyEnvGet(name: string): string | null {
  const r = spawnSync(
    "npx",
    ["netlify", "env:get", name, "--context", "production", "--json"],
    {
      encoding: "utf8",
      shell: true,
      env: process.env,
    }
  );
  const out = `${r.stdout || ""}\n${r.stderr || ""}`
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("npm warn") && !l.includes("Unknown env config"))
    .join("\n")
    .trim();
  if (!out) return null;

  try {
    const parsed = JSON.parse(out) as unknown;
    if (typeof parsed === "string") return parsed.trim() || null;
    if (parsed && typeof parsed === "object") {
      const obj = parsed as Record<string, unknown>;
      const direct = obj[name] ?? obj.value ?? obj.Value;
      if (typeof direct === "string" && direct.trim()) return direct.trim();
      // Some CLI versions nest
      for (const v of Object.values(obj)) {
        if (typeof v === "string" && /^(postgres|postgresql):\/\//i.test(v)) {
          return v.trim();
        }
        if (v && typeof v === "object" && typeof (v as { value?: string }).value === "string") {
          const inner = (v as { value: string }).value.trim();
          if (inner) return inner;
        }
      }
    }
  } catch {
    // plain text value
    const line = out
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => /^(postgres|postgresql):\/\//i.test(l));
    if (line) return line;
    const m = out.match(/(postgres(?:ql)?:\/\/\S+)/i);
    if (m?.[1]) return m[1];
  }
  return null;
}

function resolveDatabaseUrl() {
  for (const key of ["DATABASE_URL", "NETLIFY_DB_URL", "SUPABASE_DATABASE_URL"]) {
    const v = netlifyEnvGet(key);
    if (v && /^(postgres|postgresql):\/\//i.test(v)) {
      console.log(`using ${key} (len=${v.length})`);
      return v;
    }
    if (v) console.log(`${key} present but not postgres URL (len=${v.length})`);
  }
  return null;
}

async function ensureColumns(databaseUrl: string) {
  process.env.DATABASE_URL = databaseUrl;
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
    if (rows.length >= 2) {
      console.log("MIGRATION_ALREADY_APPLIED");
      return;
    }
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
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const url = resolveDatabaseUrl();
  if (!url) {
    console.error("NO_PROD_DATABASE_URL");
    process.exit(2);
  }
  await ensureColumns(url);
}

main().catch((e) => {
  console.error("ERR", e instanceof Error ? e.message : e);
  process.exit(1);
});
