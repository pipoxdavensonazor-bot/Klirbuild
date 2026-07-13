import { NextResponse } from "next/server";
import { enrichSession, getRequestSession } from "@/lib/auth/auth-service";
import { DEMO_COMPANY_ID } from "@/lib/billing/constants";
import { getCompanyEmailContext } from "@/lib/email/company-email";
import {
  companyInboxAddress,
  listEmails,
  sendClientMessage,
} from "@/lib/email/email-service";

export const runtime = "nodejs";

async function companyId() {
  const session = await getRequestSession();
  if (!session) return DEMO_COMPANY_ID;
  const enriched = await enrichSession(session);
  return enriched.companyId;
}

export async function GET(request: Request) {
  const cid = await companyId();
  const clientId = new URL(request.url).searchParams.get("clientId") ?? undefined;
  const emails = await listEmails(cid, clientId);
  const inboxAddress = await companyInboxAddress(cid);
  const emailContext = await getCompanyEmailContext(cid);
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.URL?.trim() ||
    "https://www.klirline.app";
  return NextResponse.json({
    emails,
    inboxAddress,
    hasResend: Boolean(process.env.RESEND_API_KEY?.trim()),
    hasResendInbound: Boolean(process.env.RESEND_WEBHOOK_SECRET?.trim()),
    inboundWebhookUrl: `${appUrl.replace(/\/$/, "")}/api/resend/webhook`,
    companyName: emailContext.companyName,
    senderName: emailContext.senderName,
    replyTo: emailContext.replyTo,
  });
}

export async function POST(request: Request) {
  const cid = await companyId();
  const body = await request.json().catch(() => ({}));
  const clientId = typeof body.clientId === "string" ? body.clientId : "";
  const subject = typeof body.subject === "string" ? body.subject : "";
  const message = typeof body.body === "string" ? body.body : "";

  const result = await sendClientMessage({
    companyId: cid,
    clientId,
    subject,
    body: message,
  });

  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
