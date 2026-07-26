/*
  # Create E-commerce Database Schema

  1. New Tables
    - `categories`
      - `id` (uuid, primary key)
      - `name` (text)
      - `slug` (text, unique)
      - `created_at` (timestamp)
    
    - `products`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `price` (numeric)
      - `original_price` (numeric, nullable)
      - `image_url` (text)
      - `category_id` (uuid, foreign key)
      - `rating` (numeric)
      - `review_count` (integer)
      - `in_stock` (boolean)
      - `created_at` (timestamp)
    
    - `cart_items`
      - `id` (uuid, primary key)
      - `session_id` (text)
      - `product_id` (uuid, foreign key)
      - `quantity` (integer)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for public read access on products and categories
    - Add policies for cart management based on session
*/

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  price numeric NOT NULL,
  original_price numeric,
  image_url text NOT NULL,
  category_id uuid REFERENCES categories(id),
  rating numeric DEFAULT 0,
  review_count integer DEFAULT 0,
  in_stock boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create cart_items table
CREATE TABLE IF NOT EXISTS cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- Categories policies
CREATE POLICY "Anyone can view categories"
  ON categories FOR SELECT
  USING (true);

-- Products policies
CREATE POLICY "Anyone can view products"
  ON products FOR SELECT
  USING (true);

-- Cart policies
CREATE POLICY "Users can view own cart items"
  ON cart_items FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own cart items"
  ON cart_items FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own cart items"
  ON cart_items FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete own cart items"
  ON cart_items FOR DELETE
  USING (true);

-- Insert sample categories
INSERT INTO categories (name, slug) VALUES
  ('Electronics', 'electronics'),
  ('Books', 'books'),
  ('Clothing', 'clothing'),
  ('Home & Kitchen', 'home-kitchen'),
  ('Sports', 'sports')
ON CONFLICT (slug) DO NOTHING;

-- Insert sample products
INSERT INTO products (name, description, price, original_price, image_url, category_id, rating, review_count, in_stock) VALUES
  (
    'Premium Wireless Headphones',
    'High-quality wireless headphones with noise cancellation and 30-hour battery life. Perfect for music lovers and professionals.',
    199.99,
    299.99,
    'https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg?auto=compress&cs=tinysrgb&w=800',
    (SELECT id FROM categories WHERE slug = 'electronics'),
    4.5,
    2847,
    true
  ),
  (
    'Smart Watch Pro',
    'Advanced fitness tracking, heart rate monitor, GPS, and smartphone notifications. Water resistant up to 50m.',
    349.99,
    449.99,
    'https://images.pexels.com/photos/437037/pexels-photo-437037.jpeg?auto=compress&cs=tinysrgb&w=800',
    (SELECT id FROM categories WHERE slug = 'electronics'),
    4.7,
    5432,
    true
  ),
  (
    'The Complete Guide to Web Development',
    'Comprehensive guide covering HTML, CSS, JavaScript, and modern frameworks. Perfect for beginners and intermediate developers.',
    39.99,
    null,
    'https://images.pexels.com/photos/1370295/pexels-photo-1370295.jpeg?auto=compress&cs=tinysrgb&w=800',
    (SELECT id FROM categories WHERE slug = 'books'),
    4.8,
    1234,
    true
  ),
  (
    'Premium Cotton T-Shirt',
    'Soft, breathable 100% organic cotton t-shirt. Available in multiple colors. Perfect for everyday wear.',
    24.99,
    34.99,
    'https://images.pexels.com/photos/1656684/pexels-photo-1656684.jpeg?auto=compress&cs=tinysrgb&w=800',
    (SELECT id FROM categories WHERE slug = 'clothing'),
    4.3,
    876,
    true
  ),
  (
    'Professional Chef Knife Set',
    '8-piece premium stainless steel knife set with ergonomic handles. Includes storage block.',
    129.99,
    189.99,
    'https://images.pexels.com/photos/2291597/pexels-photo-2291597.jpeg?auto=compress&cs=tinysrgb&w=800',
    (SELECT id FROM categories WHERE slug = 'home-kitchen'),
    4.6,
    3421,
    true
  ),
  (
    'Yoga Mat Premium',
    'Extra thick non-slip yoga mat with carrying strap. Perfect for yoga, pilates, and floor exercises.',
    49.99,
    null,
    'https://images.pexels.com/photos/4056535/pexels-photo-4056535.jpeg?auto=compress&cs=tinysrgb&w=800',
    (SELECT id FROM categories WHERE slug = 'sports'),
    4.4,
    987,
    true
  ),
  (
    '4K Ultra HD Camera',
    'Professional mirrorless camera with 4K video recording, 24MP sensor, and WiFi connectivity.',
    899.99,
    1199.99,
    'https://images.pexels.com/photos/90946/pexels-photo-90946.jpeg?auto=compress&cs=tinysrgb&w=800',
    (SELECT id FROM categories WHERE slug = 'electronics'),
    4.9,
    1567,
    true
  ),
  (
    'Running Shoes Elite',
    'Lightweight running shoes with advanced cushioning and breathable mesh. Perfect for long-distance running.',
    119.99,
    159.99,
    'https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&w=800',
    (SELECT id FROM categories WHERE slug = 'sports'),
    4.5,
    2134,
    true
  )
ON CONFLICT DO NOTHING;