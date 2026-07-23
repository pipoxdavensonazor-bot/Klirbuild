import { NextResponse } from "next/server";
import { enrichSession, requireSession } from "@/lib/auth/auth-service";
import { canApp } from "@/lib/workforce/types";
import {
  heartbeatPresence,
  leavePresence,
  listPeers,
  postSignal,
  pullSignals,
} from "@/lib/meetings/rtc-signaling";

export const runtime = "nodejs";

type Params = { params: Promise<{ channel: string }> };

async function authorize() {
  const session = await requireSession();
  if (session instanceof NextResponse) return { error: session };
  const enriched = await enrichSession(session);
  if (
    !canApp(enriched.role, "meetings:join") &&
    !canApp(enriched.role, "live:host")
  ) {
    return {
      error: NextResponse.json({ error: "Accès refusé." }, { status: 403 }),
    };
  }
  return { enriched };
}

function cleanChannel(raw: string) {
  return raw.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
}

export async function GET(request: Request, { params }: Params) {
  const auth = await authorize();
  if ("error" in auth && auth.error) return auth.error;

  const { channel: raw } = await params;
  const channel = cleanChannel(raw);
  if (!channel) {
    return NextResponse.json({ error: "Canal invalide." }, { status: 400 });
  }

  const url = new URL(request.url);
  const peerId = url.searchParams.get("peerId")?.trim();
  if (!peerId) {
    return NextResponse.json({ error: "peerId requis." }, { status: 400 });
  }

  const [peers, signals] = await Promise.all([
    listPeers(channel),
    pullSignals(channel, peerId),
  ]);

  return NextResponse.json({ peers, signals });
}

export async function POST(request: Request, { params }: Params) {
  const auth = await authorize();
  if ("error" in auth && auth.error) return auth.error;

  const { channel: raw } = await params;
  const channel = cleanChannel(raw);
  if (!channel) {
    return NextResponse.json({ error: "Canal invalide." }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "";

  if (action === "heartbeat") {
    const peerId = typeof body.peerId === "string" ? body.peerId.trim() : "";
    const name =
      typeof body.name === "string" && body.name.trim()
        ? body.name.trim()
        : auth.enriched.email;
    if (!peerId) {
      return NextResponse.json({ error: "peerId requis." }, { status: 400 });
    }
    await heartbeatPresence(channel, { peerId, name });
    const peers = await listPeers(channel);
    return NextResponse.json({ ok: true, peers });
  }

  if (action === "leave") {
    const peerId = typeof body.peerId === "string" ? body.peerId.trim() : "";
    if (peerId) await leavePresence(channel, peerId);
    return NextResponse.json({ ok: true });
  }

  if (action === "signal") {
    const from = typeof body.from === "string" ? body.from.trim() : "";
    const to = typeof body.to === "string" ? body.to.trim() : "";
    const type = body.type as "offer" | "answer" | "ice";
    if (!from || !to || !["offer", "answer", "ice"].includes(type)) {
      return NextResponse.json({ error: "Signal invalide." }, { status: 400 });
    }
    const row = await postSignal(channel, {
      from,
      to,
      type,
      payload: body.payload,
    });
    return NextResponse.json({ ok: true, signal: row });
  }

  return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
}
