import { MarketingLandingPage } from "@/components/marketing/marketing-landing-page";
import { marketingMetadata } from "@/lib/marketing/metadata";

export const metadata = marketingMetadata;

/** Alias public — always the landing, even if the visitor is signed in. */
export default function AccueilPage() {
  return <MarketingLandingPage />;
}
