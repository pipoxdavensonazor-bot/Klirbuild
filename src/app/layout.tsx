import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KlirBuild — by Klirline Inc.",
  description: "KlirBuild construction OS développé par Klirline Inc.",
  manifest: "/manifest.webmanifest",
  applicationName: "KlirBuild",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "KlirBuild",
  },
  icons: {
    icon: "/klirbuild-logo.png",
    apple: "/klirbuild-logo.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#004F6E",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans`}>
        <Providers>{children}</Providers>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
