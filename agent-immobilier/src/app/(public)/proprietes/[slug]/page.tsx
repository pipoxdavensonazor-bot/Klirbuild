import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ContactForm } from "@/components/contact/contact-form";
import { RichHtml } from "@/components/ui/rich-html";
import { SiteImage } from "@/components/ui/site-image";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import {
  formatPrice,
  propertyTypeLabel,
  statusLabel,
  whatsappLink,
} from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const property = await prisma.property.findUnique({ where: { slug } });
  if (!property) return { title: "Propriété" };
  return {
    title: property.title,
    description: `${property.city} · ${formatPrice(property.price)} · ${propertyTypeLabel(property.type)}`,
  };
}

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const property = await prisma.property.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      openHouses: {
        where: { published: true, endsAt: { gte: new Date() } },
        orderBy: { startsAt: "asc" },
      },
    },
  });
  if (!property) notFound();

  const profile = await prisma.profile.findFirst();
  const phone = profile?.phone ?? "(514) 574-8712";
  const isVideoFile =
    property.videoUrl?.startsWith("/api/media/") ||
    property.videoUrl?.match(/\.(mp4|webm|mov)(\?|$)/i);

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <p className="text-xs uppercase tracking-[0.3em] text-[#C9A227]">
        {propertyTypeLabel(property.type)} · {property.city}
      </p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl text-[#0F172A]">
        {property.title}
      </h1>
      <div className="mt-3 flex flex-wrap items-baseline gap-4">
        <p className="text-2xl text-slate-700">{formatPrice(property.price)}</p>
        <p className="text-sm uppercase tracking-wide text-slate-500">
          {statusLabel(property.status)}
        </p>
      </div>
      <p className="mt-2 text-sm text-slate-500">{property.address}</p>

      {property.openHouses[0] ? (
        <div className="mt-6 border border-[#C9A227]/40 bg-[#C9A227]/10 px-4 py-3 text-sm text-[#0F172A]">
          <strong>Visite libre :</strong>{" "}
          {property.openHouses[0].startsAt.toLocaleString("fr-CA")} →{" "}
          {property.openHouses[0].endsAt.toLocaleString("fr-CA")}
          {property.openHouses[0].notes ? ` — ${property.openHouses[0].notes}` : ""}
        </div>
      ) : null}

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Spec label="Chambres" value={String(property.bedrooms)} />
        <Spec label="Salles de bain" value={String(property.bathrooms)} />
        <Spec
          label="Superficie"
          value={`${property.areaSqft.toLocaleString("fr-CA")} pi²`}
        />
        <Spec label="Garage" value={property.garage ? "Oui" : "Non"} />
      </div>

      {property.images.length > 0 ? (
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {property.images.map((img) => (
            <div
              key={img.id}
              className="relative aspect-[4/3] overflow-hidden bg-slate-100"
            >
              <SiteImage
                src={img.url}
                alt={img.alt ?? property.title}
                fill
                className="object-cover"
                sizes="50vw"
              />
            </div>
          ))}
        </div>
      ) : null}

      {property.videoUrl ? (
        <div className="mt-8 overflow-hidden bg-slate-900">
          {isVideoFile ? (
            <video
              src={property.videoUrl}
              controls
              className="aspect-video w-full"
              preload="metadata"
            />
          ) : (
            <div className="aspect-video w-full">
              <iframe
                src={embedVideoUrl(property.videoUrl)}
                title={`Vidéo — ${property.title}`}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
        </div>
      ) : null}

      <div className="mt-10">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[#0F172A]">
          Description
        </h2>
        <RichHtml
          html={property.description}
          className="mt-4 text-slate-600 [&_a]:text-[#C9A227] [&_img]:my-4 [&_img]:max-w-full [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5"
        />
      </div>

      <section className="mt-14 grid gap-10 border-t border-slate-200 pt-12 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-[#0F172A]">
            Intéressé(e) ?
          </h2>
          <p className="mt-3 text-sm text-slate-600">
            Demandez une visite, une évaluation comparative ou plus de détails sur
            cette propriété.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild variant="gold" size="sm">
              <a href={`tel:${phone}`}>Appeler</a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a
                href={whatsappLink(
                  `Bonjour Léonne, je m'intéresse à : ${property.title} (${property.address}).`
                )}
                target="_blank"
                rel="noreferrer"
              >
                WhatsApp
              </a>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/proprietes">Toutes les propriétés</Link>
            </Button>
          </div>
        </div>
        <div className="lg:col-span-3">
          <ContactForm
            propertyId={property.id}
            defaultSubject={`Intérêt — ${property.title}`}
          />
        </div>
      </section>
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-slate-200 bg-white px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-1 font-medium text-[#0F172A]">{value}</p>
    </div>
  );
}

function embedVideoUrl(url: string) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    }
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      if (id) return `https://player.vimeo.com/video/${id}`;
    }
  } catch {
    /* keep raw */
  }
  return url;
}
