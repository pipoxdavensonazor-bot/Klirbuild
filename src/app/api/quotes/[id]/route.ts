import { NextResponse } from "next/server";
import { getRequestSession } from "@/lib/auth/auth-service";
import { DEMO_COMPANY_ID } from "@/lib/billing/constants";
import {
  convertQuoteToInvoice,
  sendQuoteToClient,
  updateQuoteStatus,
} from "@/lib/quotes/quote-service";
import type { QuoteStatus } from "@/types";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const session = await getRequestSession();
  const companyId = session?.companyId ?? DEMO_COMPANY_ID;
  const { id } = await ctx.params;
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
