-- ═══════════════════════════════════════════════════════════════
-- PROMOUVOIR contact@klirline.ca EN ADMIN
-- Supabase → SQL Editor → Run
-- ═══════════════════════════════════════════════════════════════

UPDATE public.profiles
SET is_admin = true,
    display_name = COALESCE(display_name, 'Klirline Admin')
WHERE id = (
  SELECT id FROM auth.users
  WHERE lower(email) = lower('contact@klirline.ca')
);

-- Si le profil n'existe pas encore, créez-le :
INSERT INTO public.profiles (id, display_name, is_admin)
SELECT id, 'Klirline Admin', true
FROM auth.users
WHERE lower(email) = lower('contact@klirline.ca')
ON CONFLICT (id) DO UPDATE
SET is_admin = true,
    display_name = COALESCE(public.profiles.display_name, 'Klirline Admin');

-- Vérification
SELECT u.id, u.email, p.is_admin, p.display_name, u.email_confirmed_at
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE lower(u.email) = lower('contact@klirline.ca');
