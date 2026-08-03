/** KlirMarket brand tokens — Haiti marketplace (Klirline Inc.). */
export const BRAND = {
  name: 'KlirMarket',
  product: 'KlirMarket',
  company: 'Klirline Inc.',
  market: 'Haiti',
  tagline: 'Achte · Livrezon · MonCash',
  taglineFr: 'Achetez en Haïti · Payez avec MonCash',
  cartIcon: '/klirmarket-cart.png',
  primary: '#004F6E',
  primaryDark: '#0A1C31',
  primaryMid: '#1A365D',
  accent: '#D4AF37',
  accentHover: '#C4A574',
  /** Haitian flag blue — sparse accent only */
  haitiBlue: '#00209F',
  /** Haitian flag red — sparse accent only */
  haitiRed: '#D21034',
  seaMist: '#E8F1F4',
  sand: '#F3EDE4',
} as const;

/**
 * Soft-launch payment flags (build-time via Cloudflare / .env).
 * MonCash is on — Digicel Rest API wired in moncash-payment (see docs/moncash/).
 * Set VITE_ENABLE_MONCASH=false to hide it. NatCash stays off until secrets exist.
 */
export const PAYMENTS = {
  stripe: true,
  moncash: import.meta.env.VITE_ENABLE_MONCASH !== 'false',
  natcash: import.meta.env.VITE_ENABLE_NATCASH === 'true',
} as const;

export const SOFT_LAUNCH = true;

export const NAV_DEPT_MAP: Record<string, string> = {
  Electronics: 'Electronics',
  Books: 'Books',
  Fashion: 'Clothing & Fashion',
  Home: 'Home & Kitchen',
};

/** Map category name → shop department filter key. */
export const CATEGORY_TO_DEPARTMENT: Record<string, string> = {
  Electronics: 'Electronics',
  Books: 'Books',
  Clothing: 'Clothing & Fashion',
  'Home & Kitchen': 'Home & Kitchen',
  Sports: 'Sports & Outdoors',
  'Sports & Outdoors': 'Sports & Outdoors',
  Beauty: 'Beauty & Personal Care',
  Automotive: 'Automotive',
  Garden: 'Garden',
  Health: 'Health',
  Food: 'Home & Kitchen',
};

/** Display labels for catalog department keys (DB values stay English). */
export const DEPARTMENT_LABELS: Record<string, { fr: string; ht: string }> = {
  Electronics: { fr: 'Électronique', ht: 'Elektwonik' },
  Books: { fr: 'Livres', ht: 'Liv' },
  'Clothing & Fashion': { fr: 'Mode & Vêtements', ht: 'Mòd ak Rad' },
  'Home & Kitchen': { fr: 'Maison & Cuisine', ht: 'Kay & Kwizin' },
  'Sports & Outdoors': { fr: 'Sport & Plein air', ht: 'Espò & Deyò' },
  'Toys & Games': { fr: 'Jeux & Jouets', ht: 'Jwèt' },
  'Beauty & Personal Care': { fr: 'Beauté & Soins', ht: 'Bote & Swen' },
  Automotive: { fr: 'Auto', ht: 'Oto' },
  Garden: { fr: 'Jardin', ht: 'Jaden' },
  Health: { fr: 'Santé', ht: 'Sante' },
};

export function labelDepartment(
  department: string,
  locale: 'fr' | 'ht' = 'fr',
): string {
  const entry = DEPARTMENT_LABELS[department];
  if (!entry) return department;
  return locale === 'ht' ? entry.ht : entry.fr;
}

/** Heuristic: throwaway / test listings that should not appear in the catalog. */
export function isJunkProductName(name: string): boolean {
  const n = name.trim();
  if (n.length < 4) return true;
  if (/^(test|asdf|xxx|foo|bar|try|tmp)$/i.test(n)) return true;
  if (n.length <= 6 && !/\s/.test(n) && /^[A-Za-z]+$/.test(n) && n === n.toUpperCase()) {
    return true;
  }
  const junkExact = new Set(['diven', 'try', 'kepi', 'test', 'demo']);
  return junkExact.has(n.toLowerCase());
}
