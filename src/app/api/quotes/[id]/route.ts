import { NextResponse } from "next/server";
import { requireCompanyContext } from "@/lib/auth/require-company";
import {
  convertQuoteToInvoice,
  getQuoteDetail,
  sendQuoteToClient,
  updateQuote,
  updateQuoteStatus,
} from "@/lib/quotes/quote-service";
import type { QuoteStatus } from "@/types";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, routeCtx: Ctx) {
  const auth = await requireCompanyContext();
  if (auth instanceof NextResponse) return auth;
  const companyId = auth.companyId;
  const { id } = await routeCtx.params;
  const detail = await getQuoteDetail(companyId, id);
  if (!detail) {
    return NextResponse.json({ error: "Soumission introuvable." }, { status: 404 });
  }
  return NextResponse.json(detail);
}

export async function PATCH(request: Request, routeCtx: Ctx) {
  const auth = await requireCompanyContext();
  if (auth instanceof NextResponse) return auth;
  const companyId = auth.companyId;
  const { id } = await routeCtx.params;
  const body = await request.json().catch(() => ({}));
  const clientId = typeof body.clientId === "string" ? body.clientId : undefined;
  const items = Array.isArray(body.items) ? body.items : undefined;
  const marketRegion =
    typeof body.marketRegion === "string" ? body.marketRegion : undefined;

  const result = await updateQuote(companyId, id, {
    clientId,
    items,
    marketRegion: marketRegion as import("@/lib/markets/regions").MarketRegionId | undefined,
  });
  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}

export async function POST(request: Request, routeCtx: Ctx) {
  const auth = await requireCompanyContext();
  if (auth instanceof NextResponse) return auth;
  const companyId = auth.companyId;
  const { id } = await routeCtx.params;
  const body = await request.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "send";

  if (action === "send") {
    const result = await sendQuoteToClient(companyId, id);
    if ("error" in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  }

  if (action === "approve") {
    const result = await updateQuoteStatus(companyId, id, "approved");
    if ("error" in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ quote: result.quote });
  }

  if (action === "convert") {
    const result = await convertQuoteToInvoice(companyId, id);
    if ("error" in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ invoice: result.invoice });
  }

  if (action === "status" && typeof body.status === "string") {
    const result = await updateQuoteStatus(companyId, id, body.status as QuoteStatus);
    if ("error" in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ quote: result.quote });
  }

  return NextResponse.json({ error: "Action invalide" }, { status: 400 });
}
