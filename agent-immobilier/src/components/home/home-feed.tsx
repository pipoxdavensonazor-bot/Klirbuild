import { SiteImage } from "@/components/ui/site-image";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { HomeFeedItem, FeedItemType } from "@/lib/home-feed";
import { cn } from "@/lib/utils";

const badgeStyles: Record<FeedItemType, string> = {
  article: "bg-[#0F172A] text-white",
  conseil: "bg-[#C9A227] text-[#0F172A]",
  evenement: "border border-[#C9A227] text-[#C9A227] bg-transparent",
  "visite-libre": "bg-[#C9A227]/15 text-[#8A7018] border border-[#C9A227]/40",
  annonce: "bg-slate-100 text-slate-700",
};

export function HomeFeed({ items }: { items: HomeFeedItem[] }) {
  if (items.length === 0) {
    return (
      <p className="text-slate-500">
        Aucune actualité pour le moment. Revenez bientôt.
      </p>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          className="group flex flex-col overflow-hidden border border-slate-200 bg-white transition-colors hover:border-[#C9A227]"
        >
          <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
            {item.imageUrl ? (
              <SiteImage
                src={item.imageUrl}
                alt={item.title}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                sizes="(max-width:768px) 100vw, 33vw"
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-[#0B1220] text-[#C9A227]">
                {item.badge}
              </div>
            )}
            <span
              className={cn(
                "absolute left-3 top-3 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]",
                badgeStyles[item.type]
              )}
            >
              {item.badge}
            </span>
          </div>
          <div className="flex flex-1 flex-col p-5">
            <p className="text-xs text-slate-400">
              {format(item.date, "d MMMM yyyy", { locale: fr })}
              {item.meta ? ` · ${item.meta}` : ""}
            </p>
            <h3 className="mt-2 font-[family-name:var(--font-display)] text-xl text-[#0F172A] transition-colors group-hover:text-[#C9A227]">
              {item.title}
            </h3>
            <p className="mt-2 line-clamp-2 flex-1 text-sm text-slate-500">
              {item.excerpt}
            </p>
            <span className="mt-4 text-sm font-medium text-[#0F172A]">
              Lire la suite →
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
