/*
# Seller Haiti department on products

Copies vendor_applications.department → products.seller_department
so each listing is identified by one of Haiti's 10 departments.
*/

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS seller_department text;

CREATE INDEX IF NOT EXISTS idx_products_seller_department
  ON public.products(seller_department);

CREATE OR REPLACE FUNCTION public.set_product_seller_department()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dept text;
BEGIN
  IF NEW.seller_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT department INTO v_dept
  FROM public.vendor_applications
  WHERE user_id = NEW.seller_id
    AND status = 'approved'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_dept IS NOT NULL THEN
    NEW.seller_department := v_dept;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_product_seller_department ON public.products;
CREATE TRIGGER trg_set_product_seller_department
  BEFORE INSERT OR UPDATE OF seller_id ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.set_product_seller_department();

-- Backfill existing products from approved vendor apps
UPDATE public.products p
SET seller_department = v.department
FROM (
  SELECT DISTINCT ON (user_id) user_id, department
  FROM public.vendor_applications
  WHERE status = 'approved' AND department IS NOT NULL
  ORDER BY user_id, created_at DESC
) v
WHERE p.seller_id = v.user_id
  AND (p.seller_department IS NULL OR p.seller_department = '');
