import Link from "next/link";
import { KlirBuildLogo } from "@/components/brand/klirline-logo";
import { AppFooter } from "@/components/layout/app-footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Politique de confidentialité — KlirBuild",
  description: "Politique de confidentialité de KlirBuild par Klirline Inc.",
};

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center px-4 py-10">
        <KlirBuildLogo className="mb-6 h-[52px] w-[148px]" />
        <Card>
          <CardHeader>
            <CardTitle>Politique de confidentialité</CardTitle>
            <p className="text-sm text-muted-foreground">
              Dernière mise à jour : 10 juillet 2026 · Klirline Inc.
            </p>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none space-y-4 text-sm text-muted-foreground dark:prose-invert">
            <p>
              KlirBuild (« nous ») est exploité par Klirline Inc. Cette politique décrit comment
              nous collectons, utilisons et protégeons vos données lorsque vous utilisez notre
              plateforme de gestion construction.
            </p>
            <h2 className="text-base font-semibold text-foreground">Données collectées</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>Informations de compte (nom, email, entreprise)</li>
              <li>Données d&apos;abonnement et de facturation (via Stripe)</li>
              <li>Données opérationnelles (clients, chantiers, factures, pointage)</li>
              <li>Données techniques (logs, adresse IP, cookies de session)</li>
            </ul>
            <h2 className="text-base font-semibold text-foreground">Utilisation</h2>
            <p>
              Nous utilisons vos données pour fournir le service, gérer les abonnements,
              assurer la sécurité, améliorer la plateforme et respecter nos obligations légales.
            </p>
            <h2 className="text-base font-semibold text-foreground">Paiements</h2>
            <p>
              Les paiements sont traités par Stripe. Nous ne stockons pas vos numéros de carte
              complets sur nos serveurs.
            </p>
            <h2 className="text-base font-semibold text-foreground">Conservation & droits</h2>
            <p>
              Vous pouvez demander l&apos;accès, la correction ou la suppression de vos données en
              contactant{" "}
              <a href="mailto:Contact@klirline.ca" className="text-brand-600 hover:underline">
                Contact@klirline.ca
              </a>
              .
            </p>
            <p>
              <Link href="/terms" className="text-brand-600 hover:underline">
                Conditions d&apos;utilisation
              </Link>
              {" · "}
              <Link href="https://www.klirline.ca/" className="text-brand-600 hover:underline" target="_blank" rel="noreferrer">
                klirline.ca
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
      <AppFooter />
    </div>
  );
}
