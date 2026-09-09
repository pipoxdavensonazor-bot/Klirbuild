import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number) {
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(price);
}

export function propertyTypeLabel(type: string) {
  const map: Record<string, string> = {
    HOUSE: "Maison",
    CONDO: "Condo",
    DUPLEX: "Duplex",
    LAND: "Terrain",
    COMMERCIAL: "Commercial",
  };
  return map[type] ?? type;
}

export function statusLabel(status: string) {
  const map: Record<string, string> = {
    AVAILABLE: "À vendre",
    PENDING: "Sous offre",
    SOLD: "Vendue",
  };
  return map[status] ?? status;
}

export function siteName() {
  return "Léonne Bien-Aimé";
}

export function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://leonnebienaime.ca";
}

export function whatsappLink(text?: string) {
  const phone = "15145748712";
  const q = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${phone}${q}`;
}

export function centrisListingsUrl() {
  return "https://www.centris.ca/fr/courtier-immobilier~leonne-bien-aime~proprio-direct/e1890";
}

export function isClerkConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
      process.env.CLERK_SECRET_KEY
  );
}
