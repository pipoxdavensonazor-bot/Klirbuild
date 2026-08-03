import { BadgeCheck } from 'lucide-react';

type Props = {
  shopName?: string | null;
  verified?: boolean | null;
  /** Compact for product cards */
  size?: 'sm' | 'md';
  className?: string;
};

/** Klirline verification badge next to the seller shop name (KYC approved). */
export function VerifiedSellerBadge({
  shopName,
  verified,
  size = 'sm',
  className = '',
}: Props) {
  const name = shopName?.trim();
  if (!name && !verified) return null;

  const text = size === 'sm' ? 'text-[11px]' : 'text-sm';
  const icon = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {name && (
        <span className={`${text} font-semibold text-brand-dark truncate max-w-full`}>
          Boutique · {name}
        </span>
      )}
      {verified && (
        <span
          className={`inline-flex items-center gap-0.5 ${text} font-bold text-haiti-blue bg-brand-50 border border-brand/20 rounded-full px-1.5 py-0.5 shrink-0`}
          title="Vendeur vérifié par Klirline (KYC : pièce d’identité + preuve Mairie)"
        >
          <BadgeCheck className={`${icon} text-haiti-blue`} aria-hidden />
          Vérifié Klirline
        </span>
      )}
    </div>
  );
}
