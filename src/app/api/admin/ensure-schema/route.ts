import { NextResponse } from "next/server";
import { ensureProductionSchema } from "@/lib/db/ensure-production-schema";

export const runtime = "nodejs";

function authorized(request: Request) {
  const header = request.headers.get("authorization") || "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const candidates = [
    process.env.SCHEMA_ENSURE_TOKEN?.trim(),
    process.env.CRON_SECRET?.trim(),
  ].filter(Boolean) as string[];
  return Boolean(bearer && candidates.includes(bearer));
}

/**
 * POST /api/admin/ensure-schema
 * Auth: Bearer SCHEMA_ENSURE_TOKEN (ou CRON_SECRET)
 * Idempotent — ajoute les colonnes Prisma manquantes (Google OAuth / register).
 */
export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const result = await ensureProductionSchema();
    return NextResponse.json(result, { status: result.ok ? 200 : 500 });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  return POST(request);
}
