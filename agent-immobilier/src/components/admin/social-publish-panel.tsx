"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export type SocialShareResult = {
  platform: string;
  status: string;
  shareUrl?: string;
  caption?: string;
  error?: string;
};

type Account = {
  id: string;
  platform: string;
  label: string;
  enabled: boolean;
};

const PLATFORM_LABEL: Record<string, string> = {
  FACEBOOK: "Facebook",
  LINKEDIN: "LinkedIn",
  X: "X",
  WHATSAPP: "WhatsApp",
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
  WEBHOOK: "Zapier",
  WEBHOOK_MAKE: "Make.com",
};

const DEFAULT_SELECTED = ["FACEBOOK", "INSTAGRAM", "LINKEDIN", "TIKTOK"];

export function SocialPublishPanel({
  type,
  id,
  autoPublish = false,
  compact = false,
}: {
  type: "property" | "article" | "seminar";
  id: string;
  /** Déclenche automatiquement la préparation des partages au montage */
  autoPublish?: boolean;
  compact?: boolean;
}) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selected, setSelected] = useState<string[]>(DEFAULT_SELECTED);
  const [pending, setPending] = useState(false);
  const [results, setResults] = useState<SocialShareResult[]>([]);
  const [caption, setCaption] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/social");
      if (!res.ok || cancelled) return;
      const data = await res.json();
      const enabled: Account[] = (data.accounts || []).filter(
        (a: Account) => a.enabled && !a.platform.startsWith("WEBHOOK")
      );
      setAccounts(enabled);
      const platforms = enabled.map((a) => a.platform);
      setSelected((prev) => {
        const next = prev.filter((p) => platforms.includes(p));
        return next.length ? next : DEFAULT_SELECTED.filter((p) => platforms.includes(p));
      });
      // Les webhooks Zapier/Make partent toujours côté serveur s'ils sont configurés.
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (autoPublish && id && accounts.length > 0) {
      void publish();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPublish, id, accounts.length]);

  async function publish() {
    if (!id) return;
    setPending(true);
    setMsg(null);
    setResults([]);

    const body =
      type === "property"
        ? { type: "property", propertyId: id, platforms: selected }
        : type === "article"
          ? { type: "article", articleId: id, platforms: selected }
          : { type: "seminar", seminarId: id, platforms: selected };

    const res = await fetch("/api/social", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setPending(false);

    if (!res.ok) {
      setMsg("Erreur lors de la préparation des publications.");
      return;
    }

    const data = await res.json();
    const list: SocialShareResult[] = data.results || [];
    setResults(list);
    setCaption(data.caption || null);
    setUrl(data.url || null);
    const sent = list.filter((r) => r.status === "SENT").map((r) => r.platform);
    const failed = list.filter((r) => r.status === "FAILED");
    if (sent.length) {
      setMsg(
        `Publié automatiquement : ${sent.map((p) => PLATFORM_LABEL[p] || p).join(", ")}.`
      );
    } else if (failed.length) {
      setMsg(
        `Échec auto : ${failed.map((r) => `${PLATFORM_LABEL[r.platform] || r.platform}${r.error ? ` (${r.error})` : ""}`).join(" · ")}. Utilisez le partage manuel ci-dessous.`
      );
    } else {
      setMsg(
        "Prêt. Webhook / API si configurés. Cliquez un réseau pour le partage manuel."
      );
    }

    // Ouvre Facebook + LinkedIn manuellement seulement si pas déjà SENT
    for (const link of list) {
      if (
        (link.platform === "FACEBOOK" || link.platform === "LINKEDIN") &&
        link.status === "READY" &&
        link.shareUrl
      ) {
        window.open(link.shareUrl, "_blank", "noopener,noreferrer");
      }
    }
  }

  async function openShare(link: SocialShareResult) {
    const text = link.caption || caption;
    if (text) {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        /* ignore */
      }
    }
    if (link.shareUrl) {
      window.open(link.shareUrl, "_blank", "noopener,noreferrer");
    }
    if (link.platform === "TIKTOK") {
      setMsg("TikTok ouvert — collez la légende et ajoutez votre vidéo.");
    } else if (link.platform === "INSTAGRAM") {
      setMsg("Instagram ouvert — collez la légende et publiez la photo.");
    } else {
      setMsg(`Partage ${PLATFORM_LABEL[link.platform] || link.platform} ouvert.`);
    }
  }

  function togglePlatform(platform: string) {
    setSelected((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  }

  const list =
    accounts.length > 0
      ? accounts
      : DEFAULT_SELECTED.map((p) => ({
          id: p,
          platform: p,
          label: PLATFORM_LABEL[p] || p,
          enabled: true,
        }));

  return (
    <div
      className={
        compact
          ? "space-y-3 text-right"
          : "space-y-4 border border-[#C9A227]/40 bg-[#C9A227]/5 p-4"
      }
    >
      {!compact ? (
        <>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#C9A227]">
            Publier sur les réseaux
          </p>
          <p className="text-sm text-slate-600">
            La fiche est déjà sur le site. Préparez le partage Facebook, Instagram,
            LinkedIn et TikTok en un clic.
          </p>
        </>
      ) : null}

      <div className={`flex flex-wrap gap-3 ${compact ? "justify-end" : ""}`}>
        {list.map((a) => (
          <label key={a.platform} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selected.includes(a.platform)}
              onChange={() => togglePlatform(a.platform)}
            />
            {a.label || PLATFORM_LABEL[a.platform] || a.platform}
          </label>
        ))}
      </div>

      <div className={`flex flex-wrap gap-2 ${compact ? "justify-end" : ""}`}>
        <Button
          type="button"
          variant="gold"
          size={compact ? "sm" : "default"}
          disabled={pending || !id || selected.length === 0}
          onClick={() => void publish()}
        >
          {pending ? "Préparation…" : "Publier sur les réseaux connectés"}
        </Button>
        {url ? (
          <Button asChild variant="outline" size={compact ? "sm" : "default"}>
            <a href={url} target="_blank" rel="noreferrer">
              Voir sur le site
            </a>
          </Button>
        ) : null}
      </div>

      {msg ? <p className="text-xs text-slate-600">{msg}</p> : null}

      {results.length > 0 ? (
        <div className={`flex flex-wrap gap-2 ${compact ? "justify-end" : ""}`}>
          {results.map((r) =>
            r.shareUrl && r.status === "READY" ? (
              <button
                key={r.platform}
                type="button"
                onClick={() => void openShare(r)}
                className="border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium hover:border-[#C9A227]"
              >
                {PLATFORM_LABEL[r.platform] || r.platform}
              </button>
            ) : (
              <span
                key={r.platform}
                className={`px-3 py-1.5 text-xs font-medium ${
                  r.status === "SENT"
                    ? "border border-emerald-300 bg-emerald-50 text-emerald-800"
                    : r.status === "FAILED"
                      ? "border border-red-200 bg-red-50 text-red-700"
                      : "border border-slate-200 bg-slate-50 text-slate-600"
                }`}
              >
                {PLATFORM_LABEL[r.platform] || r.platform} · {r.status}
              </span>
            )
          )}
        </div>
      ) : null}

      {caption ? (
        <details className="text-left text-xs text-slate-500">
          <summary className="cursor-pointer">Voir / copier la légende</summary>
          <pre className="mt-2 whitespace-pre-wrap border border-slate-200 bg-white p-3 text-slate-700">
            {caption}
          </pre>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(caption);
                setMsg("Légende copiée.");
              } catch {
                setMsg("Impossible de copier automatiquement.");
              }
            }}
          >
            Copier la légende
          </Button>
        </details>
      ) : null}
    </div>
  );
}
