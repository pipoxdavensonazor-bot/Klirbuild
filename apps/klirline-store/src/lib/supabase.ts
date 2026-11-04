import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  emptyAuthRedirectSnapshot,
  readAuthRedirectSnapshot,
  type AuthRedirectSnapshot,
} from './password-recovery';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** True when env is missing — app runs on curated demo catalog. */
export const isDemoMode = !supabaseUrl || !supabaseAnonKey;

function peekPkcePasswordRecovery(): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key?.endsWith('-code-verifier')) continue;
      const marker = (localStorage.getItem(key) ?? '').split('/')[1];
      if (marker === 'PASSWORD_RECOVERY') return true;
    }
  } catch {
    return false;
  }
  return false;
}

/**
 * Captured before the auth client starts. supabase-js strips ?code= / #access_token
 * during init, and a PKCE recovery verifier is deleted as soon as it is exchanged.
 */
export const authRedirectSnapshot: AuthRedirectSnapshot =
  typeof window === 'undefined' ? emptyAuthRedirectSnapshot : readAuthRedirectSnapshot(window.location.href);

/** True when this browser asked for a reset email and still holds the PKCE verifier. */
export const pendingPkcePasswordRecovery = peekPkcePasswordRecovery();

export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'public-anon-key'
);

type AuthSignals = { passwordRecovery: boolean; signedIn: boolean };

const authSignals: AuthSignals = { passwordRecovery: false, signedIn: false };
const authSignalListeners = new Set<() => void>();

export function peekAuthSignals(): AuthSignals {
  return authSignals;
}

/** Replay-safe subscription. Registered at startup so early auth events are not missed. */
export function subscribeAuthSignals(listener: () => void): () => void {
  authSignalListeners.add(listener);
  if (authSignals.passwordRecovery || authSignals.signedIn) listener();
  return () => {
    authSignalListeners.delete(listener);
  };
}

function emitAuthSignal(event: 'PASSWORD_RECOVERY' | 'SIGNED_IN') {
  if (event === 'PASSWORD_RECOVERY') authSignals.passwordRecovery = true;
  if (event === 'SIGNED_IN') authSignals.signedIn = true;
  authSignalListeners.forEach((listener) => listener());
}

if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') emitAuthSignal(event);
  });
}

let recoveryOtpVerify: Promise<{ ok: boolean; expired: boolean }> | null = null;

/** Email templates that pass token_hash (instead of a PKCE code) land here. */
export function verifyRecoveryTokenHash(tokenHash: string): Promise<{ ok: boolean; expired: boolean }> {
  if (!recoveryOtpVerify) {
    recoveryOtpVerify = supabase.auth
      .verifyOtp({ type: 'recovery', token_hash: tokenHash })
      .then(({ data, error }) => {
        if (error || !data.session) {
          const blob = `${error?.message ?? ''}`.toLowerCase();
          return { ok: false, expired: blob.includes('expir') };
        }
        return { ok: true, expired: false };
      });
  }
  return recoveryOtpVerify;
}

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
  /**
   * Public catalog flag. Seed rows with no seller are stored as false.
   * Absent until that migration is applied.
   */
  published?: boolean;
  rating: number;
  review_count: number;
  in_stock: boolean;
  badge: string | null;
  featured: boolean;
  /** Paid Sponsored subscription — boosted on home feed */
  sponsored?: boolean;
  view_count: number;
  brand: string | null;
  /** True when seller has an approved Klirline KYC application. */
  seller_verified?: boolean | null;
  /** Shop / commerce name from approved vendor application. */
  seller_shop_name?: string | null;
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
  payment_method?: 'moncash' | 'stripe' | 'natcash' | null;
  stripe_session_id?: string | null;
  stripe_payment_intent_id?: string | null;
  stripe_amount_usd_cents?: number | null;
  natcash_order_id?: string | null;
  natcash_transaction_id?: string | null;
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
  payout_method?: 'moncash' | 'natcash' | null;
  payout_wallet?: string | null;
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
  best_seller:    { label: 'Meilleure vente',   classes: 'bg-brand text-white' },
  amazons_choice: { label: 'Choix Klirline',    classes: 'bg-haiti-blue text-white' },
  new:            { label: 'Nouveau',           classes: 'bg-haiti-blue text-white' },
  limited_deal:   { label: 'Offre limitée',     classes: 'bg-haiti-red text-white' },
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
