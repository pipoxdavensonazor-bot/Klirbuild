import { Suspense } from "react";
import { RequirePermission } from "@/components/auth/require-permission";
import { RequirePlan } from "@/components/auth/require-plan";
import { SocialAdsPageClient } from "@/components/social-ads/social-ads-page-client";

export default function SocialMarketingPage() {
  return (
    <RequirePermission permission={["crm:write", "settings:manage", "analytics:read"]}>
      <RequirePlan feature="social_ads" title="Pubs réseaux — plan Business+">
        <Suspense fallback={<p className="p-8 text-muted-foreground">Chargement…</p>}>
          <SocialAdsPageClient />
        </Suspense>
      </RequirePlan>
    </RequirePermission>
  );
}
