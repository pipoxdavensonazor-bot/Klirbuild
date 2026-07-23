"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  MonitorUp,
  Video,
  VideoOff,
} from "lucide-react";
import { apiUrl } from "@/lib/api-client";

type PeerInfo = { peerId: string; name: string };
type SignalMsg = {
  id: string;
  from: string;
  to: string;
  type: "offer" | "answer" | "ice";
  payload: unknown;
};

const ICE: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

function newPeerId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `p-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function NativeMeetingRoom({
  meetingId,
  displayName,
  title,
  className,
}: {
  meetingId: string;
  displayName?: string;
  title?: string;
  className?: string;
}) {
  const myId = useMemo(() => newPeerId(), []);
  const name = displayName?.trim() || "Participant";
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pcs = useRef(new Map<string, RTCPeerConnection>());
  const makingOffer = useRef(new Set<string>());
  const [remoteStreams, setRemoteStreams] = useState<
    { peerId: string; name: string; stream: MediaStream }[]
  >([]);
  const [peers, setPeers] = useState<PeerInfo[]>([]);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [sharing, setSharing] = useState(false);
  const peerNames = useRef(new Map<string, string>());
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);

  const upsertRemote = useCallback(
    (peerId: string, stream: MediaStream) => {
      setRemoteStreams((prev) => {
        const rest = prev.filter((p) => p.peerId !== peerId);
        return [
          ...rest,
          {
            peerId,
            name: peerNames.current.get(peerId) || "Participant",
            stream,
          },
        ];
      });
    },
    []
  );

  const sendSignal = useCallback(
    async (to: string, type: "offer" | "answer" | "ice", payload: unknown) => {
      await fetch(apiUrl(`/api/rtc/${meetingId}`), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "signal",
          from: myId,
          to,
          type,
          payload,
        }),
      });
    },
    [meetingId, myId]
  );

  const ensurePc = useCallback(
    (peerId: string) => {
      let pc = pcs.current.get(peerId);
      if (pc) return pc;
      pc = new RTCPeerConnection(ICE);
      pcs.current.set(peerId, pc);

      const local = streamRef.current;
      if (local) {
        for (const track of local.getTracks()) {
          pc.addTrack(track, local);
        }
      }

      pc.onicecandidate = (ev) => {
        if (ev.candidate) {
          void sendSignal(peerId, "ice", ev.candidate.toJSON());
        }
      };

      pc.ontrack = (ev) => {
        const stream = ev.streams[0] || new MediaStream([ev.track]);
        upsertRemote(peerId, stream);
      };

      pc.onconnectionstatechange = () => {
        if (
          pc.connectionState === "failed" ||
          pc.connectionState === "closed" ||
          pc.connectionState === "disconnected"
        ) {
          setRemoteStreams((prev) => prev.filter((p) => p.peerId !== peerId));
        }
      };

      return pc;
    },
    [sendSignal, upsertRemote]
  );

  const connectTo = useCallback(
    async (peerId: string) => {
      if (peerId === myId || makingOffer.current.has(peerId)) return;
      // Deterministic: only the lexicographically smaller id offers.
      if (myId > peerId) return;
      const pc = ensurePc(peerId);
      if (pc.signalingState !== "stable") return;
      makingOffer.current.add(peerId);
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await sendSignal(peerId, "offer", pc.localDescription);
      } finally {
        makingOffer.current.delete(peerId);
      }
    },
    [ensurePc, myId, sendSignal]
  );

  const handleSignal = useCallback(
    async (msg: SignalMsg) => {
      const pc = ensurePc(msg.from);
      try {
        if (msg.type === "offer") {
          await pc.setRemoteDescription(msg.payload as RTCSessionDescriptionInit);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await sendSignal(msg.from, "answer", pc.localDescription);
        } else if (msg.type === "answer") {
          if (pc.signalingState === "have-local-offer") {
            await pc.setRemoteDescription(
              msg.payload as RTCSessionDescriptionInit
            );
          }
        } else if (msg.type === "ice") {
          try {
            await pc.addIceCandidate(msg.payload as RTCIceCandidateInit);
          } catch {
            /* ignore late candidates */
          }
        }
      } catch (e) {
        console.warn("RTC signal error", e);
      }
    },
    [ensurePc, sendSignal]
  );

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: { facingMode: "user" },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setReady(true);
      } catch {
        setError(
          "Impossible d’accéder à la caméra/micro. Autorisez-les pour ce site, puis rechargez."
        );
        return;
      }

      async function tick() {
        try {
          await fetch(apiUrl(`/api/rtc/${meetingId}`), {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "heartbeat",
              peerId: myId,
              name,
            }),
          });

          const res = await fetch(
            apiUrl(
              `/api/rtc/${meetingId}?peerId=${encodeURIComponent(myId)}`
            ),
            { credentials: "include" }
          );
          const data = await res.json();
          if (!res.ok) return;

          const list = (data.peers || []) as PeerInfo[];
          for (const p of list) peerNames.current.set(p.peerId, p.name);
          setPeers(list.filter((p) => p.peerId !== myId));

          for (const p of list) {
            if (p.peerId !== myId) void connectTo(p.peerId);
          }

          for (const s of (data.signals || []) as SignalMsg[]) {
            void handleSignal(s);
          }
        } catch {
          /* network blip */
        }
      }

      await tick();
      timer = setInterval(() => void tick(), 1500);
    }

    void start();

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      void fetch(apiUrl(`/api/rtc/${meetingId}`), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "leave", peerId: myId }),
      }).catch(() => null);
      for (const pc of pcs.current.values()) pc.close();
      pcs.current.clear();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [connectTo, handleSignal, meetingId, myId, name]);

  function toggleMic() {
    const track = streamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicOn(track.enabled);
  }

  function toggleCam() {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCamOn(track.enabled);
  }

  async function stopShare() {
    const screen = screenTrackRef.current;
    if (!screen) {
      setSharing(false);
      return;
    }
    screen.onended = null;
    screen.stop();
    const cam = streamRef.current?.getVideoTracks()[0] ?? null;
    for (const pc of pcs.current.values()) {
      const sender = pc
        .getSenders()
        .find((s) => s.track && s.track.kind === "video");
      if (sender && cam) await sender.replaceTrack(cam);
    }
    if (localVideoRef.current && streamRef.current) {
      localVideoRef.current.srcObject = streamRef.current;
    }
    screenTrackRef.current = null;
    setSharing(false);
  }

  async function toggleShare() {
    if (sharing || screenTrackRef.current) {
      await stopShare();
      return;
    }
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      const track = display.getVideoTracks()[0];
      if (!track) return;
      screenTrackRef.current = track;
      track.onended = () => {
        void stopShare();
      };
      for (const pc of pcs.current.values()) {
        const sender = pc
          .getSenders()
          .find((s) => s.track && s.track.kind === "video");
        if (sender) await sender.replaceTrack(track);
      }
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = new MediaStream([
          track,
          ...(streamRef.current?.getAudioTracks() ?? []),
        ]);
      }
      setSharing(true);
    } catch {
      /* user cancelled */
    }
  }

  const tiles = [
    { peerId: myId, name: `${name} (vous)`, stream: null as MediaStream | null, local: true },
    ...remoteStreams.map((r) => ({
      peerId: r.peerId,
      name: r.name,
      stream: r.stream,
      local: false,
    })),
  ];

  return (
    <div
      className={
        className ??
        "overflow-hidden rounded-lg border border-border bg-slate-950 text-white"
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-slate-900 px-3 py-2 text-xs">
        <span>
          Salle <strong>KlirBuild</strong>
          {title ? ` — ${title}` : ""} · {peers.length + 1} participant
          {peers.length ? "s" : ""}
        </span>
        <span className="text-emerald-300">Caméra dans le même bureau</span>
      </div>

      {error ? (
        <div className="px-4 py-10 text-center text-sm text-red-300">{error}</div>
      ) : (
        <div
          className={`grid min-h-[360px] gap-2 bg-black p-2 ${
            tiles.length > 1 ? "sm:grid-cols-2" : "grid-cols-1"
          }`}
        >
          {tiles.map((t) => (
            <RemoteVideo
              key={t.peerId}
              localRef={t.local ? localVideoRef : undefined}
              stream={t.stream}
              label={t.name}
              ready={t.local ? ready : true}
            />
          ))}
        </div>
      )}

      <div className="flex items-center justify-center gap-3 border-t border-white/10 bg-slate-900 px-3 py-3">
        <button
          type="button"
          onClick={toggleMic}
          className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${
            micOn ? "bg-white/10 hover:bg-white/20" : "bg-red-600 hover:bg-red-500"
          }`}
          aria-label={micOn ? "Couper le micro" : "Activer le micro"}
        >
          {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={toggleCam}
          className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${
            camOn ? "bg-white/10 hover:bg-white/20" : "bg-red-600 hover:bg-red-500"
          }`}
          aria-label={camOn ? "Couper la caméra" : "Activer la caméra"}
        >
          {camOn ? (
            <Video className="h-4 w-4" />
          ) : (
            <VideoOff className="h-4 w-4" />
          )}
        </button>
        <button
          type="button"
          onClick={() => void toggleShare()}
          className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${
            sharing
              ? "bg-sky-600 hover:bg-sky-500"
              : "bg-white/10 hover:bg-white/20"
          }`}
          aria-label={
            sharing ? "Arrêter le partage d’écran" : "Partager l’écran"
          }
        >
          <MonitorUp className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function RemoteVideo({
  stream,
  label,
  localRef,
  ready,
}: {
  stream: MediaStream | null;
  label: string;
  localRef?: React.RefObject<HTMLVideoElement | null>;
  ready: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localRef) return;
    const el = ref.current;
    if (!el || !stream) return;
    el.srcObject = stream;
  }, [localRef, stream]);

  return (
    <div className="relative aspect-video overflow-hidden rounded-md bg-slate-900">
      <video
        ref={localRef || ref}
        autoPlay
        playsInline
        muted={Boolean(localRef)}
        className="h-full w-full object-cover"
      />
      {!ready && localRef ? (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-white/70">
          Activation caméra…
        </div>
      ) : null}
      <div className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-xs">
        {label}
      </div>
    </div>
  );
}
