/*
# Abonnement Sponsored — fonctions — version schema_migrations whybbqeeqpkbkatnkjjc

Appliquée en production juste après 20260727033954_seller_sponsored_subscription.
Idempotent. Ne pas ré-appliquer si cette version est déjà dans schema_migrations.

20260729221556_guard_product_promotion_columns.sql remplace
sync_seller_sponsored_products et ajoute expire_seller_sponsorships + pg_cron.
La définition ci-dessous est celle qui doit exister dès cette version ; le
garde-fou ultérieur la réécrit sans changer la signature.
*/

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

REVOKE ALL ON FUNCTION public.sync_seller_sponsored_products(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_seller_sponsored_products(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.activate_seller_sponsorship(p_sponsorship_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seller uuid;
  v_status text;
  v_days integer;
BEGIN
  SELECT seller_id, status, duration_days
  INTO v_seller, v_status, v_days
  FROM public.seller_sponsorships
  WHERE id = p_sponsorship_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sponsorship not found';
  END IF;

  IF v_status IS DISTINCT FROM 'active' THEN
    IF v_status IS DISTINCT FROM 'pending' THEN
      RAISE EXCEPTION 'Sponsorship cannot be activated from status %', v_status;
    END IF;

    UPDATE public.seller_sponsorships
    SET status = 'expired',
        updated_at = now()
    WHERE seller_id = v_seller
      AND status = 'active'
      AND id <> p_sponsorship_id;

    UPDATE public.seller_sponsorships
    SET status = 'active',
        starts_at = COALESCE(starts_at, now()),
        ends_at = COALESCE(
          ends_at,
          now() + make_interval(days => GREATEST(COALESCE(v_days, 30), 1))
        ),
        updated_at = now()
    WHERE id = p_sponsorship_id;
  END IF;

  PERFORM public.sync_seller_sponsored_products(v_seller);
END;
$$;

REVOKE ALL ON FUNCTION public.activate_seller_sponsorship(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activate_seller_sponsorship(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.seller_get_sponsorship()
RETURNS TABLE (
  id uuid,
  status text,
  plan text,
  amount_htg numeric,
  starts_at timestamptz,
  ends_at timestamptz,
  priority_support boolean,
  admin_followup_status text,
  days_left integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    sponsorship.id,
    sponsorship.status,
    sponsorship.plan,
    sponsorship.amount_htg,
    sponsorship.starts_at,
    sponsorship.ends_at,
    sponsorship.priority_support,
    sponsorship.admin_followup_status,
    CASE
      WHEN sponsorship.status = 'active' AND sponsorship.ends_at IS NOT NULL THEN
        GREATEST(
          0,
          CEIL(EXTRACT(EPOCH FROM (sponsorship.ends_at - now())) / 86400.0)
        )::integer
      ELSE NULL
    END
  FROM public.seller_sponsorships AS sponsorship
  WHERE sponsorship.seller_id = auth.uid()
  ORDER BY CASE WHEN sponsorship.status = 'active' THEN 0 ELSE 1 END,
           sponsorship.created_at DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.seller_get_sponsorship() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.seller_get_sponsorship() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_sponsorships(limit_count integer DEFAULT 50)
RETURNS TABLE (
  id uuid,
  seller_id uuid,
  status text,
  amount_htg numeric,
  starts_at timestamptz,
  ends_at timestamptz,
  priority_support boolean,
  admin_followup_status text,
  admin_followup_note text,
  admin_followup_at timestamptz,
  created_at timestamptz,
  business_name text,
  owner_name text,
  business_phone text,
  payout_wallet text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN QUERY
  SELECT
    sponsorship.id,
    sponsorship.seller_id,
    sponsorship.status,
    sponsorship.amount_htg,
    sponsorship.starts_at,
    sponsorship.ends_at,
    sponsorship.priority_support,
    sponsorship.admin_followup_status,
    sponsorship.admin_followup_note,
    sponsorship.admin_followup_at,
    sponsorship.created_at,
    vendor.business_name,
    vendor.owner_name,
    vendor.business_phone,
    vendor.payout_wallet
  FROM public.seller_sponsorships AS sponsorship
  LEFT JOIN LATERAL (
    SELECT
      application.business_name,
      application.owner_name,
      application.business_phone,
      application.payout_wallet
    FROM public.vendor_applications AS application
    WHERE application.user_id = sponsorship.seller_id
    ORDER BY (application.status = 'approved') DESC, application.created_at DESC
    LIMIT 1
  ) AS vendor ON true
  ORDER BY
    CASE
      WHEN sponsorship.status = 'active' AND sponsorship.admin_followup_status = 'pending' THEN 0
      ELSE 1
    END,
    sponsorship.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(limit_count, 50), 200));
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_sponsorships(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_sponsorships(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_mark_sponsor_followup(
  p_id uuid,
  p_status text,
  p_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF p_status NOT IN ('pending', 'contacted', 'done') THEN
    RAISE EXCEPTION 'Invalid follow-up status';
  END IF;

  UPDATE public.seller_sponsorships
  SET admin_followup_status = p_status,
      admin_followup_note = COALESCE(NULLIF(btrim(p_note), ''), admin_followup_note),
      admin_followup_at = now(),
      admin_followup_by = auth.uid(),
      updated_at = now()
  WHERE id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sponsorship not found';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_mark_sponsor_followup(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_mark_sponsor_followup(uuid, text, text) TO authenticated;
