import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ArticleAdminForm } from "@/components/admin/article-form";
import { PublishShareButtons } from "@/components/admin/publish-share-buttons";

export const metadata = { title: "Articles · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminArticlesPage() {
  let articles: Array<{
    id: string;
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    coverUrl: string | null;
    published: boolean;
    category: { name: string; slug: string } | null;
  }> = [];
  try {
    articles = await prisma.article.findMany({
      include: { category: true },
      orderBy: { updatedAt: "desc" },
    });
  } catch {
    articles = [];
  }

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-12">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-[#C9A227]">Admin</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[#0F172A]">
          Articles & publications
        </h1>
        <p className="mt-2 text-slate-500">
          Créez un article, publiez-le sur le site, puis partagez-le sur les réseaux.
        </p>
      </div>

      <section>
        <h2 className="mb-4 text-lg font-medium text-[#0F172A]">Nouvel article</h2>
        <ArticleAdminForm />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-[#0F172A]">Articles existants</h2>
        {articles.length === 0 ? (
          <p className="text-sm text-slate-500">Aucun article pour le moment.</p>
        ) : (
          articles.map((a) => (
            <div key={a.id} className="border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[#C9A227]">
                    {a.category?.name ?? "Article"} ·{" "}
                    {a.published ? "Publié" : "Brouillon"}
                  </p>
                  <h3 className="mt-1 font-[family-name:var(--font-display)] text-xl text-[#0F172A]">
                    {a.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">{a.excerpt}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {a.published ? (
                    <Link
                      href={`/blog/${a.slug}`}
                      className="text-sm text-[#C9A227] hover:underline"
                    >
                      Voir sur le site
                    </Link>
                  ) : null}
                  <PublishShareButtons type="article" id={a.id} published={a.published} />
                </div>
              </div>
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-slate-600">
                  Modifier
                </summary>
                <div className="mt-4">
                  <ArticleAdminForm
                    initial={{
                      id: a.id,
                      title: a.title,
                      slug: a.slug,
                      excerpt: a.excerpt,
                      content: a.content,
                      coverUrl: a.coverUrl,
                      published: a.published,
                      categorySlug: a.category?.slug,
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
