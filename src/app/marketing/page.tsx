import { MarketingLandingPage } from "@/components/marketing/marketing-landing-page";
import { marketingMetadata } from "@/lib/marketing/metadata";

export const metadata = marketingMetadata;

/** Alias public (does not collide with authenticated `/construction/marketing`). */
export default function MarketingAliasPage() {
  return <MarketingLandingPage />;
}
