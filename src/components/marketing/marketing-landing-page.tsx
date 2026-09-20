import { Suspense } from "react";
import { MarketingLanding } from "@/components/marketing/marketing-landing";

function LandingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A1C31] text-sm text-white">
      Chargement…
    </div>
  );
}

export function MarketingLandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "KlirBuild",
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            description:
              "ERP chantier, CRM, estimés, CCQ et paiements pour PME construction en Amérique du Nord et aux Caraïbes.",
            url: "https://www.klirline.app",
            provider: {
              "@type": "Organization",
              name: "Klirline Inc.",
              url: "https://www.klirline.ca/",
              email: "Contact@klirline.ca",
              areaServed: ["North America", "Caribbean"],
            },
          }),
        }}
      />
      <Suspense fallback={<LandingFallback />}>
        <MarketingLanding />
      </Suspense>
    </>
  );
}
