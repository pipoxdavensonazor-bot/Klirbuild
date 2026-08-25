import { HAITI_MONUMENTS } from './haiti-media';
import { resolveProductImageUrl } from './kyc-upload';

const FALLBACKS = [
  HAITI_MONUMENTS.citadelleHero,
  HAITI_MONUMENTS.citadelleAbove,
  HAITI_MONUMENTS.sansSouci,
  HAITI_MONUMENTS.citadelleWide,
] as const;

export function monumentFor(seed = ''): string {
  if (!seed) return FALLBACKS[0];
  let n = 0;
  for (let i = 0; i < seed.length; i++) n += seed.charCodeAt(i) * (i + 1);
  return FALLBACKS[n % FALLBACKS.length];
}

/** Catalog photo, or a free-license Haiti monument if missing/broken. */
export function catalogImageSrc(url: string | null | undefined, seed = ''): string {
  const resolved = resolveProductImageUrl(url);
  if (resolved) return resolved;
  return monumentFor(seed);
}

export function handleBrokenImage(img: HTMLImageElement, seed = '') {
  if (img.dataset.fb === '1') return;
  img.dataset.fb = '1';
  img.src = monumentFor(seed);
}
