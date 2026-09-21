"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Check,
  Copy,
  MessageCircle,
  MoreHorizontal,
  Radio,
  Share2,
  Send,
} from "lucide-react";
import { DailyRoomEmbed } from "@/components/meetings/daily-room-embed";
import { LiveSocialConnections } from "@/components/meetings/live-social-connections";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiUrl } from "@/lib/api-client";
import { copyText } from "@/lib/meetings/ui";

type LiveComment = {
  id: string;
  authorName: string;
  body: string;
  createdAt: string;
};

type Panel = "comments" | "share" | "options" | null;

type Props = {
  liveId: string;
  roomUrl: string;
  token?: string;
  title: string;
  /** Absolute public live URL for share / social announce */
  liveUrl?: string;
  /** Public slug for spectator comment API */
  publicSlug?: string;
  /** Host mode uses authenticated comment API */
  isHost?: boolean;
  viewerName?: string;
  className?: string;
};

export function LiveStage({
  liveId,
  roomUrl,
  token,
  title,
  liveUrl,
  publicSlug,
  isHost = false,
  viewerName = "Spectateur",
  className,
}: Props) {
  const [panel, setPanel] = useState<Panel>("comments");
  const [comments, setComments] = useState<LiveComment[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef<string | undefined>(undefined);

  const commentsPath = isHost
    ? `/api/live/${liveId}/comments`
    : publicSlug
      ? `/api/public/live/${publicSlug}/comments`
      : null;

  const loadComments = useCallback(async () => {
    if (!commentsPath) return;
    try {
      const qs = lastIdRef.current
        ? `?after=${encodeURIComponent(lastIdRef.current)}`
        : "";
      const res = await fetch(apiUrl(`${commentsPath}${qs}`), {
        credentials: isHost ? "include" : "same-origin",
      });
      const data = await res.json();
      if (!res.ok) return;
      const batch: LiveComment[] = data.comments ?? [];
      if (!batch.length) return;
      setComments((prev) => {
        const seen = new Set(prev.map((c) => c.id));
        const merged = [...prev];
        for (const c of batch) {
          if (!seen.has(c.id)) merged.push(c);
        }
        return merged.slice(-200);
      });
      lastIdRef.current = batch[batch.length - 1]?.id ?? lastIdRef.current;
    } catch {
      /* poll quietly */
    }
  }, [commentsPath, isHost]);

  useEffect(() => {
    lastIdRef.current = undefined;
    setComments([]);
    void loadComments();
    const t = setInterval(() => void loadComments(), 2500);
    return () => clearInterval(t);
  }, [loadComments, liveId]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [comments.length]);

  async function sendComment() {
    if (!commentsPath || !draft.trim()) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(apiUrl(commentsPath), {
        method: "POST",
        credentials: isHost ? "include" : "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: draft,
          authorName: viewerName,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Envoi impossible.");
        return;
      }
      if (data.comment) {
        setComments((prev) => [...prev, data.comment]);
        lastIdRef.current = data.comment.id;
      }
      setDraft("");
    } finally {
      setBusy(false);
    }
  }

  async function shareNative() {
    if (!liveUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({ title, url: liveUrl, text: `🔴 LIVE — ${title}` });
        return;
      } catch {
        /* fall through */
      }
    }
    const ok = await copyText(liveUrl);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  function toggle(next: Panel) {
    setPanel((cur) => (cur === next ? null : next));
  }

  return (
    <div
      className={
        className ??
        "overflow-hidden rounded-xl border border-border bg-[#0b1220] text-white shadow-soft"
      }
    >
      <div className="relative">
        <div className="pointer-events-none absolute left-3 top-3 z-10 flex items-center gap-2">
          <span className="rounded bg-red-600 px-2 py-0.5 text-[10px] font-bold tracking-wide">
            LIVE
          </span>
          <span className="rounded bg-black/50 px-2 py-0.5 text-[10px] text-white/80 backdrop-blur">
            {title}
          </span>
        </div>

        <DailyRoomEmbed
          roomUrl={roomUrl}
          token={token}
          title={title}
          meetingId={liveId}
          className="overflow-hidden rounded-none border-0 bg-black"
        />

        {/* Bottom live bar — YouTube / TikTok style */}
        <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/90 via-black/55 to-transparent px-3 pb-3 pt-10">
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1">
              <BarButton
                active={panel === "comments"}
                onClick={() => toggle("comments")}
                label="Commentaires"
                icon={<MessageCircle className="h-4 w-4" />}
              />
              <BarButton
                active={panel === "share"}
                onClick={() => toggle("share")}
                label="Partager"
                icon={<Share2 className="h-4 w-4" />}
              />
              {isHost ? (
                <BarButton
                  active={panel === "options"}
                  onClick={() => toggle("options")}
                  label="Réseaux"
                  icon={<Radio className="h-4 w-4" />}
                />
              ) : (
                <BarButton
                  active={panel === "options"}
                  onClick={() => toggle("options")}
                  label="Options"
                  icon={<MoreHorizontal className="h-4 w-4" />}
                />
              )}
            </div>
            {liveUrl ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-8 bg-white/15 text-white hover:bg-white/25"
                onClick={() => void shareNative()}
              >
                {copied ? (
                  <Check className="mr-1 h-3.5 w-3.5" />
                ) : (
                  <Copy className="mr-1 h-3.5 w-3.5" />
                )}
                Lien
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {panel ? (
        <div className="border-t border-white/10 bg-[#0f172a] p-3 text-sm">
          {panel === "comments" ? (
            <div className="space-y-2">
              <div
                ref={listRef}
                className="max-h-48 space-y-2 overflow-y-auto pr-1"
              >
                {comments.length === 0 ? (
                  <p className="text-xs text-white/50">
                    Aucun commentaire pour l’instant — soyez le premier.
                  </p>
                ) : (
                  comments.map((c) => (
                    <div key={c.id} className="text-xs leading-relaxed">
                      <span className="font-semibold text-sky-300">
                        {c.authorName}
                      </span>{" "}
                      <span className="text-white/85">{c.body}</span>
                    </div>
                  ))
                )}
              </div>
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void sendComment();
                }}
              >
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Écrire un commentaire…"
                  maxLength={500}
                  className="h-9 border-white/15 bg-white/5 text-white placeholder:text-white/40"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={busy || !draft.trim()}
                  className="h-9"
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </form>
              {error ? (
                <p className="text-xs text-red-300">{error}</p>
              ) : null}
            </div>
          ) : null}

          {panel === "share" ? (
            <div className="space-y-3">
              <p className="text-xs text-white/60">
                Partagez le live comme sur YouTube, Facebook ou TikTok.
              </p>
              {liveUrl ? (
                <div className="flex flex-wrap gap-2">
                  <ShareChip
                    label="Copier le lien"
                    onClick={() => void shareNative()}
                  />
                  <ShareChip
                    label="Facebook"
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(liveUrl)}`}
                  />
                  <ShareChip
                    label="X / Twitter"
                    href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(liveUrl)}&text=${encodeURIComponent(`🔴 LIVE — ${title}`)}`}
                  />
                  <ShareChip
                    label="WhatsApp"
                    href={`https://wa.me/?text=${encodeURIComponent(`🔴 LIVE — ${title}\n${liveUrl}`)}`}
                  />
                  <ShareChip
                    label="LinkedIn"
                    href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(liveUrl)}`}
                  />
                </div>
              ) : (
                <p className="text-xs text-white/50">Lien public indisponible.</p>
              )}
              {isHost && liveUrl ? (
                <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-foreground">
                  <LiveSocialConnections
                    compact
                    autoGoLive
                    title={title}
                    liveUrl={liveUrl}
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          {panel === "options" ? (
            <div className="space-y-2 text-xs text-white/70">
              {isHost ? (
                <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-foreground">
                  <LiveSocialConnections
                    compact
                    autoGoLive
                    title={title}
                    liveUrl={liveUrl}
                  />
                </div>
              ) : (
                <>
                  <p>
                    Vous regardez le live en direct. Utilisez Commentaires pour
                    discuter, Partager pour envoyer le lien.
                  </p>
                  {liveUrl ? (
                    <p className="break-all text-white/50">{liveUrl}</p>
                  ) : null}
                </>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function BarButton({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition ${
        active
          ? "bg-white text-slate-900"
          : "bg-white/15 text-white hover:bg-white/25"
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function ShareChip({
  label,
  href,
  onClick,
}: {
  label: string;
  href?: string;
  onClick?: () => void;
}) {
  const className =
    "inline-flex h-8 items-center rounded-full border border-white/15 bg-white/10 px-3 text-xs text-white hover:bg-white/20";
  if (href) {
    return (
      <a
        className={className}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
      >
        {label}
      </a>
    );
  }
  return (
    <button type="button" className={className} onClick={onClick}>
      {label}
    </button>
  );
}
