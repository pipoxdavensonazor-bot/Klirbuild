import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PropertyCard } from "@/components/properties/property-card";
import { HomeFeed } from "@/components/home/home-feed";
import { SiteImage } from "@/components/ui/site-image";
import { RichHtml } from "@/components/ui/rich-html";
import { prisma } from "@/lib/prisma";
import { buildHomeFeed } from "@/lib/home-feed";
import { whatsappLink, centrisListingsUrl } from "@/lib/utils";
import {
  PORTRAIT_CAREER,
  PORTRAIT_HERO,
  resolvePublicPhotoUrl,
} from "@/lib/photos";

const careerHighlights = [
  {
    value: "20 ans",
    label: "d'expérience",
    detail: "Accompagnement d'acheteurs, vendeurs et investisseurs",
  },
  {
    value: "340+",
    label: "transactions",
    detail: "Mandats conclus avec rigueur et discrétion",
  },
  {
    value: "5★",
    label: "confiance client",
    detail: "Relations humaines, conseils justes, résultats concrets",
  },
];

export default async function HomePage() {
  const [profile, featured, testimonials, feed] = await Promise.all([
    prisma.profile.findFirst(),
    prisma.property.findMany({
      where: { status: { in: ["AVAILABLE", "PENDING"] }, featured: true },
      include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
      take: 3,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.testimonial.findMany({
      where: { featured: true, approved: true },
      take: 3,
      orderBy: { createdAt: "desc" },
    }),
    buildHomeFeed(12),
  ]);

  const name = profile?.name ?? "Léonne Bien-Aimé";
  const slogan =
    profile?.slogan ??
    "Des conseils justes. Des résultats concrets.\nHumain et chaleureux.";
  const title = profile?.title ?? "Courtière immobilière résidentielle";
  const photoHero = resolvePublicPhotoUrl(profile?.photoUrl, PORTRAIT_HERO);

  return (
    <>
      <section className="relative min-h-[100svh] overflow-hidden bg-[#0B1220]">
        {/* Photo à 60 % — maximum de recul, ancrée à droite */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-end">
          <div className="relative h-[100%] w-[60%] max-w-[60%]">
            <SiteImage
              src={photoHero}
              alt={`${name} — courtière immobilière`}
              fill
              priority
              className="object-cover object-[50%_18%] sm:object-[48%_16%] lg:object-[45%_14%]"
              sizes="60vw"
            />
            {/* Fondu vers le fond à gauche pour coller au texte */}
            <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-[#0B1220] to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-[#0B1220] to-transparent" />
            <div className="absolute inset-x-0 top-0 h-1/6 bg-gradient-to-b from-[#0B1220]/40 to-transparent" />
          </div>
        </div>
        {/* Zone texte lisible à gauche */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B1220] from-0% via-[#0B1220]/85 via-[42%] to-transparent to-[70%]" />

        <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-md py-24 text-white sm:max-w-lg sm:py-28 lg:max-w-xl">
            <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.4em] text-[#C9A227]">
              Courtage immobilier · Laval · Laurentides · Lanaudière
            </p>
            <h1 className="font-[family-name:var(--font-display)] text-4xl leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              {name}
            </h1>
            <p className="mt-4 text-sm font-medium uppercase tracking-[0.22em] text-slate-300">
              {title}
            </p>
            <RichHtml
              html={slogan}
              className="mt-8 max-w-md text-lg text-slate-200 sm:text-xl [&_a]:text-[#C9A227] [&_p]:mb-2 [&_p:last-child]:mb-0"
            />
            <div className="mt-10 flex flex-wrap gap-4">
              <Button asChild variant="gold" size="lg">
                <Link href="/proprietes">Voir les propriétés</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-white/70 text-white hover:bg-white hover:text-[#0F172A]"
              >
                <Link href="/contact">Prendre rendez-vous</Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                size="lg"
                className="text-slate-200 hover:bg-white/10 hover:text-white"
              >
                <a href={centrisListingsUrl()} target="_blank" rel="noopener noreferrer">
                  Annonces Centris
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl divide-y divide-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {careerHighlights.map((item) => (
            <div key={item.label} className="px-6 py-10 text-center sm:px-8">
              <p className="font-[family-name:var(--font-display)] text-3xl text-[#0F172A] sm:text-4xl">
                {item.value}
              </p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.25em] text-[#C9A227]">
                {item.label}
              </p>
              <p className="mx-auto mt-3 max-w-xs text-sm text-slate-500">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Fil d'actualité unifié */}
      <section className="bg-[#F8FAFC] py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[#C9A227]">
                Fil d&apos;actualité
              </p>
              <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[#0F172A] sm:text-4xl">
                Actualités, conseils & événements
              </h2>
              <p className="mt-3 max-w-2xl text-slate-500">
                Publications, articles, conseils d&apos;experte, séminaires et
                visites libres — tout au même endroit.
              </p>
            </div>
            <Button asChild variant="link">
              <Link href="/blog">Voir le blog</Link>
            </Button>
          </div>
          <HomeFeed items={feed} />
        </div>
      </section>

      <section className="relative overflow-hidden bg-white py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-6 px-4 sm:px-6 lg:grid-cols-2 lg:gap-10 lg:px-8">
          <div className="relative aspect-[4/5] overflow-hidden bg-[#0B1220]">
            <Image
              src={PORTRAIT_CAREER}
              alt={`${name} — 20 ans de carrière`}
              fill
              className="object-cover object-[center_12%]"
              sizes="45vw"
            />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-[#C9A227]">La carrière</p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl text-[#0F172A] sm:text-4xl">
              Une présence solide.
              <br />
              Une approche humaine.
            </h2>
            <RichHtml
              html={
                profile?.bio ??
                "Depuis 20 ans, Léonne Bien-Aimé guide ses clients avec clarté et chaleur."
              }
              className="mt-6 text-lg text-slate-600 [&_a]:text-[#C9A227] [&_p]:mb-3 [&_p:last-child]:mb-0"
            />
            <div className="mt-10">
              <Button asChild variant="outline">
                <Link href="/a-propos">Découvrir mon parcours</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#F8FAFC] py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[#C9A227]">Portefeuille</p>
              <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[#0F172A] sm:text-4xl">
                Propriétés en vedette
              </h2>
            </div>
            <Button asChild variant="link">
              <Link href="/proprietes">Tout voir</Link>
            </Button>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {featured.map((p) => (
              <PropertyCard
                key={p.id}
                slug={p.slug}
                title={p.title}
                city={p.city}
                price={p.price}
                type={p.type}
                bedrooms={p.bedrooms}
                bathrooms={p.bathrooms}
                areaSqft={p.areaSqft}
                imageUrl={p.images[0]?.url}
                status={p.status}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#0F172A] py-24 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs uppercase tracking-[0.3em] text-[#C9A227]">Confiance</p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl sm:text-4xl">
            Ce que disent les clients
          </h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {testimonials.map((t) => (
              <blockquote
                key={t.id}
                className="border-t border-[#C9A227]/60 bg-white/[0.03] p-6"
              >
                <p className="text-[#C9A227]">{"★".repeat(t.rating)}</p>
                <p className="mt-4 leading-relaxed text-slate-300">&ldquo;{t.content}&rdquo;</p>
                <footer className="mt-5 text-sm font-medium text-white">
                  {t.name}
                  {t.role ? (
                    <span className="block font-normal text-slate-500">{t.role}</span>
                  ) : null}
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#0B1220] py-20 text-center text-white">
        <div className="relative mx-auto max-w-2xl px-4">
          <p className="text-xs uppercase tracking-[0.35em] text-[#C9A227]">Prochaine étape</p>
          <h2 className="mt-4 font-[family-name:var(--font-display)] text-3xl sm:text-4xl">
            Parlons de votre projet immobilier
          </h2>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Button asChild variant="gold" size="lg">
              <Link href="/contact">Me contacter</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-white/70 text-white hover:bg-white hover:text-[#0F172A]"
            >
              <a
                href={whatsappLink("Bonjour Léonne, je souhaite prendre rendez-vous.")}
                target="_blank"
                rel="noreferrer"
              >
                WhatsApp
              </a>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
