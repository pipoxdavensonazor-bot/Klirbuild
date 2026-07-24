import { NextResponse } from "next/server";
import { requireCompanyContext } from "@/lib/auth/require-company";
import { requireCompanyPlanFeature } from "@/lib/billing/require-plan-server";
import { createInvoice, listInvoices } from "@/lib/invoices/invoice-service";

export const runtime = "nodejs";

async function companyId(): Promise<string | NextResponse> {
  const ctx = await requireCompanyContext();
  if (ctx instanceof NextResponse) return ctx;
  return ctx.companyId;
}

export async function GET() {
  const cid = await companyId();
  if (cid instanceof NextResponse) return cid;
  const invoices = await listInvoices(cid);
  return NextResponse.json({ invoices });
}

export async function POST(request: Request) {
  const cid = await companyId();
  if (cid instanceof NextResponse) return cid;
  const gated = await requireCompanyPlanFeature(cid, "quotes_invoices");
  if (gated) return gated;
  const body = await request.json().catch(() => ({}));
  const clientId = typeof body.clientId === "string" ? body.clientId : "";
  const items = Array.isArray(body.items) ? body.items : undefined;
  const total = typeof body.total === "number" ? body.total : Number(body.total);
  const description = typeof body.description === "string" ? body.description : undefined;
  const currency = typeof body.currency === "string" ? body.currency : undefined;
  const marketRegion =
    typeof body.marketRegion === "string" ? body.marketRegion : undefined;

  const result = await createInvoice({
    companyId: cid,
    clientId,
    items,
    total,
    description,
    currency,
    marketRegion: marketRegion as import("@/lib/markets/regions").MarketRegionId | undefined,
  });

  if ("error" in result && result.error) {
    const status = result.error.includes("Limite") ? 403 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json(result);
}
