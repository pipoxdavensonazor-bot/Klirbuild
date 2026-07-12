import { NextResponse } from "next/server";
import { enrichSession, getRequestSession } from "@/lib/auth/auth-service";
import { DEMO_COMPANY_ID } from "@/lib/billing/constants";
import {
  createRecurringInvoice,
  listRecurringInvoices,
  updateRecurringInvoiceStatus,
  type RecurringInterval,
} from "@/lib/invoices/recurring-invoice-service";
import type { MarketRegionId } from "@/lib/markets/regions";

export const runtime = "nodejs";

async function companyId() {
  const session = await getRequestSession();
  if (!session) return DEMO_COMPANY_ID;
  return (await enrichSession(session)).companyId;
}

function intervalFrom(value: unknown): RecurringInterval {
  return value === "weekly" ||
    value === "monthly" ||
    value === "quarterly" ||
    value === "yearly"
    ? value
    : "monthly";
}

export async function GET() {
  const recurringInvoices = await listRecurringInvoices(await companyId());
  return NextResponse.json({ recurringInvoices });
}

export async function POST(request: Request) {
  const cid = await companyId();
  const body = await request.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "create";

  if (action === "pause" || action === "activate" || action === "cancel") {
    const id = typeof body.id === "string" ? body.id : "";
    if (!id) return NextResponse.json({ error: "ID requis." }, { status: 400 });
    const status = action === "activate" ? "active" : action === "pause" ? "paused" : "cancelled";
    const result = await updateRecurringInvoiceStatus(cid, id, status);
    if ("error" in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }
    return NextResponse.json(result);
  }

  const result = await createRecurringInvoice({
    companyId: cid,
    clientId: typeof body.clientId === "string" ? body.clientId : "",
    name: typeof body.name === "string" ? body.name : "",
    interval: intervalFrom(body.interval),
    items: Array.isArray(body.items) ? body.items : [],
    currency: typeof body.currency === "string" ? body.currency : undefined,
    marketRegion:
      typeof body.marketRegion === "string" ? (body.marketRegion as MarketRegionId) : undefined,
    nextRunAt: typeof body.nextRunAt === "string" ? body.nextRunAt : undefined,
  });

  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
