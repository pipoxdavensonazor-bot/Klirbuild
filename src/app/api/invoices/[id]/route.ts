import { NextResponse } from "next/server";
import { requireCompanyContext } from "@/lib/auth/require-company";
import {
  getInvoiceDetail,
  sendInvoiceToClient,
  updateInvoice,
} from "@/lib/invoices/invoice-service";
import { createInvoiceStripeCheckout } from "@/lib/payments/stripe-invoice-checkout";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, routeCtx: Ctx) {
  const auth = await requireCompanyContext();
  if (auth instanceof NextResponse) return auth;
  const companyId = auth.companyId;
  const { id } = await routeCtx.params;
  const detail = await getInvoiceDetail(companyId, id);
  if (!detail) {
    return NextResponse.json({ error: "Facture introuvable." }, { status: 404 });
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

  const result = await updateInvoice(companyId, id, {
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
    const result = await sendInvoiceToClient(companyId, id);
    if ("error" in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  }

  if (action === "stripe_checkout") {
    const result = await createInvoiceStripeCheckout(companyId, id);
    if ("error" in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: "Action invalide" }, { status: 400 });
}
