import { NextResponse } from "next/server";

export const DATABASE_REQUIRED_MESSAGE =
  "DATABASE_URL requis. Configurez Postgres sur Netlify." as const;

export function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

/** Routes API accessibles sans Postgres (auth, stripe, santé, cron). */
export const API_DB_WHITELIST = [
  "/api/health",
  "/api/auth",
  "/api/stripe",
  "/api/cron",
  "/api/uploads",
] as const;

export function apiRequiresDatabase(pathname: string) {
  if (!pathname.startsWith("/api/")) return false;
  return !API_DB_WHITELIST.some((prefix) => pathname.startsWith(prefix));
}

export function databaseRequiredResponse() {
  return NextResponse.json({ error: DATABASE_REQUIRED_MESSAGE }, { status: 503 });
}
