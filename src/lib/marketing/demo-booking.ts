import { isSafeHttpUrl } from "@/lib/auth/safe-url";
import { pickTrackingParams } from "@/lib/marketing/utm";

/** Default 30-min KlirBuild demo. Override with NEXT_PUBLIC_DEMO_BOOKING_URL. */
export const DEFAULT_DEMO_BOOKING_URL =
  "https://calendly.com/contact-klirline-klirbuild/30min";

export function resolveDemoBookingUrl(
  envValue = process.env.NEXT_PUBLIC_DEMO_BOOKING_URL
): string {
  const raw = envValue?.trim();
  if (raw && isSafeHttpUrl(raw) && raw.startsWith("https://")) return raw;
  return DEFAULT_DEMO_BOOKING_URL;
}

export function demoBookingHref(
  tracking?: URLSearchParams | Record<string, string | string[] | undefined> | null,
  envValue?: string
): string {
  const base = resolveDemoBookingUrl(envValue);
  try {
    const url = new URL(base);
    const params = pickTrackingParams(tracking);
    for (const [key, value] of params.entries()) {
      if (key === "lang") continue;
      if (!url.searchParams.has(key)) url.searchParams.set(key, value);
    }
    return url.toString();
  } catch {
    return DEFAULT_DEMO_BOOKING_URL;
  }
}
