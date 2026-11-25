"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Review = {
  id: string;
  name: string;
  role: string | null;
  content: string;
  rating: number;
};

export function PropertyReviews({
  propertyId,
  propertyTitle,
}: {
  propertyId: string;
  propertyTitle: string;
}) {
  const [items, setItems] = useState<Review[] | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/property-reviews?propertyId=${encodeURIComponent(propertyId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setItems(Array.isArray(data.items) ? data.items : []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [propertyId]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setMessage(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const res = await fetch("/api/property-reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        propertyId,
        website: String(fd.get("website") || ""),
        name: String(fd.get("name") || ""),
        role: String(fd.get("role") || ""),
        rating: Number(fd.get("rating") || 5),
        content: String(fd.get("content") || ""),
      }),
    });
    setPending(false);
    if (!res.ok) {
      setMessage("Impossible d'envoyer l'avis. Réessayez.");
      return;
    }
    form.reset();
    setMessage("Merci. Votre avis sera publié après validation.");
  }

  return (
    <section className="mt-14 border-t border-slate-200 pt-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#C9A227]">
            Avis &amp; feedback
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl text-[#0F172A]">
            Ce qu’en disent les visiteurs
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Partagez votre impression sur {propertyTitle}. Les avis sont publiés
            après validation.
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-4">
        {items === null ? (
          <p className="text-sm text-slate-400">Chargement des avis…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-slate-400">
            Soyez le premier à laisser un avis sur cette propriété.
          </p>
        ) : (
          items.map((item) => (
            <blockquote key={item.id} className="border border-slate-200 bg-white p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-[#C9A227]">
                {"★".repeat(item.rating)}
              </p>
              <p className="mt-3 text-sm text-slate-600">&ldquo;{item.content}&rdquo;</p>
              <footer className="mt-3 text-sm font-medium text-[#0F172A]">
                {item.name}
                {item.role ? (
                  <span className="block font-normal text-slate-500">{item.role}</span>
                ) : null}
              </footer>
            </blockquote>
          ))
        )}
      </div>

      <div className="mt-10">
        <h3 className="font-[family-name:var(--font-display)] text-xl text-[#0F172A]">
          Laisser un avis
        </h3>
        <form onSubmit={onSubmit} className="mt-4 space-y-4 border border-slate-200 bg-white p-5">
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            className="hidden"
            aria-hidden="true"
            name="website"
          />
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor={`rev-name-${propertyId}`}>Votre nom</Label>
              <Input
                id={`rev-name-${propertyId}`}
                required
                minLength={2}
                placeholder="Marie D."
                name="name"
              />
            </div>
            <div>
              <Label htmlFor={`rev-role-${propertyId}`}>Contexte (optionnel)</Label>
              <Input
                id={`rev-role-${propertyId}`}
                placeholder="Visite libre · acheteur potentiel"
                name="role"
              />
            </div>
          </div>
          <div>
            <Label htmlFor={`rev-rating-${propertyId}`}>Note</Label>
            <select
              id={`rev-rating-${propertyId}`}
              name="rating"
              defaultValue="5"
              className="flex h-10 w-full max-w-xs border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#C9A227]"
            >
              <option value="5">5 — Excellent</option>
              <option value="4">4 — Très bien</option>
              <option value="3">3 — Bien</option>
              <option value="2">2 — Moyen</option>
              <option value="1">1 — Décevant</option>
            </select>
          </div>
          <div>
            <Label htmlFor={`rev-content-${propertyId}`}>Votre avis</Label>
            <Textarea
              id={`rev-content-${propertyId}`}
              name="content"
              rows={4}
              required
              minLength={10}
              placeholder="Ce que vous avez aimé, questions, impression générale…"
            />
          </div>
          <Button type="submit" variant="gold" disabled={pending}>
            {pending ? "Envoi…" : "Publier mon avis"}
          </Button>
          {message ? <p className="text-sm text-slate-600">{message}</p> : null}
        </form>
      </div>
    </section>
  );
}
