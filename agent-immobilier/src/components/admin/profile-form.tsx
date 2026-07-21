"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploadField } from "@/components/admin/image-upload-field";

type ProfileFields = {
  name: string;
  title: string;
  slogan: string;
  bio: string;
  story: string;
  experience: string;
  mission: string;
  values: string;
  languages: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  photoUrl: string;
};

export function ProfileAdminForm({ initial }: { initial: ProfileFields }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setMessage(null);
    const fd = new FormData(e.currentTarget);
    const payload: Record<string, string> = {};
    for (const key of Object.keys(initial) as (keyof ProfileFields)[]) {
      payload[key] = String(fd.get(key) || "");
    }
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setPending(false);
    setMessage(res.ok ? "Textes enregistrés." : "Erreur à l'enregistrement.");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 border border-slate-200 bg-white p-6">
      {(
        [
          ["name", "Nom"],
          ["title", "Titre"],
          ["phone", "Téléphone"],
          ["email", "Courriel"],
          ["address", "Adresse"],
          ["city", "Ville"],
        ] as const
      ).map(([key, label]) => (
        <div key={key}>
          <Label htmlFor={key}>{label}</Label>
          <Input id={key} name={key} defaultValue={initial[key]} required />
        </div>
      ))}

      <ImageUploadField
        name="photoUrl"
        label="Photo d'accueil"
        defaultValue={initial.photoUrl}
      />

      {(
        [
          ["slogan", "Slogan"],
          ["bio", "Bio (accueil)"],
          ["story", "Histoire"],
          ["experience", "Expérience"],
          ["mission", "Mission"],
          ["values", "Valeurs"],
          ["languages", "Langues"],
        ] as const
      ).map(([key, label]) => (
        <div key={key}>
          <Label htmlFor={key}>{label}</Label>
          <Textarea id={key} name={key} defaultValue={initial[key]} rows={3} required />
        </div>
      ))}
      <Button type="submit" variant="gold" disabled={pending}>
        {pending ? "Enregistrement…" : "Enregistrer les textes"}
      </Button>
      {message ? <p className="text-sm text-slate-600">{message}</p> : null}
    </form>
  );
}
