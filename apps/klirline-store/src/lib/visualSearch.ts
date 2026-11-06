import { CATEGORY_TO_DEPARTMENT, isJunkProductName, isSellerListedProduct } from './brand';
import type { Product } from './supabase';

export const VISUAL_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
export const VISUAL_IMAGE_HARD_MAX_BYTES = 20 * 1024 * 1024;
export const RELIABLE_SIMILARITY = 0.28;

export const VISUAL_COPY = {
  resultsTitle: 'Résultats pour votre photo',
  busy: 'Recherche en cours…',
  emptyShop: 'Aucun produit vu pour le moment.',
  noMatch: 'Aucun produit proche de votre photo.',
  unreliable:
    'Correspondance incertaine. Ces articles sont les plus proches de votre photo, sans garantie. Affinez avec la recherche par texte.',
  textFallback: 'La recherche par texte reste disponible dans la barre ci-dessus.',
  demo: 'La recherche par photo nécessite la boutique en ligne. Aucun produit démo n’est proposé.',
  config: 'La recherche par photo n’est pas disponible pour le moment. Utilisez la recherche par texte.',
  tooBig: 'Image trop lourde (maximum 2 Mo).',
  badType: 'Format non accepté. Utilisez JPEG, PNG ou WebP.',
  emptyFile: 'Fichier image vide.',
  rateLimit: 'Trop de recherches par photo. Réessayez dans un moment.',
  cameraDenied: 'Caméra indisponible. Importez une photo à la place.',
} as const;

const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

export type VisualImageFile = { type: string; size: number; name?: string };

export function isAcceptedVisualType(file: VisualImageFile): boolean {
  const type = (file.type || '').toLowerCase();
  if (ACCEPTED_TYPES.has(type)) return true;
  const name = (file.name || '').toLowerCase();
  return (type === '' || type === 'application/octet-stream') && /\.(jpe?g|png|webp)$/.test(name);
}

export function validateVisualImage(
  file: VisualImageFile,
): { ok: true } | { ok: false; error: string } {
  if (!file || file.size <= 0) return { ok: false, error: VISUAL_COPY.emptyFile };
  if (!isAcceptedVisualType(file)) return { ok: false, error: VISUAL_COPY.badType };
  if (file.size > VISUAL_IMAGE_MAX_BYTES) return { ok: false, error: VISUAL_COPY.tooBig };
  return { ok: true };
}

export type VisualSearchView = {
  products: Product[];
  reliable: boolean;
  notice: string | null;
  error: string | null;
  emptyCatalog: boolean;
};

type RawRow = Record<string, unknown>;

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  return value.filter((item): item is string => typeof item === 'string');
}

function rowToProduct(row: RawRow): Product | null {
  const sellerId = typeof row.seller_id === 'string' ? row.seller_id : null;
  const name = asString(row.name);
  if (!isSellerListedProduct({ seller_id: sellerId })) return null;
  if (row.published === false) return null;
  if (!name || isJunkProductName(name)) return null;
  const categoryName = asString(row.category_name);
  const imageUrl = asString(row.image_url);
  if (!imageUrl) return null;
  const department = asString(row.department) ||
    (categoryName ? CATEGORY_TO_DEPARTMENT[categoryName] ?? categoryName : null);
  return {
    id: asString(row.id),
    name,
    description: asString(row.description),
    price: asNumber(row.price),
    original_price: row.original_price == null ? null : asNumber(row.original_price),
    deal_price: row.deal_price == null ? null : asNumber(row.deal_price),
    deal_ends_at: typeof row.deal_ends_at === 'string' ? row.deal_ends_at : null,
    image_url: imageUrl,
    images: asStringArray(row.images, [imageUrl]),
    about_items: asStringArray(row.about_items, []),
    variants: Array.isArray(row.variants) ? row.variants as Product['variants'] : [],
    category_id: asString(row.category_id),
    department,
    seller_department: typeof row.seller_department === 'string' ? row.seller_department : null,
    seller_id: sellerId,
    published: row.published !== false,
    rating: asNumber(row.rating),
    review_count: asNumber(row.review_count),
    in_stock: row.in_stock !== false,
    badge: typeof row.badge === 'string' ? row.badge : null,
    featured: Boolean(row.featured),
    sponsored: Boolean(row.sponsored),
    view_count: asNumber(row.view_count),
    brand: typeof row.brand === 'string' ? row.brand : null,
    seller_shop_name: typeof row.seller_shop_name === 'string' ? row.seller_shop_name : null,
    seller_verified: typeof row.seller_verified === 'boolean' ? row.seller_verified : null,
    created_at: asString(row.created_at),
  };
}

function errorMessage(payload: RawRow): string {
  const code = asString(payload.code);
  if (code === 'rate_limit') return VISUAL_COPY.rateLimit;
  if (code === 'clip_runtime' || code === 'migration_required') return VISUAL_COPY.config;
  const error = asString(payload.error);
  if (
    error === VISUAL_COPY.tooBig ||
    error === VISUAL_COPY.badType ||
    error === VISUAL_COPY.emptyFile ||
    error.startsWith('Impossible de lire') ||
    error.startsWith('Image trop')
  ) {
    return error;
  }
  return VISUAL_COPY.config;
}

/**
 * Maps the Edge response onto catalog cards.
 * Never invents demo products. Seller-less and unpublished rows are dropped.
 */
export function mapVisualSearchPayload(
  payload: unknown,
  options?: { catalogEmpty?: boolean },
): VisualSearchView {
  const catalogEmpty = Boolean(options?.catalogEmpty);
  if (!payload || typeof payload !== 'object') {
    return {
      products: [],
      reliable: false,
      notice: VISUAL_COPY.textFallback,
      error: VISUAL_COPY.config,
      emptyCatalog: false,
    };
  }
  const body = payload as RawRow;
  const rows = Array.isArray(body.results) ? body.results : null;
  if (!rows) {
    return {
      products: [],
      reliable: false,
      notice: VISUAL_COPY.textFallback,
      error: errorMessage(body),
      emptyCatalog: false,
    };
  }

  const kept = rows
    .filter((row): row is RawRow => Boolean(row) && typeof row === 'object')
    .map((row) => {
      const product = rowToProduct(row);
      return product ? { product, similarity: asNumber(row.similarity, Number.NaN) } : null;
    })
    .filter((row): row is { product: Product; similarity: number } => row !== null);

  const products = kept.map((row) => row.product);
  const scores = kept.map((row) => row.similarity).filter((n) => Number.isFinite(n));
  const best = scores.length ? Math.max(...scores) : 0;
  const reliable = products.length > 0 && best >= RELIABLE_SIMILARITY;

  if (products.length === 0 && catalogEmpty) {
    return {
      products: [],
      reliable: false,
      notice: VISUAL_COPY.emptyShop,
      error: null,
      emptyCatalog: true,
    };
  }
  if (products.length === 0) {
    return {
      products: [],
      reliable: false,
      notice: `${VISUAL_COPY.noMatch} ${VISUAL_COPY.textFallback}`,
      error: null,
      emptyCatalog: false,
    };
  }
  return {
    products,
    reliable,
    notice: reliable ? null : `${VISUAL_COPY.unreliable} ${VISUAL_COPY.textFallback}`,
    error: null,
    emptyCatalog: false,
  };
}

export async function prepareVisualImage(
  file: File,
): Promise<{ ok: true; file: File } | { ok: false; error: string }> {
  if (!file || file.size <= 0) return { ok: false, error: VISUAL_COPY.emptyFile };
  if (!isAcceptedVisualType(file)) return { ok: false, error: VISUAL_COPY.badType };
  if (file.size > VISUAL_IMAGE_HARD_MAX_BYTES) return { ok: false, error: VISUAL_COPY.tooBig };

  const resized = await downscaleToJpeg(file);
  const candidate = resized ?? file;
  return validateVisualImage(candidate).ok
    ? { ok: true, file: candidate }
    : { ok: false, error: VISUAL_COPY.tooBig };
}

async function downscaleToJpeg(file: File): Promise<File | null> {
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return null;
  try {
    const bitmap = await createImageBitmap(file);
    const maxEdge = 768;
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close?.();
      return null;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.86);
    });
    if (!blob || blob.size <= 0 || blob.size > VISUAL_IMAGE_MAX_BYTES) return null;
    return new File([blob], 'photo.jpg', { type: 'image/jpeg' });
  } catch {
    return null;
  }
}
