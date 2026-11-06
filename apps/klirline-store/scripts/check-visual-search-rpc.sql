-- Read-only shape check for public.search_products_by_image.
-- No INSERT, UPDATE, DELETE, or index build. Safe for a login that can read
-- pg_catalog (postgres, or a role such as pg_readonly with SELECT on pg_proc).
--
-- psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/check-visual-search-rpc.sql
--
-- Expect one row: security_definer = false, volatile_code = s (STABLE).
-- result_type must list category_name text and sponsored boolean.

SELECT
  n.nspname AS schema_name,
  p.proname AS function_name,
  p.prosecdef AS security_definer,
  p.provolatile AS volatile_code,
  pg_get_function_identity_arguments(p.oid) AS args,
  pg_get_function_result(p.oid) AS result_type
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'search_products_by_image';

-- Execute grants. anon and authenticated are required. service_role may exist.
SELECT
  grantee.rolname AS grantee,
  priv.privilege_type
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) AS priv
JOIN pg_roles grantee ON grantee.oid = priv.grantee
WHERE n.nspname = 'public'
  AND p.proname = 'search_products_by_image'
  AND priv.privilege_type = 'EXECUTE'
ORDER BY grantee.rolname;

-- Anon call (RLS applies). Roll back so a scratch embedding is never kept.
-- Replace the vector literal with a real embedding only in a transaction you abort.
--
-- BEGIN;
-- SET LOCAL ROLE anon;
-- SELECT id, sponsored, category_name, published, seller_id, similarity
-- FROM public.search_products_by_image(
--   array_fill(0, ARRAY[512])::vector(512),
--   5
-- );
-- -- unpublished / seller_id NULL must be absent
-- SELECT COUNT(*) AS leaked
-- FROM public.search_products_by_image(array_fill(0, ARRAY[512])::vector(512), 24) r
-- WHERE r.published IS NOT TRUE OR r.seller_id IS NULL;
-- ROLLBACK;
--
-- service_role bypasses RLS but this RPC still filters in SQL.
-- The leaked count above must stay 0 in that role too.
--
-- SET LOCAL ROLE service_role;
-- SELECT COUNT(*) AS leaked
-- FROM public.search_products_by_image(array_fill(0, ARRAY[512])::vector(512), 24) r
-- WHERE r.published IS NOT TRUE OR r.seller_id IS NULL;
