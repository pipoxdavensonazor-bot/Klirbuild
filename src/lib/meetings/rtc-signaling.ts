import { getUploadsKv } from "@/lib/storage/kv";

export type RtcPeer = {
  peerId: string;
  name: string;
  ts: number;
};

export type RtcSignal = {
  id: string;
  from: string;
  to: string;
  type: "offer" | "answer" | "ice";
  payload: unknown;
  ts: number;
};

const PRESENCE_TTL = 45;
const SIGNAL_TTL = 90;

function presenceKey(channel: string, peerId: string) {
  return `rtc:presence:${channel}:${peerId}`;
}

function signalKey(channel: string, to: string, id: string) {
  return `rtc:signal:${channel}:${to}:${id}`;
}

function memoryStore() {
  const g = globalThis as unknown as {
    __klirRtc?: {
      presence: Map<string, RtcPeer>;
      signals: Map<string, RtcSignal>;
    };
  };
  if (!g.__klirRtc) {
    g.__klirRtc = { presence: new Map(), signals: new Map() };
  }
  return g.__klirRtc;
}

export async function heartbeatPresence(
  channel: string,
  peer: Omit<RtcPeer, "ts">
) {
  const row: RtcPeer = { ...peer, ts: Date.now() };
  const kv = await getUploadsKv();
  if (kv) {
    await kv.put(presenceKey(channel, peer.peerId), JSON.stringify(row), {
      expirationTtl: PRESENCE_TTL,
    });
    return;
  }
  const mem = memoryStore();
  mem.presence.set(`${channel}:${peer.peerId}`, row);
}

export async function listPeers(channel: string): Promise<RtcPeer[]> {
  const kv = await getUploadsKv();
  const now = Date.now();
  if (kv) {
    const listed = await kv.list({ prefix: `rtc:presence:${channel}:` });
    const peers: RtcPeer[] = [];
    for (const key of listed.keys) {
      const raw = await kv.get(key.name);
      if (!raw || typeof raw !== "string") continue;
      try {
        const p = JSON.parse(raw) as RtcPeer;
        if (now - p.ts < PRESENCE_TTL * 1000) peers.push(p);
      } catch {
        /* ignore */
      }
    }
    return peers;
  }
  const mem = memoryStore();
  const peers: RtcPeer[] = [];
  for (const [k, p] of mem.presence) {
    if (!k.startsWith(`${channel}:`)) continue;
    if (now - p.ts < PRESENCE_TTL * 1000) peers.push(p);
    else mem.presence.delete(k);
  }
  return peers;
}

export async function leavePresence(channel: string, peerId: string) {
  const kv = await getUploadsKv();
  if (kv) {
    await kv.delete(presenceKey(channel, peerId));
    return;
  }
  memoryStore().presence.delete(`${channel}:${peerId}`);
}

export async function postSignal(
  channel: string,
  signal: Omit<RtcSignal, "id" | "ts"> & { id?: string }
) {
  const row: RtcSignal = {
    id: signal.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    from: signal.from,
    to: signal.to,
    type: signal.type,
    payload: signal.payload,
    ts: Date.now(),
  };
  const kv = await getUploadsKv();
  if (kv) {
    await kv.put(signalKey(channel, row.to, row.id), JSON.stringify(row), {
      expirationTtl: SIGNAL_TTL,
    });
    return row;
  }
  memoryStore().signals.set(`${channel}:${row.to}:${row.id}`, row);
  return row;
}

export async function pullSignals(
  channel: string,
  peerId: string
): Promise<RtcSignal[]> {
  const kv = await getUploadsKv();
  const now = Date.now();
  if (kv) {
    const listed = await kv.list({
      prefix: `rtc:signal:${channel}:${peerId}:`,
    });
    const out: RtcSignal[] = [];
    for (const key of listed.keys) {
      const raw = await kv.get(key.name);
      if (!raw || typeof raw !== "string") continue;
      try {
        const s = JSON.parse(raw) as RtcSignal;
        out.push(s);
      } catch {
        /* ignore */
      }
      await kv.delete(key.name);
    }
    return out.sort((a, b) => a.ts - b.ts);
  }
  const mem = memoryStore();
  const out: RtcSignal[] = [];
  for (const [k, s] of mem.signals) {
    if (!k.startsWith(`${channel}:${peerId}:`)) continue;
    if (now - s.ts > SIGNAL_TTL * 1000) {
      mem.signals.delete(k);
      continue;
    }
    out.push(s);
    mem.signals.delete(k);
  }
  return out.sort((a, b) => a.ts - b.ts);
}
