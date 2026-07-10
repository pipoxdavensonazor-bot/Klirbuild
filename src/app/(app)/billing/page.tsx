import { Suspense } from "react";
import BillingPage from "./billing-client";

export default function BillingRoute() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Chargement abonnements…</div>}>
      <BillingPage />
    </Suspense>
  );
}
