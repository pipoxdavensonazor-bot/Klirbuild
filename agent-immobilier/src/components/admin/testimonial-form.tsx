"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DeleteButton } from "@/components/admin/delete-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Item = {
  id?: string;
  name: string;
  role?: string | null;
  content: string;
  rating: number;
  featured: boolean;
  approved: boolean;
};

export function TestimonialForm({
  initial,
  onSaved,
}: {
  initial?: Item;
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
    const payload = {
      id: initial?.id,
      name: String(fd.get("name") || ""),
      role: String(fd.get("role") || "") || null,
      content: String(fd.get("content") || ""),
      rating: Number(fd.get("rating") || 5),
      featured: fd.get("featured") === "on",
      approved: fd.get("approved") === "on",
    };
    const res = await fetch("/api/testimonials", {
      method: initial?.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setPending(false);
    if (!res.ok) {
      setMessage("Erreur à l'enregistrement.");
      return;
    }
    setMessage("Témoignage enregistré.");
    if (!initial?.id) (e.target as HTMLFormElement).reset();
    onSaved?.();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 border border-slate-200 bg-white p-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="name">Nom du client</Label>
          <Input id="name" name="name" defaultValue={initial?.name} required />
        </div>
        <div>
          <Label htmlFor="role">Rôle / contexte</Label>
          <Input
            id="role"
            name="role"
            defaultValue={initial?.role || ""}
            placeholder="Acheteur à Laval"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="content">Témoignage</Label>
        <Textarea
          id="content"
          name="content"
          rows={4}
          defaultValue={initial?.content}
          required
        />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <Label htmlFor="rating">Note (1–5)</Label>
          <Input
            id="rating"
            name="rating"
            type="number"
            min={1}
            max={5}
            defaultValue={initial?.rating ?? 5}
          />
        </div>
        <label className="flex items-end gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            name="approved"
            defaultChecked={initial?.approved ?? true}
          />
          Approuvé (visible)
        </label>
        <label className="flex items-end gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            name="featured"
            defaultChecked={initial?.featured ?? true}
          />
          En vedette (accueil)
        </label>
      </div>
      <Button type="submit" variant="gold" disabled={pending}>
        {pending ? "…" : initial?.id ? "Mettre à jour" : "Ajouter"}
      </Button>
      {message ? <p className="text-sm text-slate-600">{message}</p> : null}
    </form>
  );
}

export function TestimonialRow({ item }: { item: Item & { id: string } }) {
  return (
    <div className="border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#C9A227]">
            {"★".repeat(item.rating)} ·{" "}
            {item.approved ? "Approuvé" : "En attente"}
            {item.featured ? " · Vedette" : ""}
          </p>
          <h3 className="mt-1 font-medium text-[#0F172A]">{item.name}</h3>
          {item.role ? <p className="text-sm text-slate-500">{item.role}</p> : null}
          <p className="mt-2 text-sm text-slate-600">&ldquo;{item.content}&rdquo;</p>
        </div>
        <DeleteButton
          endpoint="/api/testimonials"
          id={item.id}
          label={item.name}
          confirmLabel={`Supprimer le témoignage de ${item.name} ?`}
        />
      </div>
      <details className="mt-4">
        <summary className="cursor-pointer text-sm text-slate-600">Modifier</summary>
        <div className="mt-4">
          <TestimonialForm initial={item} />
        </div>
      </details>
    </div>
  );
}
