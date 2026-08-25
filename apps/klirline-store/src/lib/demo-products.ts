import type { Category, Product } from './supabase';

/** Kept for type imports / tests — storefront no longer seeds demo catalog. */
export type DemoProduct = Product & { department: string };

export const DEMO_CATEGORIES: Category[] = [];

export const DEMO_PRODUCTS: DemoProduct[] = [];
