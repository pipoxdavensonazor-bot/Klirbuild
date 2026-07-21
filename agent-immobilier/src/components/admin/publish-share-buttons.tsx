"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

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
  const [links, setLinks] = useState<
    Array<{ platform: string; shareUrl?: string; status: string }>
  >([]);
  const [msg, setMsg] = useState<string | null>(null);

  async function publishAndShare() {
    setPending(true);
    setMsg(null);
    setLinks([]);

    if (type === "article" && !published) {
      // ensure published via social endpoint (it publishes)
    }

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
              <a
                key={l.platform}
                href={l.shareUrl}
                target="_blank"
                rel="noreferrer"
                className="border border-slate-300 px-2 py-1 text-xs hover:border-[#C9A227]"
              >
                {l.platform}
              </a>
            ))}
        </div>
      ) : null}
    </div>
  );
}
