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

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Seed / demo boutiques — no real seller_id. Hidden even if seller_verified was faked. */
const SEED_DEMO_SHOPS = new Set([
  'jaden ayiti',
  'libreri lakay',
  'aqua kle',
  'atelier capois',
  'sport leogane',
  'belte lakay',
  'cafe lakay',
  'motokask securite',
  'kay soley energie',
  'energie soleil jacmel',
  'marche en fer select',
  'tech delmas express',
]);

function foldShopName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

export function isSeedDemoShop(name: string | null | undefined): boolean {
  if (!name) return false;
  return SEED_DEMO_SHOPS.has(foldShopName(name));
}

/** Public catalog: real vendor account only (KYC shop with a seller_id). */
export function isPublishedSellerProduct(p: {
  seller_id?: string | null;
  seller_shop_name?: string | null;
  brand?: string | null;
  name?: string;
}): boolean {
  const sid = (p.seller_id ?? '').trim();
  if (!UUID_RE.test(sid)) return false;
  if (isSeedDemoShop(p.seller_shop_name) || isSeedDemoShop(p.brand)) return false;
  return !isJunkProductName(p.name ?? '');
}
