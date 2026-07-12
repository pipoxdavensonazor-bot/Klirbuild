import { execSync } from "node:child_process";

function run(command) {
  execSync(command, { stdio: "inherit" });
}

run("npx prisma generate");

const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
const hasPostgresUrl =
  databaseUrl.startsWith("postgres://") || databaseUrl.startsWith("postgresql://");

if (hasPostgresUrl) {
  console.log("[build] DATABASE_URL detected — applying Prisma schema (db push)...");
  run("npx prisma db push");
} else {
  console.warn(
    "[build] DATABASE_URL missing or invalid — skipping prisma db push.",
  );
  console.warn(
    "[build] Add a postgresql:// connection string on Netlify (not the Supabase API URL).",
  );
}

run("npx next build");
