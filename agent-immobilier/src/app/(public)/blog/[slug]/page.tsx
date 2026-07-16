import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await prisma.article.findUnique({
    where: { slug },
    include: { category: true },
  });
  if (!article || !article.published) notFound();

  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <p className="text-xs uppercase tracking-[0.3em] text-[#C9A227]">
        {article.category?.name ?? "Article"}
      </p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl text-[#0F172A]">
        {article.title}
      </h1>
      <p className="mt-4 text-lg text-slate-500">{article.excerpt}</p>
      {article.coverUrl ? (
        <div className="relative mt-8 aspect-[16/9] overflow-hidden bg-slate-100">
          <Image
            src={article.coverUrl}
            alt={article.title}
            fill
            className="object-cover"
            sizes="100vw"
          />
        </div>
      ) : null}
      <div className="mt-10 whitespace-pre-line leading-relaxed text-slate-700">
        {article.content}
      </div>
    </article>
  );
}
