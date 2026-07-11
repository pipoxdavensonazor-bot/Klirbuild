import { NextResponse } from "next/server";
import { getRequestSession } from "@/lib/auth/auth-service";
import { DEMO_COMPANY_ID } from "@/lib/billing/constants";
import { sendInvoiceToClient } from "@/lib/invoices/invoice-service";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const session = await getRequestSession();
  const companyId = session?.companyId ?? DEMO_COMPANY_ID;
  const { id } = await ctx.params;
  const body = await request.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "send";

  if (action === "send") {
    const result = await sendInvoiceToClient(companyId, id);
    if ("error" in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: "Action invalide" }, { status: 400 });
}
