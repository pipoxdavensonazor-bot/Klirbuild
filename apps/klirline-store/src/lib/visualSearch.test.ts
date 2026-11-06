import { expect, test } from 'vitest';
import {
  RELIABLE_SIMILARITY,
  VISUAL_COPY,
  VISUAL_IMAGE_MAX_BYTES,
  mapVisualSearchPayload,
  validateVisualImage,
} from './visualSearch';

const sellerProduct = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Lampe solaire portable',
  description: 'Éclairage pour la maison',
  price: 4500,
  image_url: 'https://cdn.example/lampe.jpg',
  images: ['https://cdn.example/lampe.jpg'],
  category_id: 'cat-1',
  category_name: 'Electronics',
  seller_id: '22222222-2222-2222-2222-222222222222',
  published: true,
  rating: 4.5,
  review_count: 3,
  in_stock: true,
  brand: 'Kay Solèy',
  similarity: 0.41,
};

test('validateVisualImage accepte jpeg, png et webp sous 2 Mo', () => {
  expect(validateVisualImage({ type: 'image/jpeg', size: 1200, name: 'a.jpg' })).toEqual({ ok: true });
  expect(validateVisualImage({ type: 'image/png', size: 1200, name: 'a.png' })).toEqual({ ok: true });
  expect(validateVisualImage({ type: 'image/webp', size: 1200, name: 'a.webp' })).toEqual({ ok: true });
  expect(validateVisualImage({ type: '', size: 1200, name: 'photo.JPEG' })).toEqual({ ok: true });
});

test('validateVisualImage refuse le vide, le gif et le dépassement', () => {
  expect(validateVisualImage({ type: 'image/jpeg', size: 0, name: 'a.jpg' }).ok).toBe(false);
  const gif = validateVisualImage({ type: 'image/gif', size: 100, name: 'a.gif' });
  expect(gif.ok).toBe(false);
  if (!gif.ok) expect(gif.error).toBe(VISUAL_COPY.badType);
  const huge = validateVisualImage({
    type: 'image/png',
    size: VISUAL_IMAGE_MAX_BYTES + 1,
    name: 'big.png',
  });
  expect(huge.ok).toBe(false);
  if (!huge.ok) expect(huge.error).toBe(VISUAL_COPY.tooBig);
});

test('mapVisualSearchPayload garde le vendeur publié et écarte seed, démo et junk', () => {
  const view = mapVisualSearchPayload({
    results: [
      sellerProduct,
      { ...sellerProduct, id: 'seed', seller_id: null, name: 'Riz local 25 lb', similarity: 0.9 },
      { ...sellerProduct, id: 'draft', published: false, name: 'Brouillon vendeur', similarity: 0.8 },
      { ...sellerProduct, id: 'junk', name: 'TEST', similarity: 0.7 },
    ],
  });
  expect(view.products).toHaveLength(1);
  expect(view.products[0].id).toBe(sellerProduct.id);
  expect(view.products[0].department).toBe('Electronics');
  expect(view.products[0].seller_id).toBe(sellerProduct.seller_id);
  expect(view.reliable).toBe(true);
  expect(view.notice).toBeNull();
});

test('un seed très proche ne rend pas fiable un vrai produit faible', () => {
  const view = mapVisualSearchPayload({
    results: [
      { ...sellerProduct, similarity: 0.22 },
      { ...sellerProduct, id: 'seed', seller_id: null, name: 'Riz local 25 lb', similarity: 0.99 },
    ],
  });
  expect(view.products).toHaveLength(1);
  expect(view.reliable).toBe(false);
});

test('similarité sous le seuil fiable explique le repli texte', () => {
  const view = mapVisualSearchPayload({
    results: [{ ...sellerProduct, similarity: RELIABLE_SIMILARITY - 0.05 }],
  });
  expect(view.products).toHaveLength(1);
  expect(view.reliable).toBe(false);
  expect(view.notice).toMatch(/Correspondance incertaine/);
  expect(view.notice).toMatch(/recherche par texte/);
});

test('aucun voisin ne réintroduit pas de démo', () => {
  const view = mapVisualSearchPayload({ results: [] });
  expect(view.products).toEqual([]);
  expect(view.notice).toMatch(/Aucun produit proche de votre photo/);
  expect(view.emptyCatalog).toBe(false);
});

test('boutique vide', () => {
  const view = mapVisualSearchPayload({ results: [] }, { catalogEmpty: true });
  expect(view.emptyCatalog).toBe(true);
  expect(view.products).toHaveLength(0);
  expect(view.notice).toBe(VISUAL_COPY.emptyShop);
  expect(VISUAL_COPY.emptyShop.startsWith('Aucun produit vu')).toBe(true);
});

test('échec runtime CLIP renvoie vers le texte, sans produits inventés', () => {
  const view = mapVisualSearchPayload({
    error: 'internal',
    code: 'clip_runtime',
    hint: 'HF_TOKEN',
  });
  expect(view.products).toEqual([]);
  expect(view.error).toBe(VISUAL_COPY.config);
  expect(view.notice).toMatch(/recherche par texte/);
});
