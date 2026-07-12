import { Suspense } from "react";
import { RequirePermission } from "@/components/auth/require-permission";
import BillingPage from "./billing-client";

export default function BillingRoute() {
  return (
    <RequirePermission permission="settings:manage">
      <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Chargement abonnements…</div>}>
        <BillingPage />
      </Suspense>
    </RequirePermission>
  );
}
