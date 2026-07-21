"use client";

import { useState } from "react";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ArticleInput = {
  id?: string;
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  coverUrl?: string | null;
  published?: boolean;
  categorySlug?: string;
};

export function ArticleAdminForm({
  initial,
  onSaved,
}: {
  initial?: ArticleInput;
  onSaved?: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [shareLinks, setShareLinks] = useState<
    Array<{
      platform: string;
      status: string;
      shareUrl?: string;
      caption?: string;
    }>
  >([]);
  const [shareHint, setShareHint] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setMessage(null);
    setShareLinks([]);
    const fd = new FormData(e.currentTarget);
    const published = fd.get("published") === "on";
    const alsoShare = fd.get("alsoShare") === "on";

    const payload = {
      id: initial?.id,
      title: String(fd.get("title") || ""),
      slug: String(fd.get("slug") || ""),
      excerpt: String(fd.get("excerpt") || ""),
      content: String(fd.get("content") || ""),
      coverUrl: String(fd.get("coverUrl") || "") || null,
      published,
      categorySlug: String(fd.get("categorySlug") || "actualites"),
      categoryName:
        String(fd.get("categorySlug") || "actualites") === "conseils"
          ? "Conseils"
          : "Actualités",
    };

    const res = await fetch("/api/articles", {
      method: initial?.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      setPending(false);
      setMessage("Erreur à l'enregistrement.");
      return;
    }

    const article = await res.json();
    let msg = published
      ? "Article publié sur le site."
      : "Brouillon enregistré.";

    if (published && alsoShare) {
      const shareRes = await fetch("/api/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "article", articleId: article.id }),
      });
      if (shareRes.ok) {
        const data = await shareRes.json();
        setShareLinks(data.results || []);
        msg += " Liens de partage prêts.";
      }
    }

    setPending(false);
    setMessage(msg);
    onSaved?.();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 border border-slate-200 bg-white p-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="title">Titre</Label>
          <Input id="title" name="title" defaultValue={initial?.title} required />
        </div>
        <div>
          <Label htmlFor="slug">Slug (URL)</Label>
          <Input
            id="slug"
            name="slug"
            defaultValue={initial?.slug}
            placeholder="ex. conseils-visite-libre"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="categorySlug">Catégorie</Label>
        <select
          id="categorySlug"
          name="categorySlug"
          defaultValue={initial?.categorySlug || "actualites"}
          className="flex h-10 w-full border border-slate-300 bg-white px-3 text-sm"
        >
          <option value="actualites">Actualités / Publication</option>
          <option value="conseils">Conseils</option>
          <option value="achat">Achat</option>
          <option value="vente">Vente</option>
        </select>
      </div>
      <ImageUploadField
        name="coverUrl"
        label="Image de couverture"
        defaultValue={initial?.coverUrl || ""}
      />
      <div>
        <Label htmlFor="excerpt">Résumé (fil d&apos;actualité)</Label>
        <Textarea
          id="excerpt"
          name="excerpt"
          defaultValue={initial?.excerpt}
          rows={2}
          required
        />
      </div>
      <div>
        <Label htmlFor="content">Contenu</Label>
        <Textarea
          id="content"
          name="content"
          defaultValue={initial?.content}
          rows={10}
          required
        />
      </div>
      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="published"
            defaultChecked={initial?.published ?? true}
          />
          Publier sur le site (fil d&apos;actualité + blog)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="alsoShare" defaultChecked />
          Préparer le partage réseaux
        </label>
      </div>
      <Button type="submit" variant="gold" disabled={pending}>
        {pending ? "Enregistrement…" : initial?.id ? "Mettre à jour" : "Créer l'article"}
      </Button>
      {message ? <p className="text-sm text-slate-600">{message}</p> : null}
      {shareLinks.length > 0 ? (
        <div className="space-y-2 border-t border-slate-100 pt-4">
          <p className="text-sm font-medium text-[#0F172A]">Partager maintenant :</p>
          {shareHint ? <p className="text-xs text-slate-500">{shareHint}</p> : null}
          <div className="flex flex-wrap gap-2">
            {shareLinks
              .filter((l) => l.shareUrl)
              .map((l) => (
                <button
                  key={l.platform}
                  type="button"
                  className="border border-[#C9A227]/50 px-3 py-1.5 text-sm text-[#0F172A] hover:bg-[#C9A227]/10"
                  onClick={async () => {
                    if (l.caption) {
                      try {
                        await navigator.clipboard.writeText(l.caption);
                      } catch {
                        /* ignore */
                      }
                    }
                    if (l.shareUrl) {
                      window.open(l.shareUrl, "_blank", "noopener,noreferrer");
                    }
                    setShareHint(
                      l.platform === "TIKTOK"
                        ? "TikTok ouvert. Collez la légende (déjà copiée) et publiez votre vidéo."
                        : l.platform === "INSTAGRAM"
                          ? "Instagram ouvert. Collez la légende déjà copiée."
                          : "Fenêtre de partage ouverte."
                    );
                  }}
                >
                  {l.platform === "TIKTOK"
                    ? "TikTok"
                    : l.platform === "INSTAGRAM"
                      ? "Instagram"
                      : l.platform}
                </button>
              ))}
          </div>
        </div>
      ) : null}
    </form>
  );
}
