/**
 * Shared Next build used by OpenNext (`opennextjs-cloudflare build` invokes `npm run build`).
 * Optional prisma db push when CLOUDFLARE_DB_PUSH=1 and DATABASE_URL is writable.
 */
import { execSync } from "node:child_process";

function run(command, env = process.env) {
  execSync(command, { stdio: "inherit", env });
}

function tryRun(command, env = process.env) {
  try {
    execSync(command, { stdio: "inherit", env });
    return true;
  } catch (error) {
    console.warn(`[build] Command failed (non-fatal): ${command}`);
    console.warn(error instanceof Error ? error.message : error);
    return false;
  }
}

run("npx prisma generate");

const databaseUrl =
  process.env.DATABASE_URL?.trim() || process.env.NETLIFY_DB_URL?.trim() || "";
const hasPostgresUrl =
  databaseUrl.startsWith("postgres://") || databaseUrl.startsWith("postgresql://");
const isReadonly = databaseUrl.includes("readonly");
const allowPush =
  process.env.CLOUDFLARE_DB_PUSH === "1" || process.env.NETLIFY === "true";

if (allowPush && hasPostgresUrl && !isReadonly) {
  console.log("[build] Applying Prisma schema via db push...");
  const ok = tryRun("npx prisma db push", {
    ...process.env,
    DATABASE_URL: databaseUrl,
  });
  if (!ok) {
    console.warn(
      "[build] prisma db push skipped/failed — continuing with Next.js build."
    );
  }
} else if (hasPostgresUrl && isReadonly) {
  console.warn("[build] Readonly DB URL — skipping prisma db push.");
} else if (!allowPush) {
  console.log("[build] Skipping prisma db push (set CLOUDFLARE_DB_PUSH=1 to enable).");
} else {
  console.warn("[build] No Postgres URL — skipping prisma db push.");
}

run("npx next build");
