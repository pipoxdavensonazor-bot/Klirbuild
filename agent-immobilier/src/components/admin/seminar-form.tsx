"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { SocialPublishPanel } from "@/components/admin/social-publish-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SeminarInput = {
  id?: string;
  title?: string;
  slug?: string;
  description?: string;
  imageUrl?: string | null;
  startsAt?: string;
  location?: string;
  capacity?: number;
  registrationOpen?: boolean;
};

function toLocalInputValue(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function SeminarAdminForm({
  initial,
}: {
  initial?: SeminarInput;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(initial?.id || null);
  const [autoSocial, setAutoSocial] = useState(false);
  const [socialKey, setSocialKey] = useState(0);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setMessage(null);
    const fd = new FormData(e.currentTarget);
    const publishSocial = fd.get("publishSocial") === "on";

    const payload = {
      id: initial?.id || savedId || undefined,
      title: String(fd.get("title") || ""),
      slug: String(fd.get("slug") || ""),
      description: String(fd.get("description") || ""),
      imageUrl: String(fd.get("imageUrl") || "") || null,
      startsAt: String(fd.get("startsAt") || ""),
      location: String(fd.get("location") || ""),
      capacity: Number(fd.get("capacity") || 50),
      registrationOpen: fd.get("registrationOpen") === "on",
    };

    const res = await fetch("/api/seminars", {
      method: initial?.id || savedId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setPending(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage(data.error || "Erreur d'enregistrement.");
      return;
    }

    const data = await res.json();
    const id = String(data.id || initial?.id || savedId || "");
    setSavedId(id || null);
    setAutoSocial(publishSocial);
    if (publishSocial) setSocialKey((k) => k + 1);
    setMessage(
      publishSocial
        ? "Événement publié sur le site. Préparation des réseaux…"
        : initial?.id
          ? "Événement mis à jour sur le site."
          : "Événement créé sur le site."
    );
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 border border-slate-200 bg-white p-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="title">Titre</Label>
          <Input
            id="title"
            name="title"
            required
            defaultValue={initial?.title || ""}
            placeholder="Séminaire investisseurs"
          />
        </div>
        <div>
          <Label htmlFor="slug">Slug (URL)</Label>
          <Input
            id="slug"
            name="slug"
            defaultValue={initial?.slug || ""}
            placeholder="seminaire-investisseurs"
          />
        </div>
      </div>
      <RichTextEditor
        name="description"
        label="Description de l'événement"
        defaultValue={initial?.description || ""}
        placeholder="Décrivez l'événement… Ajoutez photos et vidéos."
        enableMedia
      />
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="startsAt">Date et heure</Label>
          <Input
            id="startsAt"
            name="startsAt"
            type="datetime-local"
            required
            defaultValue={toLocalInputValue(initial?.startsAt)}
          />
        </div>
        <div>
          <Label htmlFor="location">Lieu</Label>
          <Input
            id="location"
            name="location"
            required
            defaultValue={initial?.location || ""}
            placeholder="Montréal, QC"
          />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="capacity">Capacité</Label>
          <Input
            id="capacity"
            name="capacity"
            type="number"
            min={1}
            defaultValue={initial?.capacity ?? 50}
          />
        </div>
      </div>
      <ImageUploadField
        name="imageUrl"
        label="Image de couverture"
        defaultValue={initial?.imageUrl || ""}
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="registrationOpen"
          defaultChecked={initial?.registrationOpen !== false}
        />
        Inscriptions ouvertes
      </label>

      <fieldset className="space-y-3 border border-dashed border-[#C9A227]/50 p-4">
        <legend className="px-2 text-sm font-semibold uppercase tracking-[0.2em] text-[#C9A227]">
          Diffusion
        </legend>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            name="publishSocial"
            className="mt-1"
            defaultChecked
          />
          <span>
            Publier aussi sur les réseaux (Facebook, Instagram, LinkedIn, TikTok)
            après la mise en ligne sur le site.
          </span>
        </label>
      </fieldset>

      <Button type="submit" variant="gold" disabled={pending}>
        {pending
          ? "Enregistrement…"
          : initial?.id
            ? "Mettre à jour + diffuser"
            : "Créer l'événement sur le site"}
      </Button>
      {message ? <p className="text-sm text-slate-600">{message}</p> : null}

      {savedId ? (
        <SocialPublishPanel
          key={`${savedId}-${socialKey}`}
          type="seminar"
          id={savedId}
          autoPublish={autoSocial}
        />
      ) : null}
    </form>
  );
}
