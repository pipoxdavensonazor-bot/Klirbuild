"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { RichTextEditor } from "@/components/admin/rich-text-editor";

type ProfileFields = {
  name: string;
  title: string;
  slogan: string;
  bio: string;
  story: string;
  experience: string;
  degrees: string;
  certifications: string;
  awards: string;
  mission: string;
  values: string;
  languages: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  whatsapp: string;
  facebook: string;
  instagram: string;
  linkedin: string;
  photoUrl: string;
};

const RICH_FIELDS = [
  ["slogan", "Slogan"],
  ["bio", "Bio (accueil)"],
  ["story", "Histoire"],
  ["experience", "Expérience"],
  ["degrees", "Formation / diplômes"],
  ["certifications", "Certifications / permis"],
  ["awards", "Reconnaissances"],
  ["mission", "Mission"],
  ["values", "Valeurs"],
  ["languages", "Langues"],
] as const;

const CONTACT_FIELDS = [
  ["name", "Nom"],
  ["title", "Titre"],
  ["phone", "Téléphone"],
  ["email", "Courriel"],
  ["whatsapp", "WhatsApp (numéro ou lien)"],
  ["address", "Adresse"],
  ["city", "Ville"],
] as const;

const SOCIAL_FIELDS = [
  ["facebook", "Facebook (URL)"],
  ["instagram", "Instagram (URL)"],
  ["linkedin", "LinkedIn (URL)"],
] as const;

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
    setMessage(res.ok ? "Profil enregistré." : "Erreur à l'enregistrement.");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8 border border-slate-200 bg-white p-6">
      <section className="space-y-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#C9A227]">
          Coordonnées
        </h2>
        {CONTACT_FIELDS.map(([key, label]) => (
          <div key={key}>
            <Label htmlFor={key}>{label}</Label>
            <Input id={key} name={key} defaultValue={initial[key]} required={key !== "whatsapp"} />
          </div>
        ))}
        <ImageUploadField
          name="photoUrl"
          label="Photo d'accueil"
          defaultValue={initial.photoUrl}
        />
      </section>

      <section className="space-y-5 border-t border-slate-100 pt-6">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#C9A227]">
          Réseaux sociaux
        </h2>
        {SOCIAL_FIELDS.map(([key, label]) => (
          <div key={key}>
            <Label htmlFor={key}>{label}</Label>
            <Input
              id={key}
              name={key}
              type="url"
              defaultValue={initial[key]}
              placeholder="https://…"
            />
          </div>
        ))}
      </section>

      <section className="space-y-6 border-t border-slate-100 pt-6">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#C9A227]">
          Textes enrichis
        </h2>
        <p className="text-sm text-slate-500">
          Mise en forme type Word (gras, listes, titres, liens…).
        </p>
        {RICH_FIELDS.map(([key, label]) => (
          <RichTextEditor
            key={key}
            name={key}
            label={label}
            defaultValue={initial[key]}
            placeholder={`Rédigez le texte « ${label} »…`}
          />
        ))}
      </section>

      <Button type="submit" variant="gold" disabled={pending}>
        {pending ? "Enregistrement…" : "Enregistrer le profil"}
      </Button>
      {message ? <p className="text-sm text-slate-600">{message}</p> : null}
    </form>
  );
}
