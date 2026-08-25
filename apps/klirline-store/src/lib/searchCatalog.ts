import { supabase, isDemoMode, type Product } from './supabase';
import { CATEGORY_TO_DEPARTMENT, isPublishedSellerProduct } from './brand';

function mapProductRow(p: Product & { categories?: { name?: string } | null }): Product {
  const catName = p.categories?.name;
  const department =
    p.department ||
    (catName ? CATEGORY_TO_DEPARTMENT[catName] ?? catName : null);
  const { categories: _c, ...rest } = p;
  return { ...rest, department } as Product;
}

function localRank(products: Product[], q: string): Product[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  return products
    .filter(p =>
      p.name.toLowerCase().includes(needle) ||
      (p.brand ?? '').toLowerCase().includes(needle) ||
      p.description.toLowerCase().includes(needle) ||
      (p.seller_shop_name ?? '').toLowerCase().includes(needle),
    )
    .sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      const aScore =
        (aName.startsWith(needle) ? 0 : aName.includes(needle) ? 1 : 2) -
        Number(Boolean(a.sponsored)) * 0.1;
      const bScore =
        (bName.startsWith(needle) ? 0 : bName.includes(needle) ? 1 : 2) -
        Number(Boolean(b.sponsored)) * 0.1;
      return aScore - bScore;
    });
}

/**
 * Server-side catalog search via Supabase (ilike / optional RPC).
 * Falls back to local ranking of `catalog` in demo mode or on error.
 */
export async function searchCatalog(
  query: string,
  catalog: Product[] = [],
  limit = 40,
): Promise<Product[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  if (isDemoMode) {
    return localRank(catalog, q).slice(0, limit);
  }

  // Escape LIKE metacharacters: backslash first, then % and _
  const pattern = `%${q
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')}%`;

  // Prefer RPC if migration applied; ignore failure
  const rpc = await supabase.rpc('search_products', { q, lim: limit });
  if (!rpc.error && Array.isArray(rpc.data)) {
    return (rpc.data as Product[])
      .filter(p => isPublishedSellerProduct(p))
      .map(p => mapProductRow(p as Product & { categories?: { name?: string } | null }));
  }

  const { data, error } = await supabase
    .from('products')
    .select('*, categories(name)')
    .not('seller_id', 'is', null)
    .or(`name.ilike.${pattern},brand.ilike.${pattern},description.ilike.${pattern}`)
    .order('sponsored', { ascending: false, nullsFirst: false })
    .order('rating', { ascending: false })
    .limit(limit);

  if (error || !data) {
    return localRank(catalog, q).slice(0, limit);
  }

  return data
    .filter(p => isPublishedSellerProduct(p))
    .map(p => mapProductRow(p as Product & { categories?: { name?: string } | null }));
}
