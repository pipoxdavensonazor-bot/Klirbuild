import Image from "next/image";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "À propos" };

export default async function AboutPage() {
  const profile = await prisma.profile.findFirst();
  if (!profile) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <p>Profil à configurer. Lancez le seed de la base de données.</p>
      </div>
    );
  }

  return (
    <div>
      <section className="bg-[#0F172A] py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs uppercase tracking-[0.3em] text-[#C9A227]">À propos</p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl sm:text-5xl">
            {profile.name}
          </h1>
          <p className="mt-3 max-w-2xl text-slate-300">{profile.title}</p>
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-5 lg:px-8">
        <div className="lg:col-span-2">
          <div className="relative aspect-[4/5] overflow-hidden bg-[#0B1220]">
            <Image
              src="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=1200&q=80"
              alt={`${profile.name} — 20 ans de carrière`}
              fill
              className="object-cover object-top"
              sizes="40vw"
              priority
            />
          </div>
        </div>
        <div className="space-y-8 lg:col-span-3">
          <p className="text-lg leading-relaxed text-slate-600">{profile.bio}</p>
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl text-[#0F172A]">
              Mon histoire
            </h2>
            <p className="mt-2 whitespace-pre-line text-slate-600">{profile.story}</p>
          </div>
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl text-[#0F172A]">
              Mission
            </h2>
            <p className="mt-2 text-slate-600">{profile.mission}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
