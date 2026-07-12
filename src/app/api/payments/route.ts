import { NextResponse } from "next/server";
import { enrichSession, requireSession } from "@/lib/auth/auth-service";
import {
  listClientPayments,
  recordClientPayment,
} from "@/lib/payments/client-payment-service";
import { canApp } from "@/lib/workforce/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  const enriched = await enrichSession(session);
  if (!canApp(enriched.role, "billing:manage")) {
    return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
  }
  const clientId = new URL(request.url).searchParams.get("clientId") ?? undefined;
  const payments = await listClientPayments(enriched.companyId, clientId);
  return NextResponse.json({ payments });
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  const enriched = await enrichSession(session);
  if (!canApp(enriched.role, "billing:manage")) {
    return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  const result = await recordClientPayment({
    companyId: enriched.companyId,
    clientId: typeof body.clientId === "string" ? body.clientId : "",
    invoiceId: typeof body.invoiceId === "string" ? body.invoiceId : undefined,
    amount: Number(body.amount),
    method: typeof body.method === "string" ? body.method : "virement",
    projectName: typeof body.projectName === "string" ? body.projectName : undefined,
    sendReceipt: body.sendReceipt !== false,
  });
  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
