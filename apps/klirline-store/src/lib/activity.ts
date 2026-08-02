import type { Product } from './supabase';

const STORAGE_KEY = 'klirline_activity_v1';
const MAX_RECENT = 24;

export type ActivityState = {
  recentProductIds: string[];
  departmentScores: Record<string, number>;
  brandScores: Record<string, number>;
  cartAdds: Record<string, number>;
  lastSeenAt: number;
};

function empty(): ActivityState {
  return {
    recentProductIds: [],
    departmentScores: {},
    brandScores: {},
    cartAdds: {},
    lastSeenAt: Date.now(),
  };
}

export function loadActivity(): ActivityState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as ActivityState;
    return {
      ...empty(),
      ...parsed,
      recentProductIds: Array.isArray(parsed.recentProductIds) ? parsed.recentProductIds : [],
    };
  } catch {
    return empty();
  }
}

function save(state: ActivityState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, lastSeenAt: Date.now() }));
  } catch {
    /* ignore quota */
  }
}

function bump(map: Record<string, number>, key: string | null | undefined, by = 1) {
  if (!key) return;
  map[key] = (map[key] ?? 0) + by;
}

export function trackProductView(product: Product) {
  const s = loadActivity();
  s.recentProductIds = [product.id, ...s.recentProductIds.filter(id => id !== product.id)].slice(0, MAX_RECENT);
  bump(s.departmentScores, product.department, 3);
  bump(s.brandScores, product.brand, 2);
  save(s);
}

export function trackDepartment(dept: string) {
  if (!dept) return;
  const s = loadActivity();
  bump(s.departmentScores, dept, 2);
  save(s);
}

export function trackAddToCart(product: Product) {
  const s = loadActivity();
  bump(s.cartAdds, product.id, 4);
  bump(s.departmentScores, product.department, 4);
  bump(s.brandScores, product.brand, 3);
  s.recentProductIds = [product.id, ...s.recentProductIds.filter(id => id !== product.id)].slice(0, MAX_RECENT);
  save(s);
}

function scoreProduct(p: Product, s: ActivityState): number {
  let score = 0;
  if (p.department) score += (s.departmentScores[p.department] ?? 0) * 2;
  if (p.brand) score += (s.brandScores[p.brand] ?? 0) * 1.5;
  score += s.cartAdds[p.id] ?? 0;
  const recentIdx = s.recentProductIds.indexOf(p.id);
  if (recentIdx >= 0) score += Math.max(0, 8 - recentIdx);
  if (p.badge === 'best_seller') score += 1.5;
  if (p.badge === 'limited_deal' || p.deal_price != null) score += 2;
  if (p.sponsored) score += 40;
  if (p.featured) score += 1;
  score += Math.min(p.rating, 5) * 0.3;
  return score;
}

export function getPersonalizedRails(products: Product[], activity = loadActivity()) {
  const byId = new Map(products.map(p => [p.id, p]));

  const continueBrowsing = activity.recentProductIds
    .map(id => byId.get(id))
    .filter((p): p is Product => Boolean(p))
    .slice(0, 10);

  const sponsored = products.filter(p => p.sponsored).slice(0, 12);

  const exclude = new Set([
    ...continueBrowsing.map(p => p.id),
    ...sponsored.map(p => p.id),
  ]);

  const recommended = [...products]
    .filter(p => !exclude.has(p.id))
    .map(p => ({ p, s: scoreProduct(p, activity) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, 12)
    .map(x => x.p);

  const deals = products
    .filter(p => p.deal_price != null || p.badge === 'limited_deal' || (p.original_price != null && p.original_price > p.price))
    .slice(0, 10);

  const bestSellers = [...products]
    .sort((a, b) => (b.review_count || 0) - (a.review_count || 0) || b.rating - a.rating)
    .slice(0, 10);

  const topDepts = Object.entries(activity.departmentScores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([dept]) => dept);

  const deptRails = topDepts.map(dept => ({
    department: dept,
    products: products.filter(p => p.department === dept).slice(0, 10),
  })).filter(r => r.products.length > 0);

  const hasPersonalSignal =
    activity.recentProductIds.length > 0 ||
    Object.keys(activity.departmentScores).length > 0 ||
    Object.keys(activity.cartAdds).length > 0;

  return {
    continueBrowsing,
    sponsored,
    recommended,
    deals,
    bestSellers,
    deptRails,
    hasPersonalSignal,
  };
}
