import Link from "next/link";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { LogoutButton } from "@/components/admin/logout-button";

const nav = [
  { href: "/admin", label: "Tableau de bord" },
  { href: "/admin/messages", label: "Messages" },
  { href: "/admin/textes", label: "Textes" },
  { href: "/admin/articles", label: "Articles" },
  { href: "/admin/evenements", label: "Événements" },
  { href: "/admin/proprietes", label: "Maisons" },
  { href: "/admin/temoignages", label: "Témoignages" },
  { href: "/admin/diffusion", label: "Réseaux" },
  { href: "/admin/securite", label: "Sécurité" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ok = await isAdminAuthenticated();

  if (!ok) {
    return <div className="min-h-screen bg-[#0B1220]">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div className="flex flex-wrap items-center gap-6">
            <Link
              href="/admin"
              className="font-[family-name:var(--font-display)] text-xl text-[#0F172A]"
            >
              Admin Léonne
            </Link>
            <nav className="flex flex-wrap gap-4 text-sm text-slate-600">
              {nav.map((item) => (
                <Link key={item.href} href={item.href} className="hover:text-[#C9A227]">
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/" className="text-slate-500 hover:text-[#C9A227]">
              Voir le site
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
