import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Admin" };

export default async function AdminDashboard() {
  const [properties, articles, openHouses] = await Promise.all([
    prisma.property.count(),
    prisma.article.count({ where: { published: true } }),
    prisma.openHouse.count({ where: { published: true } }),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-12">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-[#C9A227]">Admin</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[#0F172A]">
          Tableau de bord
        </h1>
        <p className="mt-2 text-slate-500">
          Modifiez les textes du site et ajoutez vos maisons / visites libres.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Maisons" value={properties} href="/admin/proprietes" />
        <Stat label="Articles publiés" value={articles} href="/admin/textes" />
        <Stat label="Visites libres" value={openHouses} href="/admin/proprietes" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link
          href="/admin/textes"
          className="border border-slate-200 bg-white p-6 transition-colors hover:border-[#C9A227]"
        >
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-[#0F172A]">
            Modifier les textes
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Slogan, bio, mission, téléphone, courriel, adresse…
          </p>
        </Link>
        <Link
          href="/admin/proprietes"
          className="border border-slate-200 bg-white p-6 transition-colors hover:border-[#C9A227]"
        >
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-[#0F172A]">
            Ajouter une maison
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Créer une annonce, prix, photos et visite libre.
          </p>
        </Link>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link href={href} className="border border-slate-200 bg-white p-5 hover:border-[#C9A227]">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[#0F172A]">
        {value}
      </p>
    </Link>
  );
}
