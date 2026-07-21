import { ContactForm } from "@/components/contact/contact-form";
import { prisma } from "@/lib/prisma";
import { whatsappLink } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Contact",
  description:
    "Contactez Léonne Bien-Aimé, courtière immobilière — évaluation, achat, vente, rendez-vous.",
};

export default async function ContactPage() {
  const profile = await prisma.profile.findFirst();
  const phone = profile?.phone ?? "(514) 574-8712";
  const email = profile?.email ?? "bienaimeleonne_@hotmail.com";

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <p className="text-xs uppercase tracking-[0.3em] text-[#C9A227]">Contact</p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl text-[#0F172A]">
        Parlons de votre projet
      </h1>
      <p className="mt-4 max-w-2xl text-slate-600">
        Une question, une évaluation, une visite ? Écrivez-moi ou appelez — je vous
        réponds rapidement.
      </p>

      <div className="mt-12 grid gap-10 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-2">
          <div className="border border-slate-200 bg-white p-6">
            <h2 className="font-[family-name:var(--font-display)] text-xl text-[#0F172A]">
              Coordonnées
            </h2>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <p>
                Téléphone :{" "}
                <a className="font-medium text-[#0F172A] hover:underline" href={`tel:${phone}`}>
                  {phone}
                </a>
              </p>
              <p>
                Courriel :{" "}
                <a
                  className="font-medium text-[#0F172A] hover:underline"
                  href={`mailto:${email}`}
                >
                  {email}
                </a>
              </p>
              <p>
                {profile?.address ?? "3899, aut. des Laurentides #200"}
                <br />
                {profile?.city ?? "Laval (QC) H7L 3H7"}
              </p>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild variant="gold" size="sm">
                <a href={`tel:${phone}`}>Appeler</a>
              </Button>
              <Button asChild variant="outline" size="sm">
                <a
                  href={whatsappLink("Bonjour Léonne, je souhaite prendre rendez-vous.")}
                  target="_blank"
                  rel="noreferrer"
                >
                  WhatsApp
                </a>
              </Button>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Courtière immobilière · PROPRIO DIRECT · OACIQ. Vos renseignements restent
            confidentiels.
          </p>
        </div>

        <div className="lg:col-span-3">
          <ContactForm defaultSubject="Demande d'information" />
        </div>
      </div>
    </div>
  );
}
