/** Phase B/C commerce rules — Klirline Store Haiti */

/** Commission plateforme (décision métier : fourchette 5–10 %, fixe à 8 %). */
export const KLIRLINE_COMMISSION_RATE = 0.08;

/** Délai auto-versement après « expédié » si pas de confirmation plus tôt. */
export const AUTO_PAYOUT_DAYS_AFTER_SHIP = 7;

/** Frais de livraison HTG par département (Phase C — zones Haïti). */
export const SHIPPING_FEES_HTG: Record<string, number> = {
  'Ouest': 250,
  'Nord': 400,
  'Nord-Est': 450,
  'Nord-Ouest': 450,
  'Artibonite': 350,
  'Centre': 350,
  'Sud': 400,
  'Sud-Est': 400,
  "Grand'Anse": 500,
  'Nippes': 450,
};

export const DEFAULT_SHIPPING_FEE_HTG = 350;

export function getShippingFee(department: string | null | undefined): number {
  if (!department) return DEFAULT_SHIPPING_FEE_HTG;
  return SHIPPING_FEES_HTG[department] ?? DEFAULT_SHIPPING_FEE_HTG;
}

export type FulfillmentStatus =
  | 'paid'
  | 'preparing'
  | 'shipped'
  | 'delivered'
  | 'payout_ready'
  | 'paid_out'
  | 'disputed';

export const FULFILLMENT_LABELS_FR: Record<FulfillmentStatus, string> = {
  paid: 'Payé — en séquestre',
  preparing: 'En préparation',
  shipped: 'Expédié',
  delivered: 'Livré',
  payout_ready: 'Versement prêt',
  paid_out: 'Versé au vendeur',
  disputed: 'Litige',
};

export function formatHtg(amount: number): string {
  return new Intl.NumberFormat('fr-HT', {
    style: 'currency',
    currency: 'HTG',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function sellerNetFromGross(gross: number, rate = KLIRLINE_COMMISSION_RATE): number {
  return Math.round(gross * (1 - rate) * 100) / 100;
}

export function commissionFromGross(gross: number, rate = KLIRLINE_COMMISSION_RATE): number {
  return Math.round(gross * rate * 100) / 100;
}

export function isAutoPayoutDue(shippedAt: string | null | undefined, now = Date.now()): boolean {
  if (!shippedAt) return false;
  const t = new Date(shippedAt).getTime();
  if (!Number.isFinite(t)) return false;
  return now >= t + AUTO_PAYOUT_DAYS_AFTER_SHIP * 24 * 60 * 60 * 1000;
}
