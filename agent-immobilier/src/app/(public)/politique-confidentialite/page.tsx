import Link from "next/link";

export const metadata = {
  title: "Politique de confidentialité",
  description:
    "Politique de confidentialité — protection des renseignements personnels (site Léonne Bien-Aimé).",
};

export default function PolitiqueConfidentialitePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <p className="text-xs uppercase tracking-[0.3em] text-[#C9A227]">Information</p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl text-[#0F172A]">
        Politique de confidentialité
      </h1>
      <div className="mt-10 space-y-8 text-sm leading-relaxed text-slate-600">
        <section>
          <h2 className="font-[family-name:var(--font-display)] text-xl text-[#0F172A]">
            Engagement
          </h2>
          <p className="mt-3">
            Léonne Bien-Aimé s&apos;engage à protéger les renseignements personnels
            transmis via ce site, conformément aux lois applicables au Québec
            (notamment la Loi 25 / Loi sur la protection des renseignements
            personnels dans le secteur privé).
          </p>
        </section>
        <section>
          <h2 className="font-[family-name:var(--font-display)] text-xl text-[#0F172A]">
            Renseignements recueillis
          </h2>
          <p className="mt-3">
            Lorsque vous utilisez le formulaire de contact, nous pouvons recueillir :
            nom, courriel, téléphone et le contenu de votre message. Ces données
            servent uniquement à répondre à votre demande et à assurer le suivi de
            votre projet immobilier.
          </p>
        </section>
        <section>
          <h2 className="font-[family-name:var(--font-display)] text-xl text-[#0F172A]">
            Utilisation et conservation
          </h2>
          <p className="mt-3">
            Les messages sont traités de façon confidentielle et conservés le temps
            nécessaire au suivi de la relation client, puis archivés ou détruits
            selon les besoins opérationnels et légaux.
          </p>
        </section>
        <section>
          <h2 className="font-[family-name:var(--font-display)] text-xl text-[#0F172A]">
            Partage
          </h2>
          <p className="mt-3">
            Vos renseignements ne sont pas vendus. Ils peuvent être partagés
            uniquement avec des partenaires nécessaires à une transaction (ex. :
            notaire, inspecteur) avec votre consentement, ou si la loi l&apos;exige.
          </p>
        </section>
        <section>
          <h2 className="font-[family-name:var(--font-display)] text-xl text-[#0F172A]">
            Vos droits
          </h2>
          <p className="mt-3">
            Vous pouvez demander l&apos;accès, la rectification ou la suppression de
            vos renseignements en écrivant à{" "}
            <a
              className="text-[#C9A227] hover:underline"
              href="mailto:bienaimeleonne_@hotmail.com"
            >
              bienaimeleonne_@hotmail.com
            </a>
            .
          </p>
        </section>
        <p>
          <Link href="/mentions-legales" className="text-[#C9A227] hover:underline">
            Mentions légales
          </Link>
          {" · "}
          <Link href="/contact" className="text-[#C9A227] hover:underline">
            Contact
          </Link>
        </p>
      </div>
    </div>
  );
}
