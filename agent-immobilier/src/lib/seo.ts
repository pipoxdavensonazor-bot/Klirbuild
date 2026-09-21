import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/utils";

export const CANONICAL_HOST = "leonnebienaime.ca";
export const CANONICAL_ORIGIN = `https://${CANONICAL_HOST}`;

export const SEO_REGIONS = "Laval, Laurentides et Lanaudière";
export const SEO_AGENCY = "PROPRIO DIRECT";

export const DEFAULT_TITLE =
  "Léonne Bien-Aimé | Courtière immobilière à Laval, Laurentides et Lanaudière";

export const DEFAULT_DESCRIPTION =
  "Courtière immobilière PROPRIO DIRECT à Laval, dans les Laurentides et Lanaudière. Achat, vente et évaluation de maisons et condos — conseils justes, résultats concrets. OACIQ.";

export const DEFAULT_OG_IMAGE = "/apple-icon.png";

export function absoluteUrl(path = "/"): string {
  const base = (siteUrl() || CANONICAL_ORIGIN).replace(/\/$/, "");
  if (!path || path === "/") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function absoluteMediaUrl(src?: string | null): string | undefined {
  if (!src?.trim()) return undefined;
  const url = src.trim();
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return absoluteUrl(url);
  return undefined;
}

export function stripHtml(html: string, max = 160): string {
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

export function pageMetadata(opts: {
  title: string;
  description: string;
  path: string;
  image?: string | null;
  type?: "website" | "article";
  absoluteTitle?: boolean;
}): Metadata {
  const url = absoluteUrl(opts.path);
  const image = absoluteMediaUrl(opts.image) ?? absoluteUrl(DEFAULT_OG_IMAGE);
  const title = opts.absoluteTitle
    ? { absolute: opts.title }
    : opts.title;

  return {
    title,
    description: opts.description,
    alternates: { canonical: url },
    openGraph: {
      title: opts.title,
      description: opts.description,
      url,
      siteName: siteName(),
      locale: "fr_CA",
      type: opts.type ?? "website",
      images: [{ url: image, alt: opts.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: opts.title,
      description: opts.description,
      images: [image],
    },
  };
}

export function agentJsonLd(profile?: {
  name?: string | null;
  title?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  photoUrl?: string | null;
  facebook?: string | null;
  instagram?: string | null;
  linkedin?: string | null;
} | null) {
  const name = profile?.name?.trim() || siteName();
  const telephone = profile?.phone?.trim() || "(514) 574-8712";
  const email = profile?.email?.trim() || "bienaimeleonne_@hotmail.com";
  const street = profile?.address?.trim() || "3899, aut. des Laurentides #200";
  const cityLine = profile?.city?.trim() || "Laval (QC) H7L 3H7";
  const image = absoluteMediaUrl(profile?.photoUrl) ?? absoluteUrl(DEFAULT_OG_IMAGE);
  const sameAs = [
    profile?.facebook,
    profile?.instagram,
    profile?.linkedin,
    "https://www.centris.ca/fr/courtier-immobilier~leonne-bien-aime~proprio-direct/e1890",
  ].filter((v): v is string => Boolean(v?.trim()));

  return {
    "@context": "https://schema.org",
    "@type": ["RealEstateAgent", "LocalBusiness", "Person"],
    "@id": `${CANONICAL_ORIGIN}/#agent`,
    name,
    url: CANONICAL_ORIGIN,
    image,
    telephone,
    email,
    jobTitle: profile?.title?.trim() || "Courtière immobilière résidentielle et commerciale",
    description: DEFAULT_DESCRIPTION,
    address: {
      "@type": "PostalAddress",
      streetAddress: street,
      addressLocality: "Laval",
      addressRegion: "QC",
      postalCode: "H7L 3H7",
      addressCountry: "CA",
    },
    areaServed: [
      { "@type": "AdministrativeArea", name: "Laval" },
      { "@type": "AdministrativeArea", name: "Laurentides" },
      { "@type": "AdministrativeArea", name: "Lanaudière" },
    ],
    parentOrganization: {
      "@type": "Organization",
      name: SEO_AGENCY,
    },
    knowsLanguage: ["fr", "en"],
    sameAs,
    additionalProperty: cityLine,
  };
}

export function listingJsonLd(opts: {
  title: string;
  description: string;
  slug: string;
  address: string;
  city: string;
  price: number;
  type: string;
  bedrooms: number;
  bathrooms: number;
  areaSqft: number;
  status: string;
  image?: string | null;
  dateModified?: Date | string | null;
}) {
  const url = absoluteUrl(`/proprietes/${opts.slug}`);
  const availability =
    opts.status === "SOLD"
      ? "https://schema.org/SoldOut"
      : opts.status === "PENDING"
        ? "https://schema.org/PreOrder"
        : "https://schema.org/InStock";
  const category =
    opts.type === "CONDO"
      ? "https://schema.org/Apartment"
      : opts.type === "LAND"
        ? "https://schema.org/LandParcel"
        : "https://schema.org/House";

  return {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    "@id": `${url}#listing`,
    name: opts.title,
    url,
    description: stripHtml(opts.description, 300),
    dateModified: opts.dateModified
      ? new Date(opts.dateModified).toISOString()
      : undefined,
    image: absoluteMediaUrl(opts.image),
    address: {
      "@type": "PostalAddress",
      streetAddress: opts.address,
      addressLocality: opts.city,
      addressRegion: "QC",
      addressCountry: "CA",
    },
    numberOfRooms: opts.bedrooms,
    floorSize: {
      "@type": "QuantitativeValue",
      value: opts.areaSqft,
      unitCode: "FTK",
    },
    offers: {
      "@type": "Offer",
      price: opts.price,
      priceCurrency: "CAD",
      availability,
      url,
    },
    additionalType: category,
    seller: { "@id": `${CANONICAL_ORIGIN}/#agent` },
  };
}

export function articleJsonLd(opts: {
  title: string;
  excerpt: string;
  slug: string;
  coverUrl?: string | null;
  publishedAt?: Date | string | null;
  updatedAt?: Date | string | null;
}) {
  const url = absoluteUrl(`/blog/${opts.slug}`);
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: opts.title,
    description: opts.excerpt,
    url,
    image: absoluteMediaUrl(opts.coverUrl),
    datePublished: opts.publishedAt
      ? new Date(opts.publishedAt).toISOString()
      : undefined,
    dateModified: opts.updatedAt
      ? new Date(opts.updatedAt).toISOString()
      : undefined,
    inLanguage: "fr-CA",
    author: { "@id": `${CANONICAL_ORIGIN}/#agent` },
    publisher: { "@id": `${CANONICAL_ORIGIN}/#agent` },
  };
}

export function eventJsonLd(opts: {
  title: string;
  description: string;
  slug: string;
  location: string;
  startsAt: Date | string;
  imageUrl?: string | null;
}) {
  const url = absoluteUrl(`/seminaires/${opts.slug}`);
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: opts.title,
    description: stripHtml(opts.description, 300),
    url,
    startDate: new Date(opts.startsAt).toISOString(),
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    image: absoluteMediaUrl(opts.imageUrl),
    location: {
      "@type": "Place",
      name: opts.location,
      address: opts.location,
    },
    organizer: { "@id": `${CANONICAL_ORIGIN}/#agent` },
  };
}
