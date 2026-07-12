import { NextResponse } from "next/server";
import { enrichSession, getRequestSession } from "@/lib/auth/auth-service";
import { DEMO_COMPANY_ID } from "@/lib/billing/constants";
import { createInvoice, listInvoices } from "@/lib/invoices/invoice-service";

export const runtime = "nodejs";

async function companyId() {
  const session = await getRequestSession();
  if (!session) return DEMO_COMPANY_ID;
  const enriched = await enrichSession(session);
  return enriched.companyId;
}

export async function GET() {
  const cid = await companyId();
  const invoices = await listInvoices(cid);
  return NextResponse.json({ invoices });
}

export async function POST(request: Request) {
  const cid = await companyId();
  const body = await request.json().catch(() => ({}));
  const clientId = typeof body.clientId === "string" ? body.clientId : "";
  const total = typeof body.total === "number" ? body.total : Number(body.total);
  const description = typeof body.description === "string" ? body.description : undefined;
  const currency = typeof body.currency === "string" ? body.currency : undefined;

  const result = await createInvoice({
    companyId: cid,
    clientId,
    total,
    description,
    currency,
  });

  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
