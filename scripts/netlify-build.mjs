import { execSync } from "node:child_process";

function run(command) {
  execSync(command, { stdio: "inherit" });
}

run("npx prisma generate");

const databaseUrl =
  process.env.DATABASE_URL?.trim() || process.env.NETLIFY_DB_URL?.trim() || "";
const hasPostgresUrl =
  databaseUrl.startsWith("postgres://") || databaseUrl.startsWith("postgresql://");
const isReadonly = databaseUrl.includes("readonly");

if (hasPostgresUrl && !isReadonly) {
  console.log("[build] Postgres URL detected — applying Prisma schema (db push)...");
  run("npx prisma db push");
} else if (process.env.NETLIFY_DB_URL || databaseUrl.includes("netlify.com")) {
  console.log(
    "[build] Netlify Database detected — schema via netlify/database/migrations on deploy.",
  );
} else {
  console.warn("[build] No Postgres URL — skipping prisma db push.");
}

run("npx next build");
