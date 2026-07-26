
/*
# Amazon-like Marketplace: Full Schema Expansion

## Summary
Transforms the basic shop into a comprehensive Amazon-like marketplace with
seller/buyer profiles, saved addresses, product reviews and ratings,
wishlists, and enriched product data.

## New Tables

### profiles
User profile info (display name, avatar, phone) linked 1:1 to auth.users.
Created automatically via trigger on new user signup.

### addresses
Multiple shipping addresses per user. Supports is_default flag.

### reviews
Product reviews with 1-5 star rating, title, body, and verified-purchase flag.
One review per (user, product) pair. Triggers keep products.rating and
products.review_count in sync automatically.

### wishlists
User-scoped wishlist items. One row per (user, product) pair.

## Modified Tables

### products
New columns:
- deal_price: sale/discounted price (numeric, nullable)
- deal_ends_at: expiry timestamp for time-limited deals
- badge: text label ('best_seller', 'amazons_choice', 'new', 'limited_deal')
- featured: boolean flag for hero/homepage prominence
- view_count: integer page-view counter
- variants: JSONB array of {name, options[]} e.g. [{name:"Color",options:["Red","Blue"]}]
- images: JSONB array of additional image URLs (first = main, rest = gallery)
- about_items: JSONB array of bullet-point feature strings
- brand: brand/manufacturer name

## Security
- RLS enabled on all new tables.
- profiles: users can read any profile, update only their own.
- addresses: owner-scoped CRUD (authenticated only).
- reviews: anyone authenticated can read; insert/update/delete own.
- wishlists: owner-scoped CRUD.

## Triggers
- on_auth_user_created: auto-creates a profile row for every new signup.
- update_product_rating_trigger: recomputes products.rating and
  products.review_count after INSERT/UPDATE/DELETE on reviews.
*/

-- ─── profiles ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url   text,
  phone        text,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY "profiles_insert" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (new.id, split_part(new.email, '@', 1))
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── addresses ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS addresses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   text NOT NULL,
  phone       text,
  street      text NOT NULL,
  city        text NOT NULL,
  state_dept  text NOT NULL,
  postal_code text,
  country     text DEFAULT 'Haiti',
  is_default  boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "addresses_select" ON addresses;
CREATE POLICY "addresses_select" ON addresses FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "addresses_insert" ON addresses;
CREATE POLICY "addresses_insert" ON addresses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "addresses_update" ON addresses;
CREATE POLICY "addresses_update" ON addresses FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "addresses_delete" ON addresses;
CREATE POLICY "addresses_delete" ON addresses FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ─── reviews ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  rating            int NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title             text,
  body              text,
  verified_purchase boolean DEFAULT false,
  created_at        timestamptz DEFAULT now(),
  UNIQUE(product_id, user_id)
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reviews_select" ON reviews;
CREATE POLICY "reviews_select" ON reviews FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "reviews_insert" ON reviews;
CREATE POLICY "reviews_insert" ON reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "reviews_update" ON reviews;
CREATE POLICY "reviews_update" ON reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "reviews_delete" ON reviews;
CREATE POLICY "reviews_delete" ON reviews FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- trigger to keep products.rating and products.review_count in sync
CREATE OR REPLACE FUNCTION public.update_product_rating()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  target_product_id uuid;
BEGIN
  target_product_id := COALESCE(NEW.product_id, OLD.product_id);
  UPDATE public.products
  SET
    rating       = COALESCE((SELECT AVG(rating) FROM public.reviews WHERE product_id = target_product_id), 0),
    review_count = (SELECT COUNT(*) FROM public.reviews WHERE product_id = target_product_id)
  WHERE id = target_product_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_product_rating_trigger ON reviews;
CREATE TRIGGER update_product_rating_trigger
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_product_rating();

-- ─── wishlists ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wishlists (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, product_id)
);

ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wishlists_select" ON wishlists;
CREATE POLICY "wishlists_select" ON wishlists FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "wishlists_insert" ON wishlists;
CREATE POLICY "wishlists_insert" ON wishlists FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "wishlists_delete" ON wishlists;
CREATE POLICY "wishlists_delete" ON wishlists FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ─── product enhancements ─────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='deal_price') THEN
    ALTER TABLE public.products ADD COLUMN deal_price numeric;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='deal_ends_at') THEN
    ALTER TABLE public.products ADD COLUMN deal_ends_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='badge') THEN
    ALTER TABLE public.products ADD COLUMN badge text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='featured') THEN
    ALTER TABLE public.products ADD COLUMN featured boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='view_count') THEN
    ALTER TABLE public.products ADD COLUMN view_count int DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='variants') THEN
    ALTER TABLE public.products ADD COLUMN variants jsonb DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='images') THEN
    ALTER TABLE public.products ADD COLUMN images jsonb DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='about_items') THEN
    ALTER TABLE public.products ADD COLUMN about_items jsonb DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='brand') THEN
    ALTER TABLE public.products ADD COLUMN brand text;
  END IF;
END $$;

-- index for fast deal queries
CREATE INDEX IF NOT EXISTS idx_products_badge ON public.products(badge) WHERE badge IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_featured ON public.products(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_user ON wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_user ON addresses(user_id);
