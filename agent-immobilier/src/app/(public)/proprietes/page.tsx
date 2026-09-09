import { PropertyCard } from "@/components/properties/property-card";
import { prisma } from "@/lib/prisma";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata = pageMetadata({
  title: "Propriétés à vendre à Laval, Laurentides et Lanaudière",
  description:
    "Maisons, condos et immeubles à vendre avec Léonne Bien-Aimé, courtière immobilière PROPRIO DIRECT — Laval, Laurentides et Lanaudière.",
  path: "/proprietes",
});

export default async function PropertiesPage() {
  const properties = await prisma.property.findMany({
    where: { status: { in: ["AVAILABLE", "PENDING"] } },
    include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <p className="text-xs uppercase tracking-[0.3em] text-[#C9A227]">Portefeuille</p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl text-[#0F172A]">
        Propriétés
      </h1>
      <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {properties.map((p) => (
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
          />
        ))}
      </div>
    </div>
  );
}
