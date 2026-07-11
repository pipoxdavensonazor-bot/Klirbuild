import { NextResponse } from "next/server";
import { getRequestSession } from "@/lib/auth/auth-service";
import { DEMO_COMPANY_ID } from "@/lib/billing/constants";
import { companyInboxAddress, listEmails } from "@/lib/email/email-service";

export async function GET(request: Request) {
  const session = await getRequestSession();
  const companyId = session?.companyId ?? DEMO_COMPANY_ID;
  const clientId = new URL(request.url).searchParams.get("clientId") ?? undefined;
  const emails = await listEmails(companyId, clientId);
  return NextResponse.json({
    emails,
    inboxAddress: companyInboxAddress(),
    hasResend: Boolean(process.env.RESEND_API_KEY?.trim()),
  });
}
