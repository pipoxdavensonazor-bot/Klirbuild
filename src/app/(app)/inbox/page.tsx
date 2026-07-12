import { Suspense } from "react";
import { InboxPageClient } from "@/components/inbox/inbox-page-client";

export default function InboxPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Chargement…</div>}>
      <InboxPageClient />
    </Suspense>
  );
}
