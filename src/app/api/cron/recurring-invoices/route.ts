import { NextResponse } from "next/server";
import { generateDueRecurringInvoices } from "@/lib/invoices/recurring-invoice-service";
import { authorizeCronRequest } from "@/lib/cron/authorize-cron";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!authorizeCronRequest(request)) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const result = await generateDueRecurringInvoices();
  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 503 });
  }

  return NextResponse.json({
    ok: true,
    evaluated: result.evaluated,
    generated: result.generated,
    results: result.results,
    message: `${result.generated} facture(s) récurrente(s) générée(s).`,
  });
}

export async function GET(request: Request) {
  return POST(request);
}
