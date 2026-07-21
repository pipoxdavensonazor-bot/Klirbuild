import { notFound } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { prisma } from "@/lib/prisma";
import { SiteImage } from "@/components/ui/site-image";
import { RichHtml } from "@/components/ui/rich-html";

export default async function SeminarDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const seminar = await prisma.seminar.findUnique({ where: { slug } });
  if (!seminar) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <p className="text-sm text-[#C9A227]">
        {format(seminar.startsAt, "d MMMM yyyy · HH:mm", { locale: fr })}
      </p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl text-[#0F172A]">
        {seminar.title}
      </h1>
      <p className="mt-2 text-slate-500">{seminar.location}</p>
      {seminar.imageUrl ? (
        <div className="relative mt-8 aspect-[16/9] overflow-hidden bg-slate-100">
          <SiteImage
            src={seminar.imageUrl}
            alt={seminar.title}
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
        </div>
      ) : null}
      <RichHtml
        html={seminar.description}
        className="rich-html mt-8 text-slate-600 [&_a]:text-[#C9A227] [&_img]:my-4 [&_img]:h-auto [&_img]:max-w-full [&_li]:ml-5 [&_ol]:list-decimal [&_p]:mb-3 [&_ul]:list-disc"
      />
    </div>
  );
}
