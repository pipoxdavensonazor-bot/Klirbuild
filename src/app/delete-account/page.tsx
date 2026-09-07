import Link from "next/link";
import { KlirBuildLogo } from "@/components/brand/klirline-logo";
import { AppFooter } from "@/components/layout/app-footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Suppression de compte — KlirBuild",
  description:
    "Comment demander la suppression de votre compte et de vos données KlirBuild.",
};

export default function DeleteAccountPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center px-4 py-10">
        <KlirBuildLogo className="mb-6 h-[52px] w-[148px]" />
        <Card>
          <CardHeader>
            <CardTitle>Suppression de compte</CardTitle>
            <p className="text-sm text-muted-foreground">
              KlirBuild · Klirline Inc. · Dernière mise à jour : 7 septembre 2026
            </p>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              Vous pouvez demander la suppression de votre compte KlirBuild et des données
              personnelles associées à tout moment.
            </p>

            <h2 className="text-base font-semibold text-foreground">Comment procéder</h2>
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                Envoyez un courriel depuis l&apos;adresse associée à votre compte à{" "}
                <a
                  href="mailto:Contact@klirline.ca?subject=Suppression%20de%20compte%20KlirBuild"
                  className="text-brand-600 hover:underline"
                >
                  Contact@klirline.ca
                </a>{" "}
                avec l&apos;objet « Suppression de compte KlirBuild ».
              </li>
              <li>
                Indiquez le nom de votre entreprise / espace KlirBuild et confirmez que vous
                êtes le titulaire du compte.
              </li>
              <li>
                Nous traitons la demande sous <strong className="text-foreground">30 jours</strong>{" "}
                (souvent plus rapidement). Vous recevrez une confirmation par courriel.
              </li>
            </ol>

            <h2 className="text-base font-semibold text-foreground">
              Ce qui est supprimé
            </h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>Compte utilisateur et identifiants</li>
              <li>Données de profil et d&apos;entreprise liées au compte</li>
              <li>
                Données opérationnelles du compte (clients, projets, documents) — sauf
                obligations légales de conservation (ex. facturation)
              </li>
            </ul>

            <h2 className="text-base font-semibold text-foreground">
              Suppression partielle (sans fermer le compte)
            </h2>
            <p>
              Pour demander la suppression de certaines données seulement (sans supprimer tout
              le compte), écrivez aussi à{" "}
              <a href="mailto:Contact@klirline.ca" className="text-brand-600 hover:underline">
                Contact@klirline.ca
              </a>{" "}
              en précisant les données concernées.
            </p>

            <p>
              <Link href="/privacy" className="text-brand-600 hover:underline">
                Politique de confidentialité
              </Link>
              {" · "}
              <Link href="/terms" className="text-brand-600 hover:underline">
                Conditions d&apos;utilisation
              </Link>
              {" · "}
              <Link href="/" className="text-brand-600 hover:underline">
                Accueil
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
      <AppFooter />
    </div>
  );
}
