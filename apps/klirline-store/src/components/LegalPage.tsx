import { ArrowLeft } from 'lucide-react';
import { useEffect } from 'react';
import type { LegalSlug } from '../lib/routing';
import { applyHomeSeo, applyLegalSeo } from '../lib/seo';

const PAGES: Record<
  LegalSlug,
  { title: string; body: string[] }
> = {
  cgv: {
    title: 'Conditions générales de vente',
    body: [
      'KlirMarket (Klirline Inc.) est une marketplace multi-vendeurs en Haïti. Les prix sont en HTG. Le paiement peut être effectué par MonCash, NatCash ou carte (Stripe), selon les moyens activés.',
      'Chaque commande est placée sous séquestre jusqu’à confirmation de livraison. La commission plateforme est de 8 % du montant marchandise (hors frais de livraison).',
      'Les vendeurs doivent valider un KYC (pièce d’identité + selfie + preuve Mairie) avant de publier des produits.',
      'Contact : Contact@klirline.ca',
    ],
  },
  confidentialite: {
    title: 'Confidentialité',
    body: [
      'Nous collectons les données nécessaires au compte, à la livraison et au paiement (nom, téléphone, adresse, email).',
      'Les documents KYC vendeur sont stockés de façon privée et accessibles à l’équipe Klirline pour vérification.',
      'Les paiements carte sont traités par Stripe ; MonCash / NatCash par les opérateurs Digicel / Natcom. Klirline ne stocke pas les numéros de carte complets.',
      'Pour toute demande d’accès ou de suppression : Contact@klirline.ca',
    ],
  },
  litiges: {
    title: 'Litiges & réclamations',
    body: [
      'Si un article ne correspond pas à l’annonce, contactez le support WhatsApp sous 48 h après confirmation de livraison.',
      'Klirline et le vendeur examinent la demande avant remboursement, échange ou rejet motivé.',
      'Les fonds en séquestre peuvent être retenus pendant l’examen du litige.',
    ],
  },
  retours: {
    title: 'Retours sous 48 h',
    body: [
      'Les retours sont acceptés sous 48 h après confirmation de livraison lorsque l’article reçu ne correspond pas à l’annonce.',
      'Ouvrez une réclamation via WhatsApp support en indiquant le numéro de commande et des photos.',
      'Le remboursement, s’il est accordé, suit le moyen de paiement d’origine lorsque possible.',
    ],
  },
  sequestre: {
    title: 'Séquestre',
    body: [
      'Votre paiement est conservé jusqu’à confirmation de livraison (preuve photo / signature côté vendeur).',
      'Le vendeur n’est crédité qu’après cette étape, moins la commission Klirline (8 %).',
      'En cas de litige ouvert dans les délais, le séquestre peut être prolongé jusqu’à décision.',
    ],
  },
};

type LegalPageProps = {
  slug: LegalSlug;
  onBack: () => void;
  onNavigateLegal: (slug: LegalSlug) => void;
};

export function LegalPage({ slug, onBack, onNavigateLegal }: LegalPageProps) {
  const page = PAGES[slug];
  const others = (Object.keys(PAGES) as LegalSlug[]).filter(s => s !== slug);

  useEffect(() => {
    applyLegalSeo(slug, page.title);
    return () => {
      applyHomeSeo();
    };
  }, [slug, page.title]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm text-brand hover:text-brand-mid mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour boutique
      </button>
      <h1 className="text-3xl font-display font-bold text-brand-dark mb-6">{page.title}</h1>
      <div className="space-y-4 text-slate-700 leading-relaxed">
        {page.body.map(p => (
          <p key={p.slice(0, 40)}>{p}</p>
        ))}
      </div>
      <div className="mt-10 pt-6 border-t border-gray-200 flex flex-wrap gap-3">
        {others.map(s => (
          <button
            key={s}
            type="button"
            onClick={() => onNavigateLegal(s)}
            className="text-sm text-brand underline underline-offset-2 hover:text-brand-mid"
          >
            {PAGES[s].title}
          </button>
        ))}
      </div>
    </div>
  );
}
