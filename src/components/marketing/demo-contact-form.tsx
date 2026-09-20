"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { KlirBuildLogo } from "@/components/brand/klirline-logo";
import { AppFooter } from "@/components/layout/app-footer";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { marketingCopy, resolveMarketingLang } from "@/lib/marketing/copy";
import { demoBookingHref } from "@/lib/marketing/demo-booking";
import { DEMO_INBOX, demoMailto, parseDemoRequest } from "@/lib/marketing/demo-request";
import { pickTrackingParams, withTrackingQuery } from "@/lib/marketing/utm";
import { cn } from "@/lib/utils";

export function DemoContactForm() {
  const searchParams = useSearchParams();
  const lang = resolveMarketingLang(searchParams.get("lang"));
  const t = marketingCopy[lang];
  const tracking = pickTrackingParams(searchParams);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const homeHref = withTrackingQuery("/", searchParams, { lang });
  const calendlyHref = demoBookingHref(searchParams);
  const mailtoHref = (() => {
    const parsed = parseDemoRequest({
      name: name || (lang === "en" ? "Name" : "Nom"),
      email: email || "contact@example.com",
      company: company || "Company",
      phone,
      message,
      lang,
      tracking: Object.fromEntries(tracking.entries()),
    });
    return parsed.ok ? demoMailto(parsed.value) : `mailto:${DEMO_INBOX}`;
  })();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    const parsed = parseDemoRequest({
      name,
      email,
      company,
      phone,
      message,
      lang,
      website,
      tracking: Object.fromEntries(tracking.entries()),
    });
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/public/demo-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          company,
          phone,
          message,
          lang,
          website,
          tracking: Object.fromEntries(tracking.entries()),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        mailto?: string;
      };
      if (res.status === 202 && data.mailto) {
        window.location.href = data.mailto;
        setSuccess(t.contactMailtoOpened);
        return;
      }
      if (!res.ok) {
        if (data.mailto) {
          window.location.href = data.mailto;
          setSuccess(t.contactMailtoOpened);
          return;
        }
        setError(
          typeof data.error === "string"
            ? data.error
            : lang === "en"
              ? "Could not send. Use email instead."
              : "Envoi impossible. Utilisez le courriel."
        );
        return;
      }
      setSuccess(t.contactSuccess);
      setName("");
      setEmail("");
      setCompany("");
      setPhone("");
      setMessage("");
    } catch {
      window.location.href = demoMailto(parsed.value);
      setSuccess(t.contactMailtoOpened);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F4F6F8]" lang={t.htmlLang}>
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <Link href={homeHref}>
            <KlirBuildLogo className="h-10 w-[112px]" priority />
          </Link>
          <Link href={homeHref} className="text-sm text-[#004F6E] hover:underline">
            {t.backHome}
          </Link>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-10">
        <Card>
          <CardHeader>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#D4AF37]">
              KlirBuild
            </p>
            <CardTitle className="text-2xl">{t.contactTitle}</CardTitle>
            <p className="text-sm text-muted-foreground">{t.contactBody}</p>
            <p className="text-sm font-medium text-[#004F6E]">{t.trust}</p>
            <a
              href={calendlyHref}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants({ size: "lg" }), "mt-3 h-11 w-full bg-[#004F6E] hover:bg-[#003A52]")}
            >
              {t.contactCalendly}
            </a>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-3">
              <Input
                name="name"
                autoComplete="name"
                placeholder={t.contactName}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={120}
              />
              <Input
                name="email"
                type="email"
                autoComplete="email"
                placeholder={t.contactEmail}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                maxLength={180}
              />
              <Input
                name="company"
                autoComplete="organization"
                placeholder={t.contactCompany}
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                required
                maxLength={160}
              />
              <Input
                name="phone"
                type="tel"
                autoComplete="tel"
                placeholder={t.contactPhone}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={40}
              />
              <Textarea
                name="message"
                placeholder={t.contactMessage}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={4000}
              />
              <div className="hidden" aria-hidden>
                <label>
                  Website
                  <input
                    tabIndex={-1}
                    autoComplete="off"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </label>
              </div>
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              {success ? <p className="text-sm text-emerald-700">{success}</p> : null}
              <Button type="submit" className="h-11 w-full bg-[#004F6E] hover:bg-[#003A52]" disabled={loading}>
                {loading ? t.contactSending : t.contactSubmit}
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              <a href={mailtoHref} className="text-[#004F6E] hover:underline">
                {t.contactMailto}
              </a>
            </p>
          </CardContent>
        </Card>
      </main>
      <AppFooter />
    </div>
  );
}
