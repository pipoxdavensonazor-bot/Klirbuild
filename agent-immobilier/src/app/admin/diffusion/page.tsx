import { DiffusionAdminClient } from "@/components/admin/diffusion-admin";

export const metadata = { title: "Diffusion · Admin" };

export default function AdminDiffusionPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-12">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-[#C9A227]">Admin</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[#0F172A]">
          Partage réseaux
        </h1>
        <p className="mt-2 max-w-2xl text-slate-500">
          Configurez vos canaux, puis depuis Articles ou Maisons cliquez
          « Publier & partager ». Facebook, LinkedIn, X et WhatsApp s&apos;ouvrent
          dans une fenêtre de partage. Zapier/Make reçoit un webhook.
        </p>
      </div>
      <DiffusionAdminClient />
    </div>
  );
}
