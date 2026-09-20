import { isSafeHttpUrl } from "@/lib/auth/safe-url";
import { DEMO_INBOX } from "@/lib/marketing/demo-request";
import { pickTrackingParams, trackingSummary } from "@/lib/marketing/utm";

export const DEMO_MAILTO_SUBJECT = "Démo Klirbuild 30 min";

export function demoMailtoFallback(): string {
  return `mailto:${DEMO_INBOX}?subject=${encodeURIComponent(DEMO_MAILTO_SUBJECT)}`;
}

/** https Calendly (or other scheduler) when NEXT_PUBLIC_DEMO_BOOKING_URL is set. */
export function resolveDemoBookingUrl(
  envValue = process.env.NEXT_PUBLIC_DEMO_BOOKING_URL
): string {
  const raw = envValue?.trim();
  if (raw && isSafeHttpUrl(raw) && raw.startsWith("https://")) return raw;
  return demoMailtoFallback();
}

export function isExternalDemoBooking(href: string): boolean {
  return href.startsWith("https://");
}

export function demoBookingHref(
  tracking?: URLSearchParams | Record<string, string | string[] | undefined> | null,
  envValue?: string
): string {
  const base = resolveDemoBookingUrl(envValue);
  const params = pickTrackingParams(tracking);
  if (base.startsWith("mailto:")) {
    const utm = trackingSummary(params);
    if (!utm) return base;
    return `${base}&body=${encodeURIComponent(utm)}`;
  }
  try {
    const url = new URL(base);
    for (const [key, value] of params.entries()) {
      if (key === "lang") continue;
      if (!url.searchParams.has(key)) url.searchParams.set(key, value);
    }
    return url.toString();
  } catch {
    return demoMailtoFallback();
  }
}
