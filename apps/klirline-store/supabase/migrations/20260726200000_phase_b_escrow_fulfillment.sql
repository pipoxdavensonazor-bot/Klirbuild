/*
# Phase B — Escrow MonCash + livraison vendeur + photo + versement J+7

## Flux
1. Client paie MonCash → orders.status = completed, order_fulfillments.status = paid (escrow)
2. Vendeur marque expédié → shipped (+ shipped_at)
3. Vendeur confirme réception + photo → delivered → payout_ready
4. Sinon auto : 7 jours après shipped → peut claim payout_ready / paid_out
5. Commission Klirline : 8 % (net vendeur = gross * 0.92)
*/

-- ── 1. Adresse de livraison sur orders ──────────────────────────────────────
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shipping_full_name text,
  ADD COLUMN IF NOT EXISTS shipping_phone text,
  ADD COLUMN IF NOT EXISTS shipping_street text,
  ADD COLUMN IF NOT EXISTS shipping_city text,
  ADD COLUMN IF NOT EXISTS shipping_department text;

-- ── 2. order_fulfillments (escrow par vendeur) ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.order_fulfillments (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  seller_id           uuid NOT NULL REFERENCES auth.users(id),
  status              text NOT NULL DEFAULT 'paid'
                        CHECK (status IN (
                          'paid', 'preparing', 'shipped', 'delivered',
                          'payout_ready', 'paid_out', 'disputed'
                        )),
  gross_amount        numeric NOT NULL DEFAULT 0,
  commission_rate     numeric NOT NULL DEFAULT 0.08,
  commission_amount   numeric NOT NULL DEFAULT 0,
  net_amount          numeric NOT NULL DEFAULT 0,
  shipped_at          timestamptz,
  delivered_at        timestamptz,
  delivery_photo_url  text,
  delivery_note       text,
  payout_ready_at     timestamptz,
  paid_out_at         timestamptz,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now(),
  UNIQUE (order_id, seller_id)
);

CREATE INDEX IF NOT EXISTS idx_order_fulfillments_seller
  ON public.order_fulfillments(seller_id);

CREATE INDEX IF NOT EXISTS idx_order_fulfillments_status
  ON public.order_fulfillments(status);

ALTER TABLE public.order_fulfillments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "seller_select_own_fulfillments" ON public.order_fulfillments;
CREATE POLICY "seller_select_own_fulfillments" ON public.order_fulfillments
  FOR SELECT TO authenticated
  USING (
    seller_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.user_id = auth.uid()
    )
    OR public.is_admin()
  );

-- Mutations via SECURITY DEFINER RPCs only
REVOKE INSERT, UPDATE, DELETE ON public.order_fulfillments FROM authenticated, anon;

-- ── 3. Create fulfillments after payment (service role / edge) ──────────────
CREATE OR REPLACE FUNCTION public.create_order_fulfillments(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_rate numeric := 0.08;
BEGIN
  FOR r IN
    SELECT
      oi.order_id,
      p.seller_id,
      COALESCE(SUM(oi.price * oi.quantity), 0) AS gross
    FROM public.order_items oi
    JOIN public.products p ON p.id = oi.product_id
    WHERE oi.order_id = p_order_id
      AND p.seller_id IS NOT NULL
    GROUP BY oi.order_id, p.seller_id
  LOOP
    INSERT INTO public.order_fulfillments (
      order_id, seller_id, status,
      gross_amount, commission_rate, commission_amount, net_amount
    ) VALUES (
      r.order_id,
      r.seller_id,
      'paid',
      r.gross,
      v_rate,
      ROUND(r.gross * v_rate, 2),
      ROUND(r.gross * (1 - v_rate), 2)
    )
    ON CONFLICT (order_id, seller_id) DO NOTHING;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.create_order_fulfillments(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order_fulfillments(uuid) TO service_role;

-- ── 4. Seller: mark shipped ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.seller_mark_shipped(p_fulfillment_id uuid)
RETURNS public.order_fulfillments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  f public.order_fulfillments;
BEGIN
  SELECT * INTO f FROM public.order_fulfillments WHERE id = p_fulfillment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Fulfillment not found'; END IF;
  IF f.seller_id <> auth.uid() THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF f.status NOT IN ('paid', 'preparing') THEN
    RAISE EXCEPTION 'Cannot ship from status %', f.status;
  END IF;

  UPDATE public.order_fulfillments
  SET status = 'shipped',
      shipped_at = COALESCE(shipped_at, now()),
      updated_at = now()
  WHERE id = p_fulfillment_id
  RETURNING * INTO f;

  RETURN f;
END;
$$;

GRANT EXECUTE ON FUNCTION public.seller_mark_shipped(uuid) TO authenticated;

-- ── 5. Seller: confirm delivery + photo ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.seller_confirm_delivery(
  p_fulfillment_id uuid,
  p_photo_path text,
  p_note text DEFAULT NULL
)
RETURNS public.order_fulfillments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  f public.order_fulfillments;
BEGIN
  IF p_photo_path IS NULL OR length(trim(p_photo_path)) = 0 THEN
    RAISE EXCEPTION 'Delivery photo is required';
  END IF;

  SELECT * INTO f FROM public.order_fulfillments WHERE id = p_fulfillment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Fulfillment not found'; END IF;
  IF f.seller_id <> auth.uid() THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF f.status NOT IN ('shipped', 'preparing', 'paid') THEN
    RAISE EXCEPTION 'Cannot confirm delivery from status %', f.status;
  END IF;

  UPDATE public.order_fulfillments
  SET status = 'payout_ready',
      delivered_at = now(),
      delivery_photo_url = p_photo_path,
      delivery_note = NULLIF(trim(p_note), ''),
      shipped_at = COALESCE(shipped_at, now()),
      payout_ready_at = now(),
      updated_at = now()
  WHERE id = p_fulfillment_id
  RETURNING * INTO f;

  RETURN f;
END;
$$;

GRANT EXECUTE ON FUNCTION public.seller_confirm_delivery(uuid, text, text) TO authenticated;

-- ── 6. Seller: claim payout (delivered already ready, OR J+7 after ship) ─────
CREATE OR REPLACE FUNCTION public.seller_claim_payout(p_fulfillment_id uuid)
RETURNS public.order_fulfillments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  f public.order_fulfillments;
  eligible boolean := false;
BEGIN
  SELECT * INTO f FROM public.order_fulfillments WHERE id = p_fulfillment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Fulfillment not found'; END IF;
  IF f.seller_id <> auth.uid() THEN RAISE EXCEPTION 'Forbidden'; END IF;

  IF f.status = 'payout_ready' THEN
    eligible := true;
  ELSIF f.status = 'shipped'
    AND f.shipped_at IS NOT NULL
    AND f.shipped_at <= (now() - interval '7 days') THEN
    eligible := true;
  ELSIF f.status = 'delivered' THEN
    eligible := true;
  END IF;

  IF NOT eligible THEN
    RAISE EXCEPTION 'Payout not eligible yet (need delivery photo or 7 days after shipped)';
  END IF;

  UPDATE public.order_fulfillments
  SET status = 'paid_out',
      payout_ready_at = COALESCE(payout_ready_at, now()),
      paid_out_at = now(),
      updated_at = now()
  WHERE id = p_fulfillment_id
  RETURNING * INTO f;

  RETURN f;
END;
$$;

GRANT EXECUTE ON FUNCTION public.seller_claim_payout(uuid) TO authenticated;

-- ── 7. List seller fulfillments ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_seller_fulfillments(limit_count int DEFAULT 40)
RETURNS TABLE (
  fulfillment_id     uuid,
  order_id           uuid,
  fulfillment_status text,
  gross_amount       numeric,
  commission_amount  numeric,
  net_amount         numeric,
  shipped_at         timestamptz,
  delivered_at       timestamptz,
  delivery_photo_url text,
  payout_ready_at    timestamptz,
  paid_out_at        timestamptz,
  order_date         timestamptz,
  order_payment_status text,
  shipping_full_name text,
  shipping_phone     text,
  shipping_city      text,
  shipping_street    text,
  item_count         bigint,
  product_names      text,
  auto_payout_at     timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    f.id,
    f.order_id,
    f.status,
    f.gross_amount,
    f.commission_amount,
    f.net_amount,
    f.shipped_at,
    f.delivered_at,
    f.delivery_photo_url,
    f.payout_ready_at,
    f.paid_out_at,
    o.created_at,
    o.status,
    o.shipping_full_name,
    o.shipping_phone,
    o.shipping_city,
    o.shipping_street,
    (
      SELECT COUNT(*)
      FROM public.order_items oi
      JOIN public.products p ON p.id = oi.product_id
      WHERE oi.order_id = f.order_id AND p.seller_id = f.seller_id
    ),
    (
      SELECT string_agg(p.name, ', ')
      FROM public.order_items oi
      JOIN public.products p ON p.id = oi.product_id
      WHERE oi.order_id = f.order_id AND p.seller_id = f.seller_id
    ),
    CASE
      WHEN f.shipped_at IS NOT NULL THEN f.shipped_at + interval '7 days'
      ELSE NULL
    END
  FROM public.order_fulfillments f
  JOIN public.orders o ON o.id = f.order_id
  WHERE f.seller_id = auth.uid()
  ORDER BY o.created_at DESC
  LIMIT GREATEST(1, LEAST(limit_count, 100));
$$;

GRANT EXECUTE ON FUNCTION public.get_seller_fulfillments(int) TO authenticated;

-- Buyer can see fulfillments for their orders (already via SELECT policy)

-- ── 8. Storage bucket delivery proofs ───────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'delivery-proofs',
  'delivery-proofs',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types,
  public = false;

DROP POLICY IF EXISTS "delivery_proofs_upload_own" ON storage.objects;
CREATE POLICY "delivery_proofs_upload_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'delivery-proofs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "delivery_proofs_select" ON storage.objects;
CREATE POLICY "delivery_proofs_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'delivery-proofs'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
    )
  );
