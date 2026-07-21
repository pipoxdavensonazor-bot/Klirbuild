"use client";

import { useState } from "react";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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
  imageUrl?: string;
};

export function PropertyAdminForm({
  initial,
  onSaved,
}: {
  initial?: PropertyInput;
  onSaved?: () => void;
}) {
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
      address: String(fd.get("address") || ""),
      city: String(fd.get("city") || ""),
      price: Number(fd.get("price") || 0),
      type: String(fd.get("type") || "HOUSE"),
      bedrooms: Number(fd.get("bedrooms") || 0),
      bathrooms: Number(fd.get("bathrooms") || 0),
      areaSqft: Number(fd.get("areaSqft") || 0),
      status: String(fd.get("status") || "AVAILABLE"),
      featured: fd.get("featured") === "on",
      imageUrl: String(fd.get("imageUrl") || ""),
      openHouse: {
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
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6 border border-slate-200 p-6">
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
        label="Photo de la propriété"
        defaultValue={initial?.imageUrl || ""}
      />
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={initial?.description}
          required
        />
      </div>
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
          <Label htmlFor="price">Prix</Label>
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
          <Input id="type" name="type" defaultValue={initial?.type ?? "HOUSE"} />
        </div>
        <div>
          <Label htmlFor="status">Statut</Label>
          <Input id="status" name="status" defaultValue={initial?.status ?? "AVAILABLE"} />
        </div>
        <div className="flex items-end gap-2 pb-2">
          <input
            id="featured"
            name="featured"
            type="checkbox"
            defaultChecked={initial?.featured}
          />
          <Label htmlFor="featured">En vedette</Label>
        </div>
      </div>

      <fieldset className="space-y-4 border border-dashed border-[#C9A227]/50 p-4">
        <legend className="px-2 text-sm font-semibold uppercase tracking-[0.2em] text-[#C9A227]">
          Visite libre
        </legend>
        <p className="text-sm text-slate-500">
          Publiez une porte ouverte dans le fil d&apos;actualité de l&apos;accueil.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="ohStartsAt">Début</Label>
            <Input id="ohStartsAt" name="ohStartsAt" type="datetime-local" />
          </div>
          <div>
            <Label htmlFor="ohEndsAt">Fin</Label>
            <Input id="ohEndsAt" name="ohEndsAt" type="datetime-local" />
          </div>
        </div>
        <div>
          <Label htmlFor="ohNotes">Notes (optionnel)</Label>
          <Textarea
            id="ohNotes"
            name="ohNotes"
            placeholder="Ex. Stationnement sur place, sans rendez-vous…"
          />
        </div>
        <div className="flex items-center gap-2">
          <input id="ohPublished" name="ohPublished" type="checkbox" defaultChecked />
          <Label htmlFor="ohPublished">Publier dans le fil d&apos;actualité</Label>
        </div>
      </fieldset>

      <Button type="submit" variant="gold" disabled={pending}>
        {pending ? "Enregistrement…" : "Enregistrer"}
      </Button>
      {message ? <p className="text-sm text-slate-600">{message}</p> : null}
    </form>
  );
}
