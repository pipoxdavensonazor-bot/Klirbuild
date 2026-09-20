import { Suspense } from "react";
import { DemoContactForm } from "@/components/marketing/demo-contact-form";
import { contactMetadata } from "@/lib/marketing/metadata";

export const metadata = contactMetadata;

export default function ContactPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F4F6F8] text-sm text-[#0A1C31]">
          Chargement…
        </div>
      }
    >
      <DemoContactForm />
    </Suspense>
  );
}
