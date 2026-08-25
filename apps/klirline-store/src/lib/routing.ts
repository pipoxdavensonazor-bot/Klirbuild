/** Lightweight path helpers for Klirline Store SPA (no react-router). */

const PRODUCT_PREFIX = '/produit/';

export type LegalSlug = 'cgv' | 'confidentialite' | 'litiges' | 'retours' | 'sequestre';

const LEGAL_PATHS: Record<LegalSlug, string> = {
  cgv: '/cgv',
  confidentialite: '/confidentialite',
  litiges: '/litiges',
  retours: '/retours',
  sequestre: '/sequestre',
};

const PATH_TO_LEGAL = Object.fromEntries(
  Object.entries(LEGAL_PATHS).map(([slug, path]) => [path, slug]),
) as Record<string, LegalSlug>;

export function productPath(productId: string): string {
  return `${PRODUCT_PREFIX}${encodeURIComponent(productId)}`;
}

export function legalPath(slug: LegalSlug): string {
  return LEGAL_PATHS[slug];
}

export function parseProductIdFromPath(pathname = window.location.pathname): string | null {
  if (!pathname.startsWith(PRODUCT_PREFIX)) return null;
  const id = decodeURIComponent(pathname.slice(PRODUCT_PREFIX.length).split('/')[0] ?? '');
  return id || null;
}

export function parseLegalSlugFromPath(pathname = window.location.pathname): LegalSlug | null {
  const clean = pathname.replace(/\/$/, '') || '/';
  return PATH_TO_LEGAL[clean] ?? null;
}

export function parseAdminFromPath(pathname = window.location.pathname): boolean {
  const clean = pathname.replace(/\/$/, '') || '/';
  return clean === '/admin';
}

export function adminPath(): string {
  return '/admin';
}

export function navigateTo(path: string, replace = false) {
  const url = path.startsWith('/') ? path : `/${path}`;
  if (replace) {
    window.history.replaceState({}, '', url);
  } else if (window.location.pathname !== url) {
    window.history.pushState({}, '', url);
  }
}

export function productAbsoluteUrl(productId: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://klirline.com';
  return `${origin}${productPath(productId)}`;
}
