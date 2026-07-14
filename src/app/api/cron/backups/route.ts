import { NextResponse } from "next/server";
import { authorizeCronRequest } from "@/lib/cron/authorize-cron";
import { runAutoBackupsForAllCompanies } from "@/lib/admin/backup-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!authorizeCronRequest(request)) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const result = await runAutoBackupsForAllCompanies();
  return NextResponse.json(result);
}

export async function GET(request: Request) {
  return POST(request);
}
