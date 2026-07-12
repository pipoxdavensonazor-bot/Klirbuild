import { execSync } from "node:child_process";

function run(command, env = process.env) {
  execSync(command, { stdio: "inherit", env });
}

run("npx prisma generate");

const databaseUrl =
  process.env.DATABASE_URL?.trim() || process.env.NETLIFY_DB_URL?.trim() || "";
const hasPostgresUrl =
  databaseUrl.startsWith("postgres://") || databaseUrl.startsWith("postgresql://");
const isReadonly = databaseUrl.includes("readonly");

if (hasPostgresUrl && !isReadonly) {
  console.log("[build] Applying Prisma schema via db push...");
  run("npx prisma db push", { ...process.env, DATABASE_URL: databaseUrl });
} else if (hasPostgresUrl && isReadonly) {
  console.warn("[build] Readonly DB URL — skipping prisma db push.");
} else {
  console.warn("[build] No Postgres URL — skipping prisma db push.");
}

run("npx next build");
