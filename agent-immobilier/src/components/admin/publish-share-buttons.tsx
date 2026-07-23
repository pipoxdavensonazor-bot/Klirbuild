"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type ShareLink = {
  platform: string;
  shareUrl?: string;
  status: string;
  caption?: string;
};

const PLATFORM_LABEL: Record<string, string> = {
  FACEBOOK: "Facebook",
  LINKEDIN: "LinkedIn",
  X: "X",
  WHATSAPP: "WhatsApp",
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
  WEBHOOK: "Webhook",
};

export function PublishShareButtons({
  type,
  id,
  published,
}: {
  type: "article" | "property";
  id: string;
  published?: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  async function publishAndShare() {
    setPending(true);
    setMsg(null);
    setLinks([]);

    void published;

    const res = await fetch("/api/social", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        type === "article"
          ? { type: "article", articleId: id }
          : { type: "property", propertyId: id }
      ),
    });
    setPending(false);
    if (!res.ok) {
      setMsg("Erreur de publication / partage.");
      return;
    }
    const data = await res.json();
    setLinks(data.results || []);
    setMsg("Publié. Cliquez un réseau pour partager.");
  }

  async function openShare(link: ShareLink) {
    if (link.caption) {
      try {
        await navigator.clipboard.writeText(link.caption);
      } catch {
        /* ignore */
      }
    }
    if (link.shareUrl) {
      window.open(link.shareUrl, "_blank", "noopener,noreferrer");
    }
    if (link.platform === "TIKTOK") {
      setMsg("TikTok ouvert. Collez la légende (déjà copiée) et publiez votre vidéo.");
    } else if (link.platform === "INSTAGRAM") {
      setMsg("Instagram ouvert. Collez la légende (déjà copiée) dans votre publication.");
    } else {
      setMsg("Fenêtre de partage ouverte.");
    }
  }

  return (
    <div className="space-y-2 text-right">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={publishAndShare}
      >
        {pending ? "…" : "Publier & partager"}
      </Button>
      {msg ? <p className="text-xs text-slate-500">{msg}</p> : null}
      {links.length > 0 ? (
        <div className="flex flex-wrap justify-end gap-2">
          {links
            .filter((l) => l.shareUrl)
            .map((l) => (
              <button
                key={l.platform}
                type="button"
                onClick={() => openShare(l)}
                className="border border-slate-300 px-2 py-1 text-xs hover:border-[#C9A227]"
              >
                {PLATFORM_LABEL[l.platform] || l.platform}
              </button>
            ))}
        </div>
      ) : null}
    </div>
  );
}
