import { NextResponse } from "next/server";
import { enrichSession, requireSession } from "@/lib/auth/auth-service";
import { sendEnterpriseInquiry } from "@/lib/billing/enterprise-contact";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireSession();
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => ({}));
  const companyName = typeof body.companyName === "string" ? body.companyName : "";
  const subject = typeof body.subject === "string" ? body.subject : "";
  const message = typeof body.message === "string" ? body.message : "";

  const session = await enrichSession(auth);
  const result = await sendEnterpriseInquiry({
    companyId: session.companyId,
    requesterEmail: session.email,
    companyName,
    subject,
    message,
  });

  if ("error" in result && result.error) {
    const status = result.error.includes("requis") ? 400 : 502;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true, to: result.to });
}
