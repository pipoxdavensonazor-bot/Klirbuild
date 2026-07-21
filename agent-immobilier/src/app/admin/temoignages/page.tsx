import { prisma } from "@/lib/prisma";
import { TestimonialForm, TestimonialRow } from "@/components/admin/testimonial-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Témoignages · Admin" };

export default async function AdminTestimonialsPage() {
  const items = await prisma.testimonial
    .findMany({ orderBy: { createdAt: "desc" } })
    .catch(() => []);

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-12">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-[#C9A227]">Admin</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[#0F172A]">
          Témoignages
        </h1>
        <p className="mt-2 text-slate-500">
          Avis clients affichés sur la page d&apos;accueil (section Confiance).
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[#0F172A]">
          Nouveau témoignage
        </h2>
        <TestimonialForm />
      </section>

      <section className="space-y-4">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[#0F172A]">
          Témoignages existants
        </h2>
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">Aucun témoignage pour le moment.</p>
        ) : null}
        {items.map((t) => (
          <TestimonialRow
            key={t.id}
            item={{
              id: t.id,
              name: t.name,
              role: t.role,
              content: t.content,
              rating: t.rating,
              featured: t.featured,
              approved: t.approved,
            }}
          />
        ))}
      </section>
    </div>
  );
}
