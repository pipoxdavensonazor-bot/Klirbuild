import Link from "next/link";

export const metadata = {
  title: "Mentions légales",
  description: "Mentions légales du site Léonne Bien-Aimé, courtière immobilière.",
};

export default function MentionsLegalesPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <p className="text-xs uppercase tracking-[0.3em] text-[#C9A227]">Information</p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl text-[#0F172A]">
        Mentions légales
      </h1>
      <div className="mt-10 space-y-8 text-sm leading-relaxed text-slate-600">
        <section>
          <h2 className="font-[family-name:var(--font-display)] text-xl text-[#0F172A]">
            Éditeur du site
          </h2>
          <p className="mt-3">
            Léonne Bien-Aimé — courtière immobilière résidentielle
            <br />
            Agence : PROPRIO DIRECT
            <br />
            Permis OACIQ
            <br />
            3899, aut. des Laurentides #200, Laval (QC) H7L 3H7
            <br />
            Téléphone : (514) 574-8712
            <br />
            Courriel : bienaimeleonne_@hotmail.com
          </p>
        </section>
        <section>
          <h2 className="font-[family-name:var(--font-display)] text-xl text-[#0F172A]">
            Objet du site
          </h2>
          <p className="mt-3">
            Ce site présente les services de courtage immobilier, les propriétés
            disponibles, les articles-conseils et les événements organisés par
            Léonne Bien-Aimé. Les informations sont fournies à titre indicatif et
            peuvent être mises à jour sans préavis.
          </p>
        </section>
        <section>
          <h2 className="font-[family-name:var(--font-display)] text-xl text-[#0F172A]">
            Propriétés et prix
          </h2>
          <p className="mt-3">
            Les fiches propriétés, photos, prix et disponibilités sont sujets à
            changement. Une visite et une vérification auprès de la courtière
            demeurent nécessaires avant toute décision. Les transactions
            immobilières au Québec sont régies par la Loi sur le courtage
            immobilier et encadrées par l&apos;OACIQ.
          </p>
        </section>
        <section>
          <h2 className="font-[family-name:var(--font-display)] text-xl text-[#0F172A]">
            Propriété intellectuelle
          </h2>
          <p className="mt-3">
            Textes, photos et éléments graphiques du site sont protégés. Toute
            reproduction non autorisée est interdite.
          </p>
        </section>
        <p>
          <Link href="/politique-confidentialite" className="text-[#C9A227] hover:underline">
            Politique de confidentialité
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
