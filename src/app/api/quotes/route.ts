import { NextResponse } from "next/server";
import { enrichSession, getRequestSession } from "@/lib/auth/auth-service";
import { DEMO_COMPANY_ID } from "@/lib/billing/constants";
import { createQuote, listQuotes } from "@/lib/quotes/quote-service";

export const runtime = "nodejs";

async function companyId() {
  const session = await getRequestSession();
  if (!session) return DEMO_COMPANY_ID;
  const enriched = await enrichSession(session);
  return enriched.companyId;
}

export async function GET() {
  const cid = await companyId();
  const quotes = await listQuotes(cid);
  return NextResponse.json({ quotes });
}

export async function POST(request: Request) {
  const cid = await companyId();
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
