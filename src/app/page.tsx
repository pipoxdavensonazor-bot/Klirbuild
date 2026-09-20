import { redirect } from "next/navigation";
import { getRequestSession } from "@/lib/auth/auth-service";
import { MarketingLandingPage } from "@/components/marketing/marketing-landing-page";
import { marketingMetadata } from "@/lib/marketing/metadata";

export const metadata = marketingMetadata;

export default async function HomePage() {
  const session = await getRequestSession();
  if (session) redirect("/dashboard");
  return <MarketingLandingPage />;
}
