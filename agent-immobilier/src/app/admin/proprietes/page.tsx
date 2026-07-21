import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPrice, propertyTypeLabel, statusLabel } from "@/lib/utils";
import { PropertyAdminForm } from "@/components/admin/property-form";
import { PublishShareButtons } from "@/components/admin/publish-share-buttons";
import { DeleteButton } from "@/components/admin/delete-button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Maisons · Admin" };

export default async function AdminPropertiesPage() {
  const properties = await prisma.property
    .findMany({
      include: {
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
        openHouses: { orderBy: { startsAt: "desc" }, take: 1 },
      },
      orderBy: { updatedAt: "desc" },
    })
    .catch(() => []);

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-12">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-[#C9A227]">Admin</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[#0F172A]">
          Maisons à vendre
        </h1>
        <p className="mt-2 text-slate-500">
          Fiches professionnelles : photo, vidéo, description enrichie, visite libre,
          partage réseaux.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[#0F172A]">
          Nouvelle propriété
        </h2>
        <PropertyAdminForm />
      </section>

      <section className="space-y-4">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[#0F172A]">
          Propriétés existantes
        </h2>
        {properties.length === 0 ? (
          <p className="text-sm text-slate-500">
            Aucune propriété pour le moment. Ajoutez-en une ci-dessus.
          </p>
        ) : null}
        {properties.map((p) => {
          const oh = p.openHouses[0];
          return (
            <div key={p.id} className="border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-medium text-[#0F172A]">
                    {p.title}
                    {p.featured ? (
                      <span className="ml-2 text-xs uppercase tracking-wide text-[#C9A227]">
                        Vedette
                      </span>
                    ) : null}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {propertyTypeLabel(p.type)} · {p.city} · {formatPrice(p.price)} ·{" "}
                    {statusLabel(p.status)}
                  </p>
                  {oh ? (
                    <p className="mt-1 text-xs text-slate-500">
                      Visite libre : {oh.startsAt.toLocaleString("fr-CA")} →{" "}
                      {oh.endsAt.toLocaleString("fr-CA")}
                      {oh.published ? "" : " (non publiée)"}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Link
                    href={`/proprietes/${p.slug}`}
                    className="text-sm text-[#C9A227] hover:underline"
                    target="_blank"
                  >
                    Voir la fiche
                  </Link>
                  <PublishShareButtons type="property" id={p.id} published />
                  <DeleteButton
                    endpoint="/api/properties"
                    id={p.id}
                    label={p.title}
                    confirmLabel={`Supprimer la propriété « ${p.title} » ?`}
                  />
                </div>
              </div>
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium text-slate-600">
                  Modifier
                </summary>
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
                      garage: p.garage,
                      imageUrl: p.images[0]?.url || "",
                      videoUrl: p.videoUrl,
                      openHouse: oh
                        ? {
                            startsAt: oh.startsAt.toISOString(),
                            endsAt: oh.endsAt.toISOString(),
                            notes: oh.notes,
                            published: oh.published,
                          }
                        : null,
                    }}
                  />
                </div>
              </details>
            </div>
          );
        })}
      </section>
    </div>
  );
}
