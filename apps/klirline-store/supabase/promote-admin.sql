-- ═══════════════════════════════════════════════════════════════
-- FIX ADMIN — panneau Admin klirline.com
-- Projet: https://supabase.com/dashboard/project/htwtdoxwznvvksxtzpkp/sql/new
-- Coller TOUT ce script → Run
-- ═══════════════════════════════════════════════════════════════

-- A) Confirmer email + reset password pour contact@klirline.ca
UPDATE auth.users
SET
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  confirmation_token = '',
  recovery_token = '',
  email_change_token_new = '',
  email_change = '',
  encrypted_password = crypt('Klirline@Admin2026', gen_salt('bf'))
WHERE lower(email) = lower('contact@klirline.ca');

-- B) Aussi pour l’ancien admin Gmail (si présent)
UPDATE auth.users
SET
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  confirmation_token = ''
WHERE lower(email) = lower('pipoxdavensonazor@gmail.com');

-- C) Promouvoir les deux en admin
INSERT INTO public.profiles (id, display_name, is_admin)
SELECT id,
       CASE WHEN lower(email) = lower('contact@klirline.ca') THEN 'Klirline Admin' ELSE COALESCE(raw_user_meta_data->>'display_name', 'Admin') END,
       true
FROM auth.users
WHERE lower(email) IN (lower('contact@klirline.ca'), lower('pipoxdavensonazor@gmail.com'))
ON CONFLICT (id) DO UPDATE
SET is_admin = true;

-- D) Vérification
SELECT
  u.email,
  u.email_confirmed_at IS NOT NULL AS email_ok,
  p.is_admin,
  p.display_name
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE lower(u.email) IN (lower('contact@klirline.ca'), lower('pipoxdavensonazor@gmail.com'));
