"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Building2,
  ClipboardList,
  HardHat,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import { KlirBuildLogo } from "@/components/brand/klirline-logo";
import { AppFooter } from "@/components/layout/app-footer";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { marketingCopy, resolveMarketingLang } from "@/lib/marketing/copy";
import { withTrackingQuery } from "@/lib/marketing/utm";

const FEATURE_ICONS = {
  chantiers: HardHat,
  estimates: ClipboardList,
  crm: Users,
  ccq: ShieldCheck,
  payments: Wallet,
  ai: Sparkles,
} as const;

export function MarketingLanding() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lang = resolveMarketingLang(searchParams.get("lang"));
  const t = marketingCopy[lang];
  const otherLang = lang === "fr" ? "en" : "fr";
  const here = pathname || "/";

  const demoHref = withTrackingQuery("/contact", searchParams, { lang });
  const loginHref = withTrackingQuery("/login", searchParams);
  const registerHref = withTrackingQuery("/register", searchParams);
  const langHref = withTrackingQuery(here, searchParams, { lang: otherLang });

  return (
    <div className="min-h-screen bg-[#F4F6F8] text-[#0A1C31]" lang={t.htmlLang}>
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2"
      >
        {lang === "fr" ? "Aller au contenu" : "Skip to content"}
      </a>

      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0A1C31]/95 text-white backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:h-[4.25rem] sm:px-6">
          <Link href={withTrackingQuery("/", searchParams, { lang })} className="shrink-0">
            <KlirBuildLogo
              className="h-10 w-[112px] border border-[#D4AF37]/35 bg-white sm:h-11 sm:w-[128px]"
              priority
            />
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-white/80 md:flex">
            <a href="#produit" className="hover:text-white">
              {t.navProduct}
            </a>
            <a href="#fonctionnalites" className="hover:text-white">
              {t.navFeatures}
            </a>
            <Link href={demoHref} className="hover:text-white">
              {t.navContact}
            </Link>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href={langHref}
              className="rounded-md px-2 py-1 text-xs font-semibold uppercase tracking-wider text-[#D4AF37] hover:bg-white/10"
              hrefLang={otherLang}
              lang={otherLang}
            >
              {t.langOther}
              <span className="sr-only"> — {t.langOtherLabel}</span>
            </Link>
            <Link
              href={loginHref}
              className="text-xs font-medium text-white/85 hover:text-white sm:text-sm"
            >
              {t.login}
            </Link>
            <Link
              href={demoHref}
              className={cn(
                buttonVariants({ size: "sm" }),
                "bg-[#004F6E] hover:bg-[#003A52] sm:h-10 sm:px-4"
              )}
            >
              {t.demoShort}
            </Link>
          </div>
        </div>
      </header>

      <main id="contenu">
        <section className="relative overflow-hidden bg-[#0A1C31] text-white">
          <div className="login-floorplan-bg pointer-events-none absolute inset-0" aria-hidden>
            <Image
              src="/login/floor-plan.png"
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover object-center opacity-35"
            />
          </div>
          <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#D4AF37]">
                {t.kicker}
              </p>
              <h1 className="mt-4 max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl">
                {t.heroTitle}
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">
                {t.heroBody}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href={demoHref}
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "h-12 bg-[#004F6E] px-6 text-base hover:bg-[#003A52]"
                  )}
                >
                  {t.ctaPrimary}
                </Link>
                <Link
                  href={loginHref}
                  className={cn(
                    buttonVariants({ size: "lg", variant: "outline" }),
                    "h-12 border-[#D4AF37]/50 bg-transparent px-6 text-base text-white hover:bg-white/10 hover:text-white"
                  )}
                >
                  {t.ctaSecondary}
                </Link>
              </div>
              <p className="mt-4 text-sm">
                <Link href={registerHref} className="text-[#D4AF37] underline-offset-2 hover:underline">
                  {t.signup}
                </Link>
              </p>
              <p className="mt-8 text-sm font-medium text-white/75">{t.trust}</p>
            </div>
            <div className="rounded-2xl border border-[#D4AF37]/25 bg-[#132A4A]/80 p-6 shadow-soft backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#D4AF37]">
                {t.solutionKicker}
              </p>
              <ul className="mt-4 space-y-3 text-sm text-white/90">
                {t.features.slice(0, 5).map((feature) => (
                  <li key={feature.id} className="flex gap-3">
                    <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#D4AF37]" />
                    <span>
                      <span className="font-medium text-white">{feature.title}.</span> {feature.body}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section id="produit" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#004F6E]">
            {t.problemKicker}
          </p>
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight">{t.problemTitle}</h2>
          <p className="mt-4 max-w-2xl text-muted-foreground">{t.problemBody}</p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {t.problems.map((item) => (
              <article
                key={item.title}
                className="rounded-xl border border-border bg-white p-5 shadow-soft"
              >
                <h3 className="text-base font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-border bg-white">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#004F6E]">
              {t.solutionKicker}
            </p>
            <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight">
              {t.solutionTitle}
            </h2>
            <p className="mt-4 max-w-2xl text-muted-foreground">{t.solutionBody}</p>
            <div className="mt-8 flex items-center gap-3 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4 text-[#004F6E]" />
              {t.trust}
            </div>
          </div>
        </section>

        <section id="fonctionnalites" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#004F6E]">
            {t.featuresKicker}
          </p>
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight">
            {t.featuresTitle}
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {t.features.map((feature) => {
              const Icon = FEATURE_ICONS[feature.id];
              return (
                <article
                  key={feature.id}
                  className="rounded-xl border border-border bg-white p-5 shadow-soft"
                >
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[#004F6E]/10 text-[#004F6E]">
                    <Icon className="h-4 w-4" />
                  </div>
                  <h3 className="text-base font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{feature.body}</p>
                </article>
              );
            })}
          </div>
          <p className="mt-8 max-w-3xl text-xs text-muted-foreground">{t.legalCcq}</p>
        </section>

        <section className="border-y border-border bg-white">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#004F6E]">
              {t.audienceKicker}
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">{t.audienceTitle}</h2>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {t.audience.map((item) => (
                <li
                  key={item}
                  className="rounded-lg border border-border bg-[#F4F6F8] px-4 py-3 text-sm font-medium"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="bg-[#004F6E] text-white">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-16 sm:px-6 sm:py-20 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <h2 className="text-3xl font-semibold tracking-tight">{t.ctaTitle}</h2>
              <p className="mt-3 text-white/85">{t.ctaBody}</p>
              <p className="mt-4 text-sm text-[#D4AF37]">{t.trust}</p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Link
                href={demoHref}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "h-12 bg-[#D4AF37] px-6 text-[#0A1C31] hover:bg-[#c4a030]"
                )}
              >
                {t.ctaPrimary}
              </Link>
              <Link
                href={loginHref}
                className={cn(
                  buttonVariants({ size: "lg", variant: "outline" }),
                  "h-12 border-white/40 bg-transparent px-6 text-white hover:bg-white/10 hover:text-white"
                )}
              >
                {t.ctaSecondary}
              </Link>
            </div>
          </div>
        </section>
      </main>
      <AppFooter />
    </div>
  );
}
