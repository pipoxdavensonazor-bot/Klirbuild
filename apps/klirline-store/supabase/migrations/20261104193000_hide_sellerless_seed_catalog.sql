/*
  # Hide seller-less seed products from the public catalog

  Live anon reads were still returning leftover demo rows (`seller_id` IS NULL,
  e.g. « Riz local 25 lb ») and categories that only exist for those rows.

  Soft hide, not delete:
  - `order_items.product_id` references `products(id)` with the default
    RESTRICT behavior. Deleting a product that appears on a paid order would
    fail or, if cascaded, would rewrite order history. Rows stay in place.
  - `products.published` defaults to true. A BEFORE trigger forces
    `published = false` whenever `seller_id` is null.
  - Anon SELECT requires a seller and `published`. Authenticated buyers can
    still read a product that is on one of their orders (order history).
    Sellers can still read their own rows. Admins can read every row.
  - Anon category SELECT requires at least one published seller product.
    Authenticated users still see every category so the seller form can
    keep its existing list. The storefront filters categories itself.

  No sellers are invented and no order / payment rows are updated.

  Idempotent: safe to run more than once.
*/

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS published boolean;

ALTER TABLE public.products
  ALTER COLUMN published SET DEFAULT true;

COMMENT ON COLUMN public.products.published IS
  'Public catalog flag. Seed/demo rows with seller_id NULL are forced false. Not a KYC signal.';

CREATE OR REPLACE FUNCTION public.force_unpublished_without_seller()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.seller_id IS NULL THEN
    NEW.published := false;
  ELSIF NEW.published IS NULL THEN
    NEW.published := true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_force_unpublished_without_seller ON public.products;
CREATE TRIGGER trg_force_unpublished_without_seller
  BEFORE INSERT OR UPDATE OF seller_id, published ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.force_unpublished_without_seller();

-- INSERT fires this trigger. Sellers (authenticated) and the edge service role
-- must be allowed to execute it. Calling it as a plain function errors.
REVOKE ALL ON FUNCTION public.force_unpublished_without_seller() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.force_unpublished_without_seller() TO authenticated;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.force_unpublished_without_seller() TO service_role;
  END IF;
END $$;

-- Backfill. The trigger keeps a null seller unpublished.
UPDATE public.products
SET published = false
WHERE seller_id IS NULL
  AND published IS DISTINCT FROM false;

UPDATE public.products
SET published = true
WHERE seller_id IS NOT NULL
  AND published IS NULL;

ALTER TABLE public.products
  ALTER COLUMN published SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_published_catalog
  ON public.products (created_at DESC)
  WHERE published = true AND seller_id IS NOT NULL;

-- Buyer order history must still resolve product names after a row is unpublished.
CREATE OR REPLACE FUNCTION public.buyer_has_ordered_product(p_product_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE oi.product_id = p_product_id
      AND o.user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.buyer_has_ordered_product(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.buyer_has_ordered_product(uuid) TO authenticated;

DROP POLICY IF EXISTS "Anyone can view products" ON public.products;
DROP POLICY IF EXISTS "Anon catalog lists seller products" ON public.products;
CREATE POLICY "Anon catalog lists seller products"
  ON public.products
  FOR SELECT
  TO anon
  USING (seller_id IS NOT NULL AND published = true);

DROP POLICY IF EXISTS "Authenticated catalog and order history" ON public.products;
CREATE POLICY "Authenticated catalog and order history"
  ON public.products
  FOR SELECT
  TO authenticated
  USING (
    (seller_id IS NOT NULL AND published = true)
    OR seller_id = auth.uid()
    OR public.is_admin()
    OR public.buyer_has_ordered_product(id)
  );

DROP POLICY IF EXISTS "Anyone can view categories" ON public.categories;
DROP POLICY IF EXISTS "Anon sees categories with real products" ON public.categories;
CREATE POLICY "Anon sees categories with real products"
  ON public.categories
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1
      FROM public.products p
      WHERE p.category_id = categories.id
        AND p.seller_id IS NOT NULL
        AND p.published = true
    )
  );

DROP POLICY IF EXISTS "Authenticated can view categories" ON public.categories;
CREATE POLICY "Authenticated can view categories"
  ON public.categories
  FOR SELECT
  TO authenticated
  USING (true);
