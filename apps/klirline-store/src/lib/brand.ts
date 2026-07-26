/** Klirline Store brand tokens — aligned with KlirlineOS. */
export const BRAND = {
  name: 'Klirline',
  product: 'Klirline Store',
  market: 'Haiti',
  tagline: 'Shop & Pay with MonCash',
  primary: '#004F6E',
  primaryDark: '#0A1C31',
  primaryMid: '#1A365D',
  accent: '#D4AF37',
  accentHover: '#C4A574',
} as const;

export const NAV_DEPT_MAP: Record<string, string> = {
  Electronics: 'Electronics',
  Books: 'Books',
  Fashion: 'Clothing & Fashion',
  Home: 'Home & Kitchen',
};

/** Heuristic: throwaway / test listings that should not appear in the catalog. */
export function isJunkProductName(name: string): boolean {
  const n = name.trim();
  if (n.length < 4) return true;
  if (/^(test|asdf|xxx|foo|bar|try|tmp)$/i.test(n)) return true;
  // All-caps short codes / single nonsense tokens without spaces
  if (n.length <= 6 && !/\s/.test(n) && /^[A-Za-z]+$/.test(n) && n === n.toUpperCase()) {
    return true;
  }
  const junkExact = new Set(['diven', 'try', 'kepi', 'test', 'demo']);
  return junkExact.has(n.toLowerCase());
}
