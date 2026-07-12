import { Suspense } from "react";
import { InvoicesPageClient } from "@/components/invoices/invoices-page-client";

export default function InvoicesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Chargement factures…</div>}>
      <InvoicesPageClient />
    </Suspense>
  );
}
