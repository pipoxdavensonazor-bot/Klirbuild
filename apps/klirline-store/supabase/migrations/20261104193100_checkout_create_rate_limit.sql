/*
  # Rate limit checkout-create

  Pending orders are inserted with the service role. guest_token is generated
  inside the edge function, so it cannot throttle a caller who retries.
  This table stores short-window counters keyed by SHA-256 hashes of
  the client IP and either the guest email or the signed-in user id.

  Limits (sliding windows, applied in consume_checkout_rate_limit):
  - 5 creates per IP per minute
  - 30 creates per IP per hour
  - 5 creates per guest email per 10 minutes
  - 10 creates per signed-in user per 10 minutes

  No policy is granted to anon or authenticated. The edge function calls
  the RPC with the service role. Rows older than 24 hours are deleted
  inside the RPC, so no cron is required.

  Idempotent: safe to run more than once.
*/

CREATE TABLE IF NOT EXISTS public.checkout_rate_limits (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  bucket text NOT NULL CHECK (bucket IN ('ip', 'email', 'user')),
  key_hash text NOT NULL CHECK (char_length(key_hash) BETWEEN 32 AND 128),
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now()
);

CREATE INDEX IF NOT EXISTS checkout_rate_limits_lookup
  ON public.checkout_rate_limits (bucket, key_hash, created_at DESC);

ALTER TABLE public.checkout_rate_limits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.checkout_rate_limits FROM PUBLIC, anon, authenticated;

COMMENT ON TABLE public.checkout_rate_limits IS
  'Short-lived checkout-create counters. Hashed IP / email / user keys. Service role only.';

CREATE OR REPLACE FUNCTION public.consume_checkout_rate_limit(
  p_ip_hash text,
  p_actor_hash text,
  p_actor_kind text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  ip_minute_count integer;
  ip_hour_count integer;
  actor_count integer;
  actor_window interval;
  actor_max integer;
  actor_retry integer;
  actor_bucket text;
BEGIN
  IF p_actor_kind NOT IN ('email', 'user') THEN
    RAISE EXCEPTION 'invalid actor kind' USING ERRCODE = '22023';
  END IF;
  IF p_ip_hash IS NULL
     OR p_actor_hash IS NULL
     OR char_length(p_ip_hash) < 32
     OR char_length(p_ip_hash) > 128
     OR char_length(p_actor_hash) < 32
     OR char_length(p_actor_hash) > 128 THEN
    RAISE EXCEPTION 'invalid rate limit key' USING ERRCODE = '22023';
  END IF;

  -- Same lock order on every call so two keys cannot deadlock.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('checkout-ip:' || p_ip_hash)
  );
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('checkout-actor:' || p_actor_kind || ':' || p_actor_hash)
  );

  DELETE FROM public.checkout_rate_limits
  WHERE created_at < pg_catalog.now() - interval '24 hours';

  SELECT count(*)::integer INTO ip_minute_count
  FROM public.checkout_rate_limits
  WHERE bucket = 'ip'
    AND key_hash = p_ip_hash
    AND created_at >= pg_catalog.now() - interval '1 minute';

  IF ip_minute_count >= 5 THEN
    RETURN pg_catalog.jsonb_build_object(
      'limited', true,
      'retry_after_seconds', 60,
      'reason', 'ip_minute'
    );
  END IF;

  SELECT count(*)::integer INTO ip_hour_count
  FROM public.checkout_rate_limits
  WHERE bucket = 'ip'
    AND key_hash = p_ip_hash
    AND created_at >= pg_catalog.now() - interval '1 hour';

  IF ip_hour_count >= 30 THEN
    RETURN pg_catalog.jsonb_build_object(
      'limited', true,
      'retry_after_seconds', 3600,
      'reason', 'ip_hour'
    );
  END IF;

  IF p_actor_kind = 'email' THEN
    actor_bucket := 'email';
    actor_window := interval '10 minutes';
    actor_max := 5;
    actor_retry := 600;
  ELSE
    actor_bucket := 'user';
    actor_window := interval '10 minutes';
    actor_max := 10;
    actor_retry := 600;
  END IF;

  SELECT count(*)::integer INTO actor_count
  FROM public.checkout_rate_limits
  WHERE bucket = actor_bucket
    AND key_hash = p_actor_hash
    AND created_at >= pg_catalog.now() - actor_window;

  IF actor_count >= actor_max THEN
    RETURN pg_catalog.jsonb_build_object(
      'limited', true,
      'retry_after_seconds', actor_retry,
      'reason', actor_bucket
    );
  END IF;

  INSERT INTO public.checkout_rate_limits (bucket, key_hash)
  VALUES
    ('ip', p_ip_hash),
    (actor_bucket, p_actor_hash);

  RETURN pg_catalog.jsonb_build_object('limited', false);
END;
$$;

REVOKE ALL ON FUNCTION public.consume_checkout_rate_limit(text, text, text) FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.consume_checkout_rate_limit(text, text, text) TO service_role;
  END IF;
END $$;
