import { NextResponse } from "next/server";
import { runAllActiveAutomations } from "@/lib/automations/automation-runner";
import { authorizeCronRequest } from "@/lib/cron/authorize-cron";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!authorizeCronRequest(request)) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const result = await runAllActiveAutomations();
  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 503 });
  }

  return NextResponse.json({
    ok: true,
    evaluated: result.evaluated,
    fired: result.fired,
    results: result.results,
    message: `${result.fired} automatisation(s) exécutée(s).`,
  });
}

export async function GET(request: Request) {
  return POST(request);
}
