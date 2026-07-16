import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";

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

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <p className="text-xs uppercase tracking-[0.3em] text-[#C9A227]">{property.city}</p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl text-[#0F172A]">
        {property.title}
      </h1>
      <p className="mt-2 text-xl text-slate-600">{formatPrice(property.price)}</p>

      {property.openHouses[0] ? (
        <div className="mt-6 border border-[#C9A227]/40 bg-[#C9A227]/10 px-4 py-3 text-sm text-[#0F172A]">
          <strong>Visite libre :</strong>{" "}
          {property.openHouses[0].startsAt.toLocaleString("fr-CA")} →{" "}
          {property.openHouses[0].endsAt.toLocaleString("fr-CA")}
          {property.openHouses[0].notes ? ` — ${property.openHouses[0].notes}` : ""}
        </div>
      ) : null}

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {property.images.map((img) => (
          <div key={img.id} className="relative aspect-[4/3] overflow-hidden bg-slate-100">
            <Image src={img.url} alt={img.alt ?? property.title} fill className="object-cover" sizes="50vw" />
          </div>
        ))}
      </div>
      <p className="mt-8 whitespace-pre-line leading-relaxed text-slate-600">
        {property.description}
      </p>
    </div>
  );
}
