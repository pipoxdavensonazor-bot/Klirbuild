"use client";

import Link from "next/link";
import { useState } from "react";
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
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-xl text-[#0F172A]"
          onClick={() => setOpen(false)}
        >
          {name}
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-slate-600 lg:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-[#C9A227]">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Button asChild variant="gold" size="sm" className="hidden sm:inline-flex">
            <Link href="/contact">Rendez-vous</Link>
          </Button>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center border border-slate-200 text-[#0F172A] lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            onClick={() => setOpen((v) => !v)}
          >
            <span className="sr-only">Menu</span>
            <span className="flex flex-col gap-1.5">
              <span
                className={`block h-0.5 w-5 bg-current transition ${open ? "translate-y-2 rotate-45" : ""}`}
              />
              <span className={`block h-0.5 w-5 bg-current transition ${open ? "opacity-0" : ""}`} />
              <span
                className={`block h-0.5 w-5 bg-current transition ${open ? "-translate-y-2 -rotate-45" : ""}`}
              />
            </span>
          </button>
        </div>
      </div>

      {open ? (
        <nav
          id="mobile-nav"
          className="border-t border-slate-100 bg-white px-4 py-4 lg:hidden"
        >
          <ul className="space-y-1">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="block px-2 py-3 text-sm text-slate-700 hover:text-[#C9A227]"
                  onClick={() => setOpen(false)}
                >
                  {l.label}
                </Link>
              </li>
            ))}
            <li className="pt-2">
              <Button asChild variant="gold" size="sm" className="w-full">
                <Link href="/contact" onClick={() => setOpen(false)}>
                  Prendre rendez-vous
                </Link>
              </Button>
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
