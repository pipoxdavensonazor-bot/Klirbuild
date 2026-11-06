/*
  # Visual product search (CLIP 512 + pgvector)

  Public catalog rule stays the same as text search:
  products.seller_id IS NOT NULL AND products.published = true.

  - Stores one embedding per (product, image_url). Does not publish rows
    and does not assign seller_id.
  - search_products_by_image is SECURITY INVOKER. Anon/authenticated only
    see embeddings of products they can already read, and the SQL filters
    again.
  - consume_visual_search_rate_limit is service-role only, same shape as
    checkout-create (hashed keys, sliding windows, no cron).

  Does not alter auth.users, profiles.is_admin, or admin policies.

  Apply this migration BEFORE deploying the visual-search Edge Function.
  Idempotent.
*/

SET search_path = public, extensions;

DO $ext$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
    CREATE EXTENSION vector WITH SCHEMA extensions;
  END IF;
END
$ext$;

CREATE TABLE IF NOT EXISTS public.product_image_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url text NOT NULL CHECK (char_length(image_url) BETWEEN 8 AND 2000),
  embedding vector(512) NOT NULL,
  model text NOT NULL CHECK (char_length(model) BETWEEN 3 AND 200),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  UNIQUE (product_id, image_url)
);

CREATE INDEX IF NOT EXISTS product_image_embeddings_product
  ON public.product_image_embeddings (product_id);

CREATE INDEX IF NOT EXISTS product_image_embeddings_cosine_hnsw
  ON public.product_image_embeddings
  USING hnsw (embedding vector_cosine_ops);

ALTER TABLE public.product_image_embeddings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.product_image_embeddings FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.product_image_embeddings TO anon, authenticated;

DROP POLICY IF EXISTS "Catalog readers see published seller embeddings"
  ON public.product_image_embeddings;
CREATE POLICY "Catalog readers see published seller embeddings"
  ON public.product_image_embeddings
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.products p
      WHERE p.id = product_image_embeddings.product_id
        AND p.seller_id IS NOT NULL
        AND p.published = true
    )
  );

COMMENT ON TABLE public.product_image_embeddings IS
  'CLIP ViT-B/32 image embeddings (512). Written by the service role indexer only.';

CREATE OR REPLACE FUNCTION public.search_products_by_image(
  embedding vector(512),
  lim integer DEFAULT 24
)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  price numeric,
  original_price numeric,
  deal_price numeric,
  deal_ends_at timestamptz,
  image_url text,
  images jsonb,
  about_items jsonb,
  variants jsonb,
  category_id uuid,
  category_name text,
  seller_id uuid,
  seller_department text,
  published boolean,
  rating numeric,
  review_count integer,
  in_stock boolean,
  badge text,
  featured boolean,
  sponsored boolean,
  view_count integer,
  brand text,
  created_at timestamptz,
  similarity double precision
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, extensions
AS $$
  WITH ranked AS (
    SELECT
      p.id,
      p.name,
      p.description,
      p.price,
      p.original_price,
      p.deal_price,
      p.deal_ends_at,
      p.image_url,
      p.images,
      p.about_items,
      p.variants,
      p.category_id,
      c.name AS category_name,
      p.seller_id,
      p.seller_department,
      p.published,
      p.rating,
      p.review_count,
      p.in_stock,
      p.badge,
      p.featured,
      p.sponsored,
      p.view_count,
      p.brand,
      p.created_at,
      (1 - (e.embedding <=> search_products_by_image.embedding))::double precision AS similarity,
      row_number() OVER (
        PARTITION BY p.id
        ORDER BY e.embedding <=> search_products_by_image.embedding
      ) AS rn
    FROM public.product_image_embeddings e
    JOIN public.products p ON p.id = e.product_id
    LEFT JOIN public.categories c ON c.id = p.category_id
    WHERE p.seller_id IS NOT NULL
      AND p.published = true
      AND (1 - (e.embedding <=> search_products_by_image.embedding)) >= 0.20
  )
  SELECT
    id, name, description, price, original_price, deal_price, deal_ends_at,
    image_url, images, about_items, variants, category_id, category_name,
    seller_id, seller_department, published, rating, review_count, in_stock,
    badge, featured, sponsored, view_count, brand, created_at, similarity
  FROM ranked
  WHERE rn = 1
  ORDER BY similarity DESC, sponsored DESC NULLS LAST
  LIMIT LEAST(GREATEST(COALESCE(lim, 24), 1), 48);
$$;

COMMENT ON FUNCTION public.search_products_by_image(vector, integer) IS
  'Nearest published seller products for a CLIP image embedding. SECURITY INVOKER.';

REVOKE ALL ON FUNCTION public.search_products_by_image(vector, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_products_by_image(vector, integer) TO anon, authenticated;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.search_products_by_image(vector, integer) TO service_role;
  END IF;
END $$;

-- Anonymous photo-search throttle. Same pattern as checkout-create:
-- hashed keys, advisory locks, 24h cleanup inside the RPC, service role only.
CREATE TABLE IF NOT EXISTS public.visual_search_rate_limits (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  bucket text NOT NULL CHECK (bucket IN ('ip', 'user')),
  key_hash text NOT NULL CHECK (char_length(key_hash) BETWEEN 32 AND 128),
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now()
);

CREATE INDEX IF NOT EXISTS visual_search_rate_limits_lookup
  ON public.visual_search_rate_limits (bucket, key_hash, created_at DESC);

ALTER TABLE public.visual_search_rate_limits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.visual_search_rate_limits FROM PUBLIC, anon, authenticated;

COMMENT ON TABLE public.visual_search_rate_limits IS
  'Short-lived visual-search counters. Hashed IP / user keys. Service role only.';

CREATE OR REPLACE FUNCTION public.consume_visual_search_rate_limit(
  p_ip_hash text,
  p_user_hash text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  ip_minute_count integer;
  ip_hour_count integer;
  user_count integer;
BEGIN
  IF p_ip_hash IS NULL
     OR char_length(p_ip_hash) < 32
     OR char_length(p_ip_hash) > 128 THEN
    RAISE EXCEPTION 'invalid rate limit key' USING ERRCODE = '22023';
  END IF;
  IF p_user_hash IS NOT NULL
     AND p_user_hash <> ''
     AND (char_length(p_user_hash) < 32 OR char_length(p_user_hash) > 128) THEN
    RAISE EXCEPTION 'invalid rate limit key' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('visual-ip:' || p_ip_hash)
  );
  IF p_user_hash IS NOT NULL AND p_user_hash <> '' THEN
    PERFORM pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtext('visual-user:' || p_user_hash)
    );
  END IF;

  DELETE FROM public.visual_search_rate_limits
  WHERE created_at < pg_catalog.now() - interval '24 hours';

  SELECT count(*)::integer INTO ip_minute_count
  FROM public.visual_search_rate_limits
  WHERE bucket = 'ip'
    AND key_hash = p_ip_hash
    AND created_at >= pg_catalog.now() - interval '1 minute';

  IF ip_minute_count >= 8 THEN
    RETURN pg_catalog.jsonb_build_object(
      'limited', true,
      'retry_after_seconds', 60,
      'reason', 'ip_minute'
    );
  END IF;

  SELECT count(*)::integer INTO ip_hour_count
  FROM public.visual_search_rate_limits
  WHERE bucket = 'ip'
    AND key_hash = p_ip_hash
    AND created_at >= pg_catalog.now() - interval '1 hour';

  IF ip_hour_count >= 40 THEN
    RETURN pg_catalog.jsonb_build_object(
      'limited', true,
      'retry_after_seconds', 3600,
      'reason', 'ip_hour'
    );
  END IF;

  IF p_user_hash IS NOT NULL AND p_user_hash <> '' THEN
    SELECT count(*)::integer INTO user_count
    FROM public.visual_search_rate_limits
    WHERE bucket = 'user'
      AND key_hash = p_user_hash
      AND created_at >= pg_catalog.now() - interval '10 minutes';

    IF user_count >= 20 THEN
      RETURN pg_catalog.jsonb_build_object(
        'limited', true,
        'retry_after_seconds', 600,
        'reason', 'user'
      );
    END IF;
  END IF;

  INSERT INTO public.visual_search_rate_limits (bucket, key_hash)
  VALUES ('ip', p_ip_hash);

  IF p_user_hash IS NOT NULL AND p_user_hash <> '' THEN
    INSERT INTO public.visual_search_rate_limits (bucket, key_hash)
    VALUES ('user', p_user_hash);
  END IF;

  RETURN pg_catalog.jsonb_build_object('limited', false);
END;
$$;

REVOKE ALL ON FUNCTION public.consume_visual_search_rate_limit(text, text) FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.consume_visual_search_rate_limit(text, text) TO service_role;
  END IF;
END $$;
