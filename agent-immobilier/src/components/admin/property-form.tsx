"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PropertyInput = {
  id?: string;
  title?: string;
  slug?: string;
  description?: string;
  address?: string;
  city?: string;
  price?: number;
  type?: string;
  bedrooms?: number;
  bathrooms?: number;
  areaSqft?: number;
  status?: string;
  featured?: boolean;
  garage?: boolean;
  imageUrl?: string;
  videoUrl?: string | null;
  openHouse?: {
    startsAt?: string;
    endsAt?: string;
    notes?: string | null;
    published?: boolean;
  } | null;
};

function toLocalInputValue(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function PropertyAdminForm({
  initial,
  onSaved,
}: {
  initial?: PropertyInput;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setMessage(null);
    const fd = new FormData(e.currentTarget);
    const clearOh = fd.get("ohClear") === "on";
    const payload = {
      id: initial?.id,
      title: String(fd.get("title") || ""),
      slug: String(fd.get("slug") || ""),
      description: String(fd.get("description") || ""),
      address: String(fd.get("address") || ""),
      city: String(fd.get("city") || ""),
      price: Number(fd.get("price") || 0),
      type: String(fd.get("type") || "HOUSE"),
      bedrooms: Number(fd.get("bedrooms") || 0),
      bathrooms: Number(fd.get("bathrooms") || 0),
      areaSqft: Number(fd.get("areaSqft") || 0),
      status: String(fd.get("status") || "AVAILABLE"),
      featured: fd.get("featured") === "on",
      garage: fd.get("garage") === "on",
      imageUrl: String(fd.get("imageUrl") || ""),
      videoUrl: String(fd.get("videoUrl") || "") || null,
      openHouse: clearOh
        ? { clear: true }
        : {
            startsAt: String(fd.get("ohStartsAt") || ""),
            endsAt: String(fd.get("ohEndsAt") || ""),
            notes: String(fd.get("ohNotes") || ""),
            published: fd.get("ohPublished") === "on",
          },
    };

    const res = await fetch("/api/properties", {
      method: initial?.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setPending(false);
    if (!res.ok) {
      setMessage("Erreur à l'enregistrement.");
      return;
    }
    setMessage("Propriété enregistrée.");
    onSaved?.();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6 border border-slate-200 bg-white p-6">
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
            placeholder="ex. maison-blainville-27e"
            required={!initial?.id}
          />
        </div>
      </div>
      <ImageUploadField
        name="imageUrl"
        label="Photo principale"
        defaultValue={initial?.imageUrl || ""}
      />
      <div>
        <Label htmlFor="videoUrl">Vidéo (URL /api/media/… ou YouTube)</Label>
        <Input
          id="videoUrl"
          name="videoUrl"
          defaultValue={initial?.videoUrl || ""}
          placeholder="/api/media/… ou https://…"
        />
      </div>
      <RichTextEditor
        name="description"
        label="Description"
        defaultValue={initial?.description || ""}
        placeholder="Décrivez la propriété…"
        enableMedia
      />
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="address">Adresse</Label>
          <Input id="address" name="address" defaultValue={initial?.address} required />
        </div>
        <div>
          <Label htmlFor="city">Ville</Label>
          <Input id="city" name="city" defaultValue={initial?.city} required />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <div>
          <Label htmlFor="price">Prix ($)</Label>
          <Input
            id="price"
            name="price"
            type="number"
            defaultValue={initial?.price}
            required
          />
        </div>
        <div>
          <Label htmlFor="bedrooms">Chambres</Label>
          <Input
            id="bedrooms"
            name="bedrooms"
            type="number"
            defaultValue={initial?.bedrooms ?? 3}
          />
        </div>
        <div>
          <Label htmlFor="bathrooms">Salles de bain</Label>
          <Input
            id="bathrooms"
            name="bathrooms"
            type="number"
            step="0.5"
            defaultValue={initial?.bathrooms ?? 1}
          />
        </div>
        <div>
          <Label htmlFor="areaSqft">Superficie (pi²)</Label>
          <Input
            id="areaSqft"
            name="areaSqft"
            type="number"
            defaultValue={initial?.areaSqft ?? 1000}
          />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <Label htmlFor="type">Type</Label>
          <select
            id="type"
            name="type"
            defaultValue={initial?.type ?? "HOUSE"}
            className="flex h-10 w-full border border-slate-300 bg-white px-3 text-sm"
          >
            <option value="HOUSE">Maison</option>
            <option value="CONDO">Condo</option>
            <option value="TOWNHOUSE">Maison de ville</option>
            <option value="LAND">Terrain</option>
            <option value="COMMERCIAL">Commercial</option>
          </select>
        </div>
        <div>
          <Label htmlFor="status">Statut</Label>
          <select
            id="status"
            name="status"
            defaultValue={initial?.status ?? "AVAILABLE"}
            className="flex h-10 w-full border border-slate-300 bg-white px-3 text-sm"
          >
            <option value="AVAILABLE">À vendre</option>
            <option value="PENDING">Sous offre / conditional</option>
            <option value="SOLD">Vendue</option>
          </select>
        </div>
        <div className="flex flex-col justify-end gap-2 pb-1">
          <label className="flex items-center gap-2 text-sm">
            <input
              id="featured"
              name="featured"
              type="checkbox"
              defaultChecked={initial?.featured}
            />
            En vedette (accueil)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              id="garage"
              name="garage"
              type="checkbox"
              defaultChecked={initial?.garage}
            />
            Garage
          </label>
        </div>
      </div>

      <fieldset className="space-y-4 border border-dashed border-[#C9A227]/50 p-4">
        <legend className="px-2 text-sm font-semibold uppercase tracking-[0.2em] text-[#C9A227]">
          Visite libre
        </legend>
        <p className="text-sm text-slate-500">
          Affichée sur la fiche et dans le fil d&apos;actualité.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="ohStartsAt">Début</Label>
            <Input
              id="ohStartsAt"
              name="ohStartsAt"
              type="datetime-local"
              defaultValue={toLocalInputValue(initial?.openHouse?.startsAt)}
            />
          </div>
          <div>
            <Label htmlFor="ohEndsAt">Fin</Label>
            <Input
              id="ohEndsAt"
              name="ohEndsAt"
              type="datetime-local"
              defaultValue={toLocalInputValue(initial?.openHouse?.endsAt)}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="ohNotes">Notes (optionnel)</Label>
          <Input
            id="ohNotes"
            name="ohNotes"
            defaultValue={initial?.openHouse?.notes || ""}
            placeholder="Ex. Stationnement sur place…"
          />
        </div>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              id="ohPublished"
              name="ohPublished"
              type="checkbox"
              defaultChecked={initial?.openHouse?.published !== false}
            />
            Publier dans le fil d&apos;actualité
          </label>
          {initial?.openHouse?.startsAt ? (
            <label className="flex items-center gap-2 text-sm text-red-700">
              <input id="ohClear" name="ohClear" type="checkbox" />
              Supprimer la visite libre
            </label>
          ) : null}
        </div>
      </fieldset>

      <Button type="submit" variant="gold" disabled={pending}>
        {pending ? "Enregistrement…" : "Enregistrer"}
      </Button>
      {message ? <p className="text-sm text-slate-600">{message}</p> : null}
    </form>
  );
}
