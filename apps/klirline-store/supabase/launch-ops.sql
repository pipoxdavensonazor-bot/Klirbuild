-- Coller TOUT ce script dans Supabase → SQL Editor → Run
-- (même contenu que migrations/20260819010000_live_catalog_security.sql)

/*
  Live catalog + profiles RLS + KYC storefront helpers

  1. Remove seed/demo products (no seller_id)
  2. Public SELECT products only when attached to a seller account
  3. profiles SELECT: own row + admins (no phone dump of every user)
  4. Stamp shop name / verified from approved KYC on product insert
  5. RPC for buyer WhatsApp: approved seller phone only (no ID docs)
*/

-- ─── 1. Demo listings ────────────────────────────────────────────────────────

DELETE FROM public.cart_items
WHERE product_id IN (SELECT id FROM public.products WHERE seller_id IS NULL);

DO $$
BEGIN
  IF to_regclass('public.wishlists') IS NOT NULL THEN
    DELETE FROM public.wishlists
    WHERE product_id IN (SELECT id FROM public.products WHERE seller_id IS NULL);
  END IF;
  IF to_regclass('public.reviews') IS NOT NULL THEN
    DELETE FROM public.reviews
    WHERE product_id IN (SELECT id FROM public.products WHERE seller_id IS NULL);
  END IF;
  IF to_regclass('public.order_items') IS NOT NULL THEN
    DELETE FROM public.order_items
    WHERE product_id IN (SELECT id FROM public.products WHERE seller_id IS NULL);
  END IF;
  IF to_regclass('public.stock_alerts') IS NOT NULL THEN
    DELETE FROM public.stock_alerts
    WHERE product_id IN (SELECT id FROM public.products WHERE seller_id IS NULL);
  END IF;
  IF to_regclass('public.product_stock_alerts') IS NOT NULL THEN
    DELETE FROM public.product_stock_alerts
    WHERE product_id IN (SELECT id FROM public.products WHERE seller_id IS NULL);
  END IF;
END $$;

DELETE FROM public.products WHERE seller_id IS NULL;

-- ─── 2. Catalog visibility ───────────────────────────────────────────────────

DROP POLICY IF EXISTS "Anyone can view products" ON public.products;
CREATE POLICY "Anyone can view products"
  ON public.products FOR SELECT
  USING (seller_id IS NOT NULL);

-- ─── 3. Profiles: stop authenticated SELECT of every user ────────────────────

DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;

CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "profiles_select_admin"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.is_admin());

-- ─── 4. Shop name + verified from approved KYC ───────────────────────────────

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS seller_shop_name text;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS seller_verified boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.set_product_seller_department()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_dept text;
  v_shop text;
BEGIN
  IF NEW.seller_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT va.department, va.business_name
    INTO v_dept, v_shop
  FROM public.vendor_applications va
  WHERE va.user_id = NEW.seller_id
    AND va.status = 'approved'
  ORDER BY va.created_at DESC
  LIMIT 1;

  IF v_dept IS NOT NULL THEN
    NEW.seller_department := v_dept;
  END IF;
  IF v_shop IS NOT NULL THEN
    NEW.seller_shop_name := COALESCE(NULLIF(btrim(NEW.seller_shop_name), ''), v_shop);
    NEW.seller_verified := true;
  ELSE
    NEW.seller_verified := false;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_product_seller_department ON public.products;
CREATE TRIGGER trg_set_product_seller_department
  BEFORE INSERT OR UPDATE OF seller_id ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.set_product_seller_department();

-- ─── 5. Buyer contact for paid orders (phone only) ───────────────────────────

CREATE OR REPLACE FUNCTION public.get_approved_seller_contact(p_seller_id uuid)
RETURNS TABLE (business_phone text, business_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT va.business_phone, va.business_name
  FROM public.vendor_applications va
  WHERE va.user_id = p_seller_id
    AND va.status = 'approved'
  ORDER BY va.created_at DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_approved_seller_contact(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_approved_seller_contact(uuid) TO anon, authenticated;

-- ─── 6. Rate limit checkout (service_role) ──────────────────────────────────

CREATE TABLE IF NOT EXISTS public.edge_rate_limits (
  key text PRIMARY KEY,
  window_start timestamptz NOT NULL DEFAULT now(),
  hit_count integer NOT NULL DEFAULT 0
);

ALTER TABLE public.edge_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.claim_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_count integer;
BEGIN
  IF p_key IS NULL OR length(p_key) < 3 OR p_limit < 1 OR p_window_seconds < 1 THEN
    RETURN false;
  END IF;

  INSERT INTO public.edge_rate_limits AS t (key, window_start, hit_count)
  VALUES (left(p_key, 200), v_now, 1)
  ON CONFLICT (key) DO UPDATE
  SET
    window_start = CASE
      WHEN t.window_start < v_now - make_interval(secs => p_window_seconds)
      THEN v_now ELSE t.window_start
    END,
    hit_count = CASE
      WHEN t.window_start < v_now - make_interval(secs => p_window_seconds)
      THEN 1 ELSE t.hit_count + 1
    END
  RETURNING hit_count INTO v_count;

  RETURN v_count <= p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_rate_limit(text, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_rate_limit(text, integer, integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_rate_limit(text, integer, integer) TO service_role;
