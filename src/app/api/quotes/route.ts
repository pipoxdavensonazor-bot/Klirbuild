import { NextResponse } from "next/server";
import { requireCompanyContext } from "@/lib/auth/require-company";
import { createQuote, listQuotes } from "@/lib/quotes/quote-service";

export const runtime = "nodejs";

async function companyId(): Promise<string | NextResponse> {
  const ctx = await requireCompanyContext();
  if (ctx instanceof NextResponse) return ctx;
  return ctx.companyId;
}

export async function GET() {
  const cid = await companyId();
  if (cid instanceof NextResponse) return cid;
  const quotes = await listQuotes(cid);
  return NextResponse.json({ quotes });
}

export async function POST(request: Request) {
  const cid = await companyId();
  if (cid instanceof NextResponse) return cid;
  const body = await request.json().catch(() => ({}));
  const clientId = typeof body.clientId === "string" ? body.clientId : "";
  const items = Array.isArray(body.items) ? body.items : undefined;
  const total = typeof body.total === "number" ? body.total : Number(body.total);
  const description = typeof body.description === "string" ? body.description : undefined;
  const currency = typeof body.currency === "string" ? body.currency : undefined;
  const marketRegion =
    typeof body.marketRegion === "string" ? body.marketRegion : undefined;

  const result = await createQuote({
    companyId: cid,
    clientId,
    items,
    total,
    description,
    currency,
    marketRegion: marketRegion as import("@/lib/markets/regions").MarketRegionId | undefined,
  });

  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
