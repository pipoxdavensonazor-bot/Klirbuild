import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Événements" };

export default async function SeminarsPage() {
  const seminars = await prisma.seminar.findMany({
    where: { startsAt: { gte: new Date() } },
    orderBy: { startsAt: "asc" },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <p className="text-xs uppercase tracking-[0.3em] text-[#C9A227]">Événements</p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl text-[#0F172A]">
        Séminaires & ateliers
      </h1>
      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {seminars.map((s) => (
          <Link
            key={s.id}
            href={`/seminaires/${s.slug}`}
            className="border border-slate-200 p-8 transition-colors hover:border-[#C9A227]"
          >
            <p className="text-sm text-[#C9A227]">
              {format(s.startsAt, "d MMMM yyyy · HH:mm", { locale: fr })}
            </p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-2xl text-[#0F172A]">
              {s.title}
            </h2>
            <p className="mt-2 text-slate-500">{s.location}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
