import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { prisma } from "@/lib/prisma";
import { SeminarAdminForm } from "@/components/admin/seminar-form";
import { DeleteButton } from "@/components/admin/delete-button";

export const metadata = { title: "Événements · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminEventsPage() {
  let seminars: Array<{
    id: string;
    title: string;
    slug: string;
    description: string;
    imageUrl: string | null;
    startsAt: Date;
    location: string;
    capacity: number;
    registrationOpen: boolean;
  }> = [];

  try {
    seminars = await prisma.seminar.findMany({
      orderBy: { startsAt: "desc" },
    });
  } catch {
    seminars = [];
  }

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-12">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-[#C9A227]">Admin</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[#0F172A]">
          Événements & séminaires
        </h1>
        <p className="mt-2 text-slate-500">
          Créez, modifiez ou supprimez un événement affiché sur le site et dans le
          fil d&apos;actualité.
        </p>
      </div>

      <section>
        <h2 className="mb-4 text-lg font-medium text-[#0F172A]">Nouvel événement</h2>
        <SeminarAdminForm />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-[#0F172A]">Événements existants</h2>
        {seminars.length === 0 ? (
          <p className="text-sm text-slate-500">Aucun événement pour le moment.</p>
        ) : (
          seminars.map((s) => (
            <div key={s.id} className="border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[#C9A227]">
                    Événement ·{" "}
                    {format(s.startsAt, "d MMM yyyy · HH:mm", { locale: fr })}
                  </p>
                  <h3 className="mt-1 font-[family-name:var(--font-display)] text-xl text-[#0F172A]">
                    {s.title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">{s.location}</p>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-500">
                    {s.description}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Link
                    href={`/seminaires/${s.slug}`}
                    className="text-sm text-[#C9A227] hover:underline"
                  >
                    Voir sur le site
                  </Link>
                  <DeleteButton
                    endpoint="/api/seminars"
                    id={s.id}
                    label={s.title}
                    confirmLabel={`Supprimer l'événement « ${s.title} » ? Cette action est définitive.`}
                  />
                </div>
              </div>
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-slate-600">
                  Modifier
                </summary>
                <div className="mt-4">
                  <SeminarAdminForm
                    initial={{
                      id: s.id,
                      title: s.title,
                      slug: s.slug,
                      description: s.description,
                      imageUrl: s.imageUrl,
                      startsAt: s.startsAt.toISOString(),
                      location: s.location,
                      capacity: s.capacity,
                      registrationOpen: s.registrationOpen,
                    }}
                  />
                </div>
              </details>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
