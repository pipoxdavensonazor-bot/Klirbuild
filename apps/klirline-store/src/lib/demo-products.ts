import type { Category, Product } from './supabase';

export type DemoProduct = Product & { department: string };

export const DEMO_CATEGORIES: Category[] = [
  { id: 'cat-electronics', name: 'Electronics', slug: 'electronics', created_at: new Date().toISOString() },
  { id: 'cat-books', name: 'Books', slug: 'books', created_at: new Date().toISOString() },
  { id: 'cat-clothing', name: 'Clothing', slug: 'clothing', created_at: new Date().toISOString() },
  { id: 'cat-home', name: 'Home & Kitchen', slug: 'home-kitchen', created_at: new Date().toISOString() },
  { id: 'cat-sports', name: 'Sports', slug: 'sports', created_at: new Date().toISOString() },
];

function product(partial: {
  id: string;
  name: string;
  description: string;
  price: number;
  original_price: number | null;
  image_url: string;
  category_id: string;
  department: string;
  brand?: string;
  badge?: string | null;
  rating: number;
  review_count: number;
}): DemoProduct {
  return {
    deal_price: null,
    deal_ends_at: null,
    images: [partial.image_url],
    about_items: [],
    variants: [],
    seller_id: null,
    in_stock: true,
    featured: false,
    view_count: 0,
    brand: partial.brand ?? null,
    badge: partial.badge ?? null,
    created_at: new Date().toISOString(),
    id: partial.id,
    name: partial.name,
    description: partial.description,
    price: partial.price,
    original_price: partial.original_price,
    image_url: partial.image_url,
    category_id: partial.category_id,
    department: partial.department,
    rating: partial.rating,
    review_count: partial.review_count,
  };
}

/** Curated catalog used when Supabase is unavailable or returns junk-only data. */
export const DEMO_PRODUCTS: DemoProduct[] = [
  product({
    id: 'demo-headphones',
    name: 'Premium Wireless Headphones',
    description: 'Noise-cancelling wireless headphones with 30-hour battery life.',
    price: 199.99,
    original_price: 299.99,
    image_url: 'https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg?auto=compress&cs=tinysrgb&w=800',
    category_id: 'cat-electronics',
    department: 'Electronics',
    brand: 'Klir Audio',
    rating: 4.5,
    review_count: 2847,
    badge: 'best_seller',
  }),
  product({
    id: 'demo-watch',
    name: 'Smart Watch Pro',
    description: 'Fitness tracking, heart rate, GPS, and smartphone notifications.',
    price: 349.99,
    original_price: 449.99,
    image_url: 'https://images.pexels.com/photos/437037/pexels-photo-437037.jpeg?auto=compress&cs=tinysrgb&w=800',
    category_id: 'cat-electronics',
    department: 'Electronics',
    brand: 'Klir Wear',
    rating: 4.7,
    review_count: 5432,
    badge: 'amazons_choice',
  }),
  product({
    id: 'demo-book',
    name: 'The Complete Guide to Web Development',
    description: 'HTML, CSS, JavaScript, and modern frameworks for beginners.',
    price: 39.99,
    original_price: null,
    image_url: 'https://images.pexels.com/photos/1370295/pexels-photo-1370295.jpeg?auto=compress&cs=tinysrgb&w=800',
    category_id: 'cat-books',
    department: 'Books',
    brand: 'Klir Press',
    rating: 4.8,
    review_count: 1234,
  }),
  product({
    id: 'demo-tee',
    name: 'Premium Cotton T-Shirt',
    description: 'Soft organic cotton tee for everyday wear.',
    price: 24.99,
    original_price: 34.99,
    image_url: 'https://images.pexels.com/photos/1656684/pexels-photo-1656684.jpeg?auto=compress&cs=tinysrgb&w=800',
    category_id: 'cat-clothing',
    department: 'Clothing & Fashion',
    brand: 'Klir Wear',
    rating: 4.3,
    review_count: 876,
    badge: 'new',
  }),
  product({
    id: 'demo-knives',
    name: 'Professional Chef Knife Set',
    description: '8-piece stainless steel knife set with storage block.',
    price: 129.99,
    original_price: 189.99,
    image_url: 'https://images.pexels.com/photos/4226896/pexels-photo-4226896.jpeg?auto=compress&cs=tinysrgb&w=800',
    category_id: 'cat-home',
    department: 'Home & Kitchen',
    brand: 'Klir Home',
    rating: 4.6,
    review_count: 3421,
    badge: 'best_seller',
  }),
  product({
    id: 'demo-yoga',
    name: 'Yoga Mat Premium',
    description: 'Extra-thick non-slip yoga mat with carrying strap.',
    price: 49.99,
    original_price: null,
    image_url: 'https://images.pexels.com/photos/4056535/pexels-photo-4056535.jpeg?auto=compress&cs=tinysrgb&w=800',
    category_id: 'cat-sports',
    department: 'Sports & Outdoors',
    brand: 'Klir Fit',
    rating: 4.4,
    review_count: 987,
  }),
  product({
    id: 'demo-camera',
    name: '4K Ultra HD Camera',
    description: 'Mirrorless 4K camera with dual card slots and image stabilization.',
    price: 899.99,
    original_price: 1199.99,
    image_url: 'https://images.pexels.com/photos/90946/pexels-photo-90946.jpeg?auto=compress&cs=tinysrgb&w=800',
    category_id: 'cat-electronics',
    department: 'Electronics',
    brand: 'Klir Optics',
    rating: 4.6,
    review_count: 1567,
    badge: 'limited_deal',
  }),
  product({
    id: 'demo-shoes',
    name: 'Running Shoes Elite',
    description: 'Lightweight cushioned runners for road and trail.',
    price: 119.99,
    original_price: 159.99,
    image_url: 'https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&w=800',
    category_id: 'cat-sports',
    department: 'Sports & Outdoors',
    brand: 'Klir Fit',
    rating: 4.5,
    review_count: 2134,
  }),
];
