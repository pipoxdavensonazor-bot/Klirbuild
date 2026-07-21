"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setMessage(null);
    const fd = new FormData(e.currentTarget);

    const payload = {
      id: initial?.id,
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
      method: initial?.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setPending(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage(data.error || "Erreur d'enregistrement.");
      return;
    }

    setMessage(initial?.id ? "Événement mis à jour." : "Événement créé.");
    if (!initial?.id) {
      (e.target as HTMLFormElement).reset();
    }
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
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          rows={5}
          required
          defaultValue={initial?.description || ""}
        />
      </div>
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
        label="Image de l'événement"
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
      <Button type="submit" variant="gold" disabled={pending}>
        {pending
          ? "Enregistrement…"
          : initial?.id
            ? "Mettre à jour"
            : "Créer l'événement"}
      </Button>
      {message ? <p className="text-sm text-slate-600">{message}</p> : null}
    </form>
  );
}
