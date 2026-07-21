import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPrice, propertyTypeLabel, statusLabel } from "@/lib/utils";
import { PropertyAdminForm } from "@/components/admin/property-form";
import { PublishShareButtons } from "@/components/admin/publish-share-buttons";

export default async function AdminPropertiesPage() {
  const properties = await prisma.property.findMany({
    include: {
      openHouses: { orderBy: { startsAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-12">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#C9A227]">Admin</p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[#0F172A]">
            Propriétés
          </h1>
        </div>
        <Link href="/" className="text-sm text-slate-500 hover:text-[#C9A227]">
          ← Site public
        </Link>
      </div>

      <PropertyAdminForm />

      <div className="space-y-4">
        {properties.map((p) => (
          <div key={p.id} className="border border-slate-200 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-medium text-[#0F172A]">{p.title}</h2>
                <p className="text-sm text-slate-500">
                  {propertyTypeLabel(p.type)} · {p.city} · {formatPrice(p.price)} ·{" "}
                  {statusLabel(p.status)}
                </p>
                {p.openHouses[0] ? (
                  <p className="mt-2 text-sm text-[#8A7018]">
                    Visite libre :{" "}
                    {p.openHouses[0].startsAt.toLocaleString("fr-CA")} →{" "}
                    {p.openHouses[0].endsAt.toLocaleString("fr-CA")}
                    {p.openHouses[0].published ? " (publiée)" : " (brouillon)"}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col items-end gap-2">
                <Link
                  href={`/proprietes/${p.slug}`}
                  className="text-sm text-[#C9A227] hover:underline"
                >
                  Voir
                </Link>
                <PublishShareButtons type="property" id={p.id} published />
              </div>
            </div>
            <div className="mt-4">
              <PropertyAdminForm
                initial={{
                  id: p.id,
                  title: p.title,
                  slug: p.slug,
                  description: p.description,
                  address: p.address,
                  city: p.city,
                  price: p.price,
                  type: p.type,
                  bedrooms: p.bedrooms,
                  bathrooms: p.bathrooms,
                  areaSqft: p.areaSqft,
                  status: p.status,
                  featured: p.featured,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
