/*
  P0 security: profiles RLS + checkout rate limit

  1. profiles SELECT: own row + admins only
  2. edge_rate_limits + claim_rate_limit() for checkout / payment edge functions
*/

-- ─── 1. Profiles ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;

CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "profiles_select_admin"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.is_admin());

-- ─── 2. Rate limit (service_role only) ───────────────────────────────────────

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
