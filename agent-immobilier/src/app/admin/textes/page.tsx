import { prisma } from "@/lib/prisma";
import { ProfileAdminForm } from "@/components/admin/profile-form";

export const metadata = { title: "Textes · Admin" };

export default async function AdminTextsPage() {
  const profile = await prisma.profile.findFirst();
  if (!profile) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <p>Aucun profil. Lancez le seed de la base.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-12">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-[#C9A227]">Admin</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[#0F172A]">
          Modifier les textes
        </h1>
        <p className="mt-2 text-slate-500">
          Ces textes apparaissent sur l&apos;accueil, À propos et Contact.
        </p>
      </div>
      <ProfileAdminForm
        initial={{
          name: profile.name,
          title: profile.title,
          slogan: profile.slogan,
          bio: profile.bio,
          story: profile.story,
          experience: profile.experience,
          mission: profile.mission,
          values: profile.values,
          languages: profile.languages,
          phone: profile.phone,
          email: profile.email,
          address: profile.address,
          city: profile.city,
          photoUrl: profile.photoUrl,
        }}
      />
    </div>
  );
}
