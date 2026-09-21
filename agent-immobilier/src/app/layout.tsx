import type { Metadata } from "next";
import Script from "next/script";
import { Cormorant_Garamond, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { siteName } from "@/lib/utils";
import {
  CANONICAL_ORIGIN,
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  DEFAULT_TITLE,
  absoluteUrl,
} from "@/lib/seo";

/** Google AdSense publisher ID */
const ADSENSE_CLIENT = "ca-pub-9701452344811975";

const display = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const sans = Source_Sans_3({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(CANONICAL_ORIGIN),
  title: {
    default: DEFAULT_TITLE,
    template: `%s · ${siteName()}`,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: siteName(),
  authors: [{ name: siteName(), url: CANONICAL_ORIGIN }],
  creator: siteName(),
  keywords: [
    "courtière immobilière Laval",
    "courtier immobilier Laurentides",
    "maison à vendre Lanaudière",
    "PROPRIO DIRECT",
    "Léonne Bien-Aimé",
    "OACIQ",
    "condo Saint-Jérôme",
    "évaluation maison Laval",
  ],
  alternates: { canonical: CANONICAL_ORIGIN },
  openGraph: {
    type: "website",
    locale: "fr_CA",
    url: CANONICAL_ORIGIN,
    siteName: siteName(),
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [{ url: absoluteUrl(DEFAULT_OG_IMAGE), alt: siteName() }],
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [absoluteUrl(DEFAULT_OG_IMAGE)],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  other: {
    "google-adsense-account": ADSENSE_CLIENT,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon.png", type: "image/png", sizes: "192x192" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body className={`${display.variable} ${sans.variable} antialiased`}>
        <Script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
        {children}
      </body>
    </html>
  );
}
