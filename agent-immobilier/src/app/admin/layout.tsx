import Link from "next/link";
import { headers } from "next/headers";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { LogoutButton } from "@/components/admin/logout-button";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ok = await isAdminAuthenticated();
  const h = await headers();
  const path = h.get("x-pathname") || "";

  // Login page: bare layout
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
            <nav className="flex gap-4 text-sm text-slate-600">
              <Link href="/admin" className="hover:text-[#C9A227]">
                Tableau de bord
              </Link>
              <Link href="/admin/textes" className="hover:text-[#C9A227]">
                Textes
              </Link>
              <Link href="/admin/proprietes" className="hover:text-[#C9A227]">
                Maisons
              </Link>
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
