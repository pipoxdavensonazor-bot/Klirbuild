import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

async function safeCount(fn: () => Promise<number>) {
  try {
    return await fn();
  } catch {
    return 0;
  }
}

export default async function AdminDashboard() {
  const [properties, articles, published, openHouses] = await Promise.all([
    safeCount(() => prisma.property.count()),
    safeCount(() => prisma.article.count()),
    safeCount(() => prisma.article.count({ where: { published: true } })),
    safeCount(() => prisma.openHouse.count({ where: { published: true } })),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-12">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-[#C9A227]">Admin</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[#0F172A]">
          Tableau de bord
        </h1>
        <p className="mt-2 text-slate-500">
          Gérez textes, articles, maisons et partages réseaux.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Maisons" value={properties} href="/admin/proprietes" />
        <Stat label="Articles" value={articles} href="/admin/articles" />
        <Stat label="Publiés" value={published} href="/admin/articles" />
        <Stat label="Visites libres" value={openHouses} href="/admin/proprietes" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card
          href="/admin/articles"
          title="Ajouter un article"
          desc="Conseils, actualités — publier sur le site et partager."
        />
        <Card
          href="/admin/proprietes"
          title="Ajouter une maison"
          desc="Créer une annonce, visite libre, puis partager."
        />
        <Card
          href="/admin/textes"
          title="Modifier les textes"
          desc="Slogan, bio, téléphone, courriel…"
        />
        <Card
          href="/admin/diffusion"
          title="Réseaux sociaux"
          desc="Activer Facebook, LinkedIn, WhatsApp, Zapier…"
        />
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

function Card({
  href,
  title,
  desc,
}: {
  href: string;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="border border-slate-200 bg-white p-6 transition-colors hover:border-[#C9A227]"
    >
      <h2 className="font-[family-name:var(--font-display)] text-2xl text-[#0F172A]">
        {title}
      </h2>
      <p className="mt-2 text-sm text-slate-500">{desc}</p>
    </Link>
  );
}
