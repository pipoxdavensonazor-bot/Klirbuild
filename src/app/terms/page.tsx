import Link from "next/link";
import { KlirBuildLogo } from "@/components/brand/klirline-logo";
import { AppFooter } from "@/components/layout/app-footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Conditions d'utilisation — KlirBuild",
  description: "Conditions d'utilisation de KlirBuild par Klirline Inc.",
};

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <KlirBuildLogo className="mb-6 h-[64px] w-[180px]" />
        <Card>
          <CardHeader>
            <CardTitle>Conditions d&apos;utilisation</CardTitle>
            <p className="text-sm text-muted-foreground">
              Dernière mise à jour : 10 juillet 2026 · Klirline Inc.
            </p>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              En utilisant KlirBuild, vous acceptez ces conditions. Le service est fourni par
              Klirline Inc. (« Klirline ») sous forme d&apos;abonnement SaaS.
            </p>
            <h2 className="text-base font-semibold text-foreground">Compte & accès</h2>
            <p>
              Vous êtes responsable de la confidentialité de vos identifiants. L&apos;accès aux
              modules dépend du plan souscrit (Starter, Growth, Business, Enterprise).
            </p>
            <h2 className="text-base font-semibold text-foreground">Abonnements</h2>
            <p>
              Les abonnements sont facturés via Stripe. Un essai de 14 jours peut s&apos;appliquer
              selon le plan. Les tarifs et limites sont décrits sur la page{" "}
              <Link href="/billing" className="text-brand-600 hover:underline">
                Abonnements
              </Link>
              .
            </p>
            <h2 className="text-base font-semibold text-foreground">Usage acceptable</h2>
            <p>
              Vous ne devez pas utiliser KlirBuild pour des activités illégales, abuser des
              ressources, ou tenter d&apos;accéder à des données d&apos;autres clients.
            </p>
            <h2 className="text-base font-semibold text-foreground">Contact</h2>
            <p>
              Questions :{" "}
              <a href="mailto:Contact@klirline.ca" className="text-brand-600 hover:underline">
                Contact@klirline.ca
              </a>
            </p>
            <p>
              <Link href="/privacy" className="text-brand-600 hover:underline">
                Politique de confidentialité
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
      <AppFooter />
    </div>
  );
}
