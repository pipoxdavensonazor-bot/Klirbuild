import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** True when env is missing — app runs on curated demo catalog. */
export const isDemoMode = !supabaseUrl || !supabaseAnonKey;

export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'public-anon-key'
);

export type Category = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
};

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  original_price: number | null;
  deal_price: number | null;
  deal_ends_at: string | null;
  image_url: string;
  images: string[];
  about_items: string[];
  variants: { name: string; options: string[] }[];
  category_id: string;
  department?: string | null;
  /** Geographic Haiti department of the seller (Artibonite, Ouest, …). */
  seller_department?: string | null;
  seller_id: string | null;
  rating: number;
  review_count: number;
  in_stock: boolean;
  badge: string | null;
  featured: boolean;
  view_count: number;
  brand: string | null;
  created_at: string;
};

export type CartItem = {
  id: string;
  session_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  product?: Product;
};

export type Order = {
  id: string;
  user_id: string;
  total: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  moncash_order_id: string | null;
  moncash_transaction_id: string | null;
  shipping_full_name?: string | null;
  shipping_phone?: string | null;
  shipping_street?: string | null;
  shipping_city?: string | null;
  shipping_department?: string | null;
  shipping_fee?: number;
  created_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price: number;
  created_at: string;
};

export type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  is_admin: boolean;
  created_at: string;
};

export type VendorApplication = {
  id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  business_name: string;
  owner_name: string;
  business_category: string;
  business_phone: string | null;
  business_address: string | null;
  city: string | null;
  department: string | null;
  id_front_url: string;
  id_back_url: string | null;
  selfie_url: string;
  address_proof_url: string;
  checklist_id_ok?: boolean;
  checklist_selfie_ok?: boolean;
  checklist_mairie_ok?: boolean;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export type Address = {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  street: string;
  city: string;
  state_dept: string;
  postal_code: string | null;
  country: string;
  is_default: boolean;
  created_at: string;
};

export type Review = {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  title: string | null;
  body: string | null;
  verified_purchase: boolean;
  created_at: string;
};

export type WishlistItem = {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
  product?: Product;
};

export const BADGE_CONFIG: Record<string, { label: string; classes: string }> = {
  best_seller:    { label: 'Best Seller',       classes: 'bg-brand text-white' },
  amazons_choice: { label: "Klir's Choice",     classes: 'bg-teal-700 text-white' },
  new:            { label: 'New',               classes: 'bg-blue-600 text-white' },
  limited_deal:   { label: 'Limited Time Deal', classes: 'bg-red-700 text-white' },
};

export const DEPARTMENTS = [
  'Electronics', 'Books', 'Clothing & Fashion', 'Home & Kitchen',
  'Sports & Outdoors', 'Toys & Games', 'Beauty & Personal Care',
  'Automotive', 'Garden', 'Health',
];

export const HAITI_DEPARTMENTS = [
  'Artibonite', 'Centre', "Grand'Anse", 'Nippes',
  'Nord', 'Nord-Est', 'Nord-Ouest', 'Ouest', 'Sud', 'Sud-Est',
];

export const VENDOR_CATEGORIES = [
  'Electronics & Technology', 'Clothing & Fashion', 'Home & Kitchen',
  'Food & Beverages', 'Health & Beauty', 'Sports & Outdoors',
  'Toys & Games', 'Books & Stationery', 'Automotive', 'Agriculture',
  'Construction & Hardware', 'Arts & Crafts', 'Other',
];

export function getDisplayPrice(product: Product): number {
  if (product.deal_price != null) return product.deal_price;
  return product.price;
}

export function getOriginalPrice(product: Product): number | null {
  if (product.deal_price != null) return product.price;
  return product.original_price;
}

export function discountPct(product: Product): number | null {
  const orig = getOriginalPrice(product);
  const curr = getDisplayPrice(product);
  if (!orig || orig <= curr) return null;
  return Math.round((1 - curr / orig) * 100);
}
