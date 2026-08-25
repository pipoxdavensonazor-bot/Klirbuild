/*
  # Virgin catalog — remove all storefront products & shop listings

  Keeps: categories taxonomy, auth users, vendor_applications (KYC), order headers.
  Removes: products and dependent catalog rows so the marketplace is empty at launch.
*/

DELETE FROM public.cart_items;

DO $$
BEGIN
  IF to_regclass('public.wishlists') IS NOT NULL THEN
    DELETE FROM public.wishlists;
  END IF;
  IF to_regclass('public.reviews') IS NOT NULL THEN
    DELETE FROM public.reviews;
  END IF;
  IF to_regclass('public.order_items') IS NOT NULL THEN
    DELETE FROM public.order_items;
  END IF;
  IF to_regclass('public.stock_alerts') IS NOT NULL THEN
    DELETE FROM public.stock_alerts;
  END IF;
  IF to_regclass('public.product_stock_alerts') IS NOT NULL THEN
    DELETE FROM public.product_stock_alerts;
  END IF;
END $$;

DELETE FROM public.products;

-- Public catalog: only listings attached to a real seller account
DROP POLICY IF EXISTS "Anyone can view products" ON public.products;
CREATE POLICY "Anyone can view products"
  ON public.products FOR SELECT
  USING (seller_id IS NOT NULL);
