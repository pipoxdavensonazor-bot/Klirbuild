import Link from "next/link";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/", label: "Accueil" },
  { href: "/proprietes", label: "Propriétés" },
  { href: "/a-propos", label: "À propos" },
  { href: "/blog", label: "Conseils" },
  { href: "/seminaires", label: "Événements" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader({ name }: { name: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="font-[family-name:var(--font-display)] text-xl text-[#0F172A]">
          {name}
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-slate-600 lg:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-[#C9A227]">
              {l.label}
            </Link>
          ))}
        </nav>
        <Button asChild variant="gold" size="sm">
          <Link href="/contact">Rendez-vous</Link>
        </Button>
      </div>
    </header>
  );
}
