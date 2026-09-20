import { NextResponse } from "next/server";
import { rateLimitResponse } from "@/lib/auth/rate-limit";
import {
  demoEmailPayload,
  demoMailto,
  isHoneypotTripped,
  parseDemoRequest,
  type DemoRequestInput,
} from "@/lib/marketing/demo-request";

export const runtime = "nodejs";

async function sendDemoEmail(payload: ReturnType<typeof demoEmailPayload>) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return { sent: false as const };

  const from =
    process.env.EMAIL_FROM?.trim() || "KlirBuild <Contact@klirline.ca>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [payload.to],
      reply_to: payload.replyTo,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    }),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    return { sent: false as const, error: data.message || "Envoi courriel échoué" };
  }
  return { sent: true as const };
}

export async function POST(request: Request) {
  const limited = rateLimitResponse(request, "demo-request", {
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });
  if (limited) return limited;

  const body = (await request.json().catch(() => ({}))) as DemoRequestInput;
  if (isHoneypotTripped(body)) {
    return NextResponse.json({ ok: true });
  }

  const parsed = parseDemoRequest(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const payload = demoEmailPayload(parsed.value);
  const mailto = demoMailto(parsed.value);

  try {
    const result = await sendDemoEmail(payload);
    if (result.sent) {
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ ok: false, mailto }, { status: 202 });
  } catch {
    return NextResponse.json({ ok: false, mailto }, { status: 202 });
  }
}
