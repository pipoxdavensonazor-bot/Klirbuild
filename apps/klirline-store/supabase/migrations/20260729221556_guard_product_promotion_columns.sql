-- Prevent sellers from bypassing paid/editorial promotion controls.
-- Only service-role / DB owners, admins, and the sponsorship sync function may
-- change products.featured or products.sponsored.

CREATE OR REPLACE FUNCTION public.guard_product_promotion_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  promotion_sync_allowed boolean :=
    COALESCE(current_setting('app.sponsorship_sync', true), '') = 'on';
  privileged_request boolean :=
    current_user IN ('postgres', 'service_role', 'supabase_admin')
    OR public.is_admin()
    OR promotion_sync_allowed;
BEGIN
  IF privileged_request THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF COALESCE(NEW.featured, false) OR COALESCE(NEW.sponsored, false) THEN
      RAISE EXCEPTION 'Promotion fields are managed by Klirline'
        USING ERRCODE = '42501';
    END IF;
  ELSIF NEW.featured IS DISTINCT FROM OLD.featured
     OR NEW.sponsored IS DISTINCT FROM OLD.sponsored THEN
    RAISE EXCEPTION 'Promotion fields are managed by Klirline'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_product_promotion_columns ON public.products;
CREATE TRIGGER trg_guard_product_promotion_columns
  BEFORE INSERT OR UPDATE OF featured, sponsored ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_product_promotion_columns();

REVOKE EXECUTE ON FUNCTION public.guard_product_promotion_columns()
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.sync_seller_sponsored_products(p_seller_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  is_active boolean;
BEGIN
  UPDATE public.seller_sponsorships
  SET status = 'expired', updated_at = now()
  WHERE seller_id = p_seller_id
    AND status = 'active'
    AND ends_at IS NOT NULL
    AND ends_at < now();

  SELECT EXISTS (
    SELECT 1
    FROM public.seller_sponsorships
    WHERE seller_id = p_seller_id
      AND status = 'active'
      AND (ends_at IS NULL OR ends_at > now())
  ) INTO is_active;

  PERFORM set_config('app.sponsorship_sync', 'on', true);

  -- featured stays editorial (admin-only); paid boost is carried by sponsored.
  UPDATE public.products
  SET sponsored = is_active
  WHERE seller_id = p_seller_id
    AND sponsored IS DISTINCT FROM is_active;

  PERFORM set_config('app.sponsorship_sync', 'off', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.expire_seller_sponsorships()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM set_config('app.sponsorship_sync', 'on', true);

  WITH expired_sellers AS (
    UPDATE public.seller_sponsorships
    SET status = 'expired', updated_at = now()
    WHERE status = 'active'
      AND ends_at IS NOT NULL
      AND ends_at <= now()
    RETURNING seller_id
  )
  UPDATE public.products AS product
  SET sponsored = false
  WHERE product.sponsored
    AND product.seller_id IN (
      SELECT DISTINCT expired.seller_id
      FROM expired_sellers AS expired
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.seller_sponsorships AS active
      WHERE active.seller_id = product.seller_id
        AND active.status = 'active'
        AND (active.ends_at IS NULL OR active.ends_at > now())
    );

  PERFORM set_config('app.sponsorship_sync', 'off', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.expire_seller_sponsorships()
  FROM PUBLIC, anon, authenticated;

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'expire-seller-sponsorships',
  '* * * * *',
  'SELECT public.expire_seller_sponsorships()'
);
