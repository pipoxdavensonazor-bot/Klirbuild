"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ContactForm({
  propertyId,
  defaultSubject,
}: {
  propertyId?: string;
  defaultSubject?: string;
}) {
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        email: fd.get("email"),
        phone: fd.get("phone"),
        subject: fd.get("subject"),
        body: fd.get("body"),
        propertyId: propertyId || undefined,
      }),
    });
    setPending(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Envoi impossible.");
      return;
    }
    setDone(true);
    (e.target as HTMLFormElement).reset();
  }

  if (done) {
    return (
      <div className="border border-[#C9A227]/40 bg-[#C9A227]/10 p-6 text-[#0F172A]">
        <p className="font-medium">Message envoyé.</p>
        <p className="mt-2 text-sm text-slate-600">
          Léonne vous contactera sous peu. Merci de votre confiance.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => setDone(false)}
        >
          Envoyer un autre message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 border border-slate-200 bg-white p-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="name">Nom</Label>
          <Input id="name" name="name" required />
        </div>
        <div>
          <Label htmlFor="email">Courriel</Label>
          <Input id="email" name="email" type="email" required />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="phone">Téléphone</Label>
          <Input id="phone" name="phone" type="tel" />
        </div>
        <div>
          <Label htmlFor="subject">Sujet</Label>
          <Input
            id="subject"
            name="subject"
            defaultValue={defaultSubject || "Demande d'information"}
            required
          />
        </div>
      </div>
      <div>
        <Label htmlFor="body">Message</Label>
        <Textarea id="body" name="body" rows={5} required />
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button type="submit" variant="gold" disabled={pending}>
        {pending ? "Envoi…" : "Envoyer"}
      </Button>
    </form>
  );
}
