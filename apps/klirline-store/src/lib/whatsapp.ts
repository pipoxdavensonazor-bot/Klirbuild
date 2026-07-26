/** WhatsApp deep links for Haiti seller/buyer flows */

const DEFAULT_SUPPORT = '50937000000'; // replace via VITE_WHATSAPP_SUPPORT

export function getSupportWhatsApp(): string {
  const raw = (import.meta.env.VITE_WHATSAPP_SUPPORT as string | undefined)?.replace(/\D/g, '');
  return raw && raw.length >= 8 ? raw : DEFAULT_SUPPORT;
}

export function waMeUrl(phoneDigits: string, text: string): string {
  const phone = phoneDigits.replace(/\D/g, '');
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export function supportWhatsAppUrl(locale: 'fr' | 'ht' = 'fr'): string {
  const msg =
    locale === 'ht'
      ? 'Bonjou Klirline, m bezwen èd sou magazen an.'
      : 'Bonjour Klirline, j’ai besoin d’aide sur la boutique.';
  return waMeUrl(getSupportWhatsApp(), msg);
}

export function orderPaidWhatsAppUrl(opts: {
  sellerPhone?: string | null;
  orderId: string;
  buyerName?: string;
  city?: string;
  locale?: 'fr' | 'ht';
}): string | null {
  const phone = (opts.sellerPhone || '').replace(/\D/g, '');
  if (phone.length < 8) return null;
  const short = opts.orderId.slice(0, 8).toUpperCase();
  const msg =
    opts.locale === 'ht'
      ? `Bonjou, mwen fèk peye lòd #${short} sou Klirline Store. Vil: ${opts.city || '—'}. Tanpri prepare livrezon an.`
      : `Bonjour, je viens de payer la commande #${short} sur Klirline Store. Ville: ${opts.city || '—'}. Merci de préparer la livraison.`;
  return waMeUrl(phone.startsWith('509') ? phone : `509${phone}`, msg);
}

export function normalizeHaitiPhone(input: string): string {
  let d = input.replace(/\D/g, '');
  if (d.startsWith('509')) return `+${d}`;
  if (d.length === 8) return `+509${d}`;
  if (d.startsWith('0')) d = d.slice(1);
  return d.startsWith('+') ? d : `+${d}`;
}
