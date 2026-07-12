import { RequirePlan } from "@/components/auth/require-plan";
import { AnalyticsPageClient } from "@/components/analytics/analytics-page-client";

export default function AnalyticsPage() {
  return (
    <RequirePlan feature="analytics" title="Analytics — plan Growth+">
      <AnalyticsPageClient />
    </RequirePlan>
  );
}
