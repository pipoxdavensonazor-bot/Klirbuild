import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Conseils & articles" };

export default async function BlogPage() {
  const articles = await prisma.article.findMany({
    where: { published: true },
    include: { category: true },
    orderBy: { publishedAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <p className="text-xs uppercase tracking-[0.3em] text-[#C9A227]">Ressources</p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl text-[#0F172A]">
        Conseils & articles
      </h1>
      <div className="mt-12 grid gap-8 md:grid-cols-3">
        {articles.map((a) => (
          <Link key={a.id} href={`/blog/${a.slug}`} className="group block border border-slate-200">
            <div className="relative aspect-[16/10] bg-slate-100">
              {a.coverUrl ? (
                <Image src={a.coverUrl} alt={a.title} fill className="object-cover" sizes="33vw" />
              ) : null}
            </div>
            <div className="p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-[#C9A227]">
                {a.category?.name ?? "Article"}
              </p>
              <h2 className="mt-2 font-[family-name:var(--font-display)] text-xl text-[#0F172A] group-hover:text-[#C9A227]">
                {a.title}
              </h2>
              <p className="mt-2 line-clamp-2 text-sm text-slate-500">{a.excerpt}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
