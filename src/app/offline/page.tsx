import Link from "next/link";
import { KlirBuildLogo } from "@/components/brand/klirline-logo";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[linear-gradient(180deg,#f5f6f8,#e8ecf1)] p-6 text-center">
      <KlirBuildLogo className="h-12 w-40" />
      <h1 className="text-xl font-semibold">Hors ligne</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        KlirBuild est hors réseau. Certaines pages en cache restent disponibles.
        Rétablissez la connexion pour synchroniser.
      </p>
      <Link
        href="/dashboard"
        className="inline-flex h-10 items-center rounded-md bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600"
      >
        Réessayer
      </Link>
    </div>
  );
}
