import { NextResponse } from "next/server";
import {
  handleResendInboundEvent,
  verifyResendWebhook,
  type ResendReceivedEvent,
} from "@/lib/email/inbound-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const payload = await request.text();
  let event: ResendReceivedEvent;
  try {
    event = JSON.parse(payload) as ResendReceivedEvent;
  } catch {
    return NextResponse.json({ error: "Payload JSON invalide." }, { status: 400 });
  }

  const valid = verifyResendWebhook(payload, {
    "svix-id": request.headers.get("svix-id"),
    "svix-timestamp": request.headers.get("svix-timestamp"),
    "svix-signature": request.headers.get("svix-signature"),
  });

  if (!valid) {
    return NextResponse.json({ error: "Signature webhook invalide." }, { status: 401 });
  }

  const result = await handleResendInboundEvent(event);
  if ("error" in result && result.error) {
    const status = result.error.includes("DATABASE_URL") ? 503 : 422;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json(result);
}
