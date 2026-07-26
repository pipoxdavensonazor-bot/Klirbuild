
/*
# Security Hardening: Fix RLS policies and revoke over-permissive access

## Summary
Fixes security issues identified in the automated security scan.

## Changes

### 1. products — tighten INSERT policy
- Added DEFAULT auth.uid() to seller_id so inserts without explicit seller_id
  auto-assign the current user as owner.
- Changed INSERT policy from WITH CHECK (true) to WITH CHECK (seller_id = auth.uid()),
  preventing a seller from creating products attributed to another user.

### 2. cart_items — scope by authenticated user
- Changed all four policies from USING/WITH CHECK (true) to scope by
  session_id = auth.uid()::text (cart key is now the user's own UUID).
- Changed role from anon+authenticated to authenticated-only.
- Cart now requires a signed-in session (checkout already required auth).

### 3. reviews SELECT — allow anonymous visitors
- Changed reviews SELECT policy to TO anon, authenticated so product reviews
  are visible to unauthenticated shop visitors.

### 4. Revoke anon SELECT from sensitive tables
- Revoked the default anon SELECT grant on: addresses, cart_items, orders,
  order_items, profiles, wishlists, vendor_applications, stripe_customers,
  stripe_orders, stripe_subscriptions, and the stripe views.
- Products, categories, and reviews retain anon SELECT for public browsing.

### 5. Revoke anon EXECUTE from SECURITY DEFINER functions
- Revoked anon EXECUTE on all SECURITY DEFINER RPC functions.
- Revoked authenticated EXECUTE on trigger-only functions
  (handle_new_user, update_product_rating) which should never be called
  directly via REST — they run only as DB triggers.

## Security Notes
- REVOKE on tables removes schema introspection visibility AND REST access
  for that role; RLS on the remaining authenticated access still applies.
- Trigger functions now have REVOKE from both anon and authenticated so they
  are inaccessible via /rest/v1/rpc while still executing normally as triggers.
*/

-- ─── 1. products: tighten INSERT policy ──────────────────────────────────────

ALTER TABLE public.products ALTER COLUMN seller_id SET DEFAULT auth.uid();

DROP POLICY IF EXISTS "Authenticated users can add products" ON public.products;
CREATE POLICY "Authenticated users can add products"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (seller_id = auth.uid());

-- ─── 2. cart_items: scope by authenticated user id ────────────────────────────

DROP POLICY IF EXISTS "Users can view own cart items" ON public.cart_items;
CREATE POLICY "Users can view own cart items"
  ON public.cart_items FOR SELECT
  TO authenticated
  USING (session_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can insert own cart items" ON public.cart_items;
CREATE POLICY "Users can insert own cart items"
  ON public.cart_items FOR INSERT
  TO authenticated
  WITH CHECK (session_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update own cart items" ON public.cart_items;
CREATE POLICY "Users can update own cart items"
  ON public.cart_items FOR UPDATE
  TO authenticated
  USING (session_id = auth.uid()::text)
  WITH CHECK (session_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete own cart items" ON public.cart_items;
CREATE POLICY "Users can delete own cart items"
  ON public.cart_items FOR DELETE
  TO authenticated
  USING (session_id = auth.uid()::text);

-- ─── 3. reviews: allow anon to read product reviews ──────────────────────────

DROP POLICY IF EXISTS "reviews_select" ON public.reviews;
CREATE POLICY "reviews_select"
  ON public.reviews FOR SELECT
  TO anon, authenticated
  USING (true);

-- ─── 4. Revoke anon SELECT from sensitive tables ──────────────────────────────

REVOKE SELECT ON TABLE public.addresses FROM anon;
REVOKE SELECT ON TABLE public.cart_items FROM anon;
REVOKE SELECT ON TABLE public.orders FROM anon;
REVOKE SELECT ON TABLE public.order_items FROM anon;
REVOKE SELECT ON TABLE public.profiles FROM anon;
REVOKE SELECT ON TABLE public.wishlists FROM anon;
REVOKE SELECT ON TABLE public.vendor_applications FROM anon;
REVOKE SELECT ON TABLE public.stripe_customers FROM anon;
REVOKE SELECT ON TABLE public.stripe_orders FROM anon;
REVOKE SELECT ON TABLE public.stripe_subscriptions FROM anon;
REVOKE SELECT ON TABLE public.stripe_user_orders FROM anon;
REVOKE SELECT ON TABLE public.stripe_user_subscriptions FROM anon;

-- ─── 5. Revoke anon EXECUTE from SECURITY DEFINER functions ──────────────────

REVOKE EXECUTE ON FUNCTION public.get_seller_stats() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_seller_recent_sales(integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_vendor_status() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_seller_for_order(uuid) FROM anon;

-- Trigger-only functions: revoke direct REST invocation from all roles
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_product_rating() FROM anon, authenticated;
