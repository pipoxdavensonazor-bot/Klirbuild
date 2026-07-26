import { useState, useEffect } from 'react';
import {
  ArrowLeft, Heart, ShoppingCart, Zap, Share2, Shield, Truck,
  RefreshCw, Star, ChevronLeft, ChevronRight, Plus, Minus,
} from 'lucide-react';
import type { Product, Review } from '../lib/supabase';
import { supabase, BADGE_CONFIG, getDisplayPrice, getOriginalPrice, discountPct } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { StarRating } from './StarRating';

interface ProductDetailPageProps {
  product: Product;
  onBack: () => void;
  onAddToCart: (product: Product) => void;
}

export const ProductDetailPage = ({ product, onBack, onAddToCart }: ProductDetailPageProps) => {
  const { user } = useAuth();
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [inWishlist, setInWishlist] = useState(false);
  const [reviews, setReviews] = useState<(Review & { profiles?: { display_name: string | null } })[]>([]);
  const [userReview, setUserReview] = useState<{ rating: number; title: string; body: string } | null>(null);
  const [reviewDraft, setReviewDraft] = useState({ rating: 0, title: '', body: '' });
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);

  const allImages = [product.image_url, ...(product.images ?? [])].filter(Boolean);
  const displayPrice = getDisplayPrice(product);
  const originalPrice = getOriginalPrice(product);
  const pct = discountPct(product);
  const badge = product.badge ? BADGE_CONFIG[product.badge] : null;

  // Load reviews and wishlist status
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('reviews')
        .select('*, profiles(display_name)')
        .eq('product_id', product.id)
        .order('created_at', { ascending: false });
      if (data) setReviews(data);

      if (user) {
        const { data: wl } = await supabase
          .from('wishlists')
          .select('id')
          .eq('product_id', product.id)
          .maybeSingle();
        setInWishlist(!!wl);

        const mine = data?.find(r => r.user_id === user.id);
        if (mine) {
          setUserReview({ rating: mine.rating, title: mine.title ?? '', body: mine.body ?? '' });
          setReviewDraft({ rating: mine.rating, title: mine.title ?? '', body: mine.body ?? '' });
        }
      }
    })();

    // Increment view count (fire-and-forget; RPC may be missing in demo)
    void supabase.rpc('increment_product_views' as never, { product_id: product.id } as never);
  }, [product.id, user]);

  const toggleWishlist = async () => {
    if (!user) return;
    if (inWishlist) {
      await supabase.from('wishlists').delete().eq('product_id', product.id);
      setInWishlist(false);
    } else {
      await supabase.from('wishlists').insert({ product_id: product.id });
      setInWishlist(true);
    }
  };

  const handleAddToCart = () => {
    onAddToCart(product);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const submitReview = async () => {
    if (!user || reviewDraft.rating === 0) return;
    setReviewLoading(true);
    await supabase.from('reviews').upsert({
      product_id: product.id,
      rating: reviewDraft.rating,
      title: reviewDraft.title || null,
      body: reviewDraft.body || null,
    }, { onConflict: 'product_id,user_id' });

    const { data } = await supabase
      .from('reviews')
      .select('*, profiles(display_name)')
      .eq('product_id', product.id)
      .order('created_at', { ascending: false });
    if (data) setReviews(data);
    setUserReview(reviewDraft);
    setShowReviewForm(false);
    setReviewLoading(false);
  };

  // Rating distribution
  const dist = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
    pct: reviews.length ? Math.round((reviews.filter(r => r.rating === star).length / reviews.length) * 100) : 0,
  }));

  const prevImage = () => setSelectedImage(i => (i - 1 + allImages.length) % allImages.length);
  const nextImage = () => setSelectedImage(i => (i + 1) % allImages.length);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="max-w-[1500px] mx-auto px-4 py-2 flex items-center gap-2 text-sm text-gray-500">
          <button onClick={onBack} className="flex items-center gap-1 hover:text-orange-600 transition-colors font-medium">
            <ArrowLeft className="w-4 h-4" /> Back to results
          </button>
          <span>/</span>
          <span className="text-gray-400 truncate max-w-xs">{product.name}</span>
        </div>
      </div>

      <div className="max-w-[1500px] mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* ── Image Gallery ──────────────────────────────────────────── */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-xl border border-gray-200 p-4 sticky top-24">
              {/* Main image */}
              <div className="relative aspect-square bg-gray-50 rounded-lg overflow-hidden mb-3">
                <img
                  src={allImages[selectedImage] ?? product.image_url}
                  alt={product.name}
                  className="w-full h-full object-contain p-4"
                />
                {allImages.length > 1 && (
                  <>
                    <button onClick={prevImage} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow flex items-center justify-center hover:bg-gray-50 transition-colors">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button onClick={nextImage} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow flex items-center justify-center hover:bg-gray-50 transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </>
                )}
                {pct && pct > 0 && (
                  <span className="absolute top-3 left-3 bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded">
                    -{pct}% OFF
                  </span>
                )}
              </div>

              {/* Thumbnails */}
              {allImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {allImages.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedImage(i)}
                      className={`flex-shrink-0 w-14 h-14 rounded-lg border-2 overflow-hidden transition-all ${
                        selectedImage === i ? 'border-orange-500' : 'border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-contain p-1" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Product Info ───────────────────────────────────────────── */}
          <div className="lg:col-span-5 space-y-4">
            {badge && (
              <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full ${badge.classes}`}>
                {badge.label}
              </span>
            )}

            {product.brand && (
              <p className="text-sm text-blue-600 font-medium">{product.brand}</p>
            )}

            <h1 className="text-2xl font-medium text-gray-900 leading-snug">{product.name}</h1>

            {/* Rating summary */}
            {product.rating > 0 && (
              <div className="flex items-center gap-3 pb-2 border-b border-gray-200">
                <StarRating value={product.rating} size="md" />
                <span className="text-sm text-blue-600 cursor-pointer hover:text-orange-500">
                  {product.rating.toFixed(1)} · {product.review_count.toLocaleString()} ratings
                </span>
              </div>
            )}

            {/* Price */}
            <div className="space-y-1">
              {pct && pct > 0 && (
                <p className="text-sm text-red-600 font-semibold">
                  {pct}% off — Limited time deal
                </p>
              )}
              <div className="flex items-baseline gap-3">
                <span className="text-sm text-gray-500">Price:</span>
                <span className="text-3xl font-bold text-gray-900">
                  HTG {displayPrice.toLocaleString('fr-HT', { minimumFractionDigits: 2 })}
                </span>
              </div>
              {originalPrice && originalPrice > displayPrice && (
                <p className="text-sm text-gray-500">
                  List price:{' '}
                  <span className="line-through">
                    HTG {originalPrice.toLocaleString('fr-HT', { minimumFractionDigits: 2 })}
                  </span>
                </p>
              )}
            </div>

            {/* Variants */}
            {(product.variants ?? []).map(variant => (
              <div key={variant.name}>
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  {variant.name}:{' '}
                  <span className="font-normal text-gray-500">{selectedVariants[variant.name] ?? 'Select one'}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {variant.options.map(opt => (
                    <button
                      key={opt}
                      onClick={() => setSelectedVariants(s => ({ ...s, [variant.name]: opt }))}
                      className={`px-3 py-1.5 rounded border text-sm transition-all ${
                        selectedVariants[variant.name] === opt
                          ? 'border-orange-500 bg-orange-50 text-orange-700 font-semibold'
                          : 'border-gray-300 text-gray-700 hover:border-orange-400'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* About this item */}
            {(product.about_items ?? []).length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">About this item</h3>
                <ul className="space-y-1">
                  {product.about_items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-2 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Description */}
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Description</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>
            </div>
          </div>

          {/* ── Buy Box ────────────────────────────────────────────────── */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200 p-4 sticky top-24 space-y-4">
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  HTG {displayPrice.toLocaleString('fr-HT', { minimumFractionDigits: 2 })}
                </p>
                {pct && <p className="text-xs text-red-600 font-medium">Save {pct}%</p>}
              </div>

              <div className="flex items-center gap-1 text-sm">
                <Truck className="w-4 h-4 text-gray-500" />
                <span className="text-green-700 font-medium">FREE Delivery</span>
              </div>

              <p className={`text-sm font-semibold ${product.in_stock ? 'text-green-600' : 'text-red-600'}`}>
                {product.in_stock ? 'In Stock' : 'Currently Unavailable'}
              </p>

              {product.in_stock && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Qty:</span>
                  <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                    <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="px-2 py-1 hover:bg-gray-100 transition-colors">
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-3 py-1 text-sm font-semibold border-x border-gray-300">{quantity}</span>
                    <button onClick={() => setQuantity(q => q + 1)} className="px-2 py-1 hover:bg-gray-100 transition-colors">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={handleAddToCart}
                disabled={!product.in_stock}
                className={`w-full py-2.5 rounded-full text-sm font-semibold transition-all shadow-sm ${
                  addedToCart
                    ? 'bg-green-500 text-white'
                    : 'bg-amber-400 hover:bg-amber-500 text-gray-900 disabled:bg-gray-200 disabled:text-gray-400'
                }`}
              >
                {addedToCart ? 'Added to Cart!' : (
                  <span className="flex items-center justify-center gap-1.5">
                    <ShoppingCart className="w-4 h-4" /> Add to Cart
                  </span>
                )}
              </button>

              <button
                onClick={handleAddToCart}
                disabled={!product.in_stock}
                className="w-full py-2.5 rounded-full text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white transition-colors shadow-sm disabled:bg-gray-200 disabled:text-gray-400"
              >
                <span className="flex items-center justify-center gap-1.5">
                  <Zap className="w-4 h-4" /> Buy Now
                </span>
              </button>

              {user && (
                <button
                  onClick={toggleWishlist}
                  className={`w-full py-2 rounded-full text-sm font-medium border transition-all ${
                    inWishlist
                      ? 'border-red-300 text-red-600 bg-red-50 hover:bg-red-100'
                      : 'border-gray-300 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  <span className="flex items-center justify-center gap-1.5">
                    <Heart className={`w-4 h-4 ${inWishlist ? 'fill-red-500' : ''}`} />
                    {inWishlist ? 'Saved to Wishlist' : 'Add to Wishlist'}
                  </span>
                </button>
              )}

              <button className="w-full flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
                <Share2 className="w-4 h-4" /> Share
              </button>

              <div className="border-t pt-3 space-y-1.5 text-xs text-gray-500">
                <div className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> Secure transaction</div>
                <div className="flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" /> Easy returns</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Reviews Section ──────────────────────────────────────────── */}
        <div className="mt-10 bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Customer Reviews</h2>

          {reviews.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              {/* Rating summary */}
              <div className="lg:col-span-1">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-5xl font-bold">{product.rating.toFixed(1)}</span>
                  <div>
                    <StarRating value={product.rating} size="md" />
                    <p className="text-sm text-gray-500 mt-1">{reviews.length} reviews</p>
                  </div>
                </div>
                {dist.map(d => (
                  <div key={d.star} className="flex items-center gap-2 mb-1">
                    <div className="flex items-center gap-0.5 w-16 flex-shrink-0">
                      {Array.from({ length: d.star }).map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-orange-400 text-orange-400" />
                      ))}
                    </div>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div className="bg-orange-400 h-2 rounded-full transition-all" style={{ width: `${d.pct}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 w-8 text-right">{d.pct}%</span>
                  </div>
                ))}
              </div>

              {/* Individual reviews */}
              <div className="lg:col-span-2 space-y-5">
                {reviews.map(r => (
                  <div key={r.id} className="border-b pb-5 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-xs">
                        {(r.profiles?.display_name ?? 'A')[0].toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold text-gray-800">
                        {r.profiles?.display_name ?? 'Anonymous'}
                      </span>
                      {r.verified_purchase && (
                        <span className="text-xs text-green-700 bg-green-50 px-1.5 py-0.5 rounded font-medium">
                          Verified Purchase
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <StarRating value={r.rating} size="sm" />
                      {r.title && <span className="text-sm font-semibold text-gray-800">{r.title}</span>}
                    </div>
                    {r.body && <p className="text-sm text-gray-600 leading-relaxed">{r.body}</p>}
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(r.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 mb-6">
              <Star className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-500">No reviews yet. Be the first to review!</p>
            </div>
          )}

          {/* Write a review */}
          {user && (
            <div className="border-t pt-6">
              {!showReviewForm ? (
                <button
                  onClick={() => setShowReviewForm(true)}
                  className="bg-amber-400 hover:bg-amber-500 text-gray-900 font-semibold px-6 py-2.5 rounded-full text-sm transition-colors shadow-sm"
                >
                  {userReview ? 'Edit Your Review' : 'Write a Review'}
                </button>
              ) : (
                <div className="max-w-lg space-y-4">
                  <h3 className="font-bold text-gray-900">
                    {userReview ? 'Edit Your Review' : 'Write a Review'}
                  </h3>
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Overall rating</p>
                    <StarRating value={reviewDraft.rating} size="lg" interactive onChange={v => setReviewDraft(d => ({ ...d, rating: v }))} />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">Title (optional)</label>
                    <input
                      type="text"
                      value={reviewDraft.title}
                      onChange={e => setReviewDraft(d => ({ ...d, title: e.target.value }))}
                      placeholder="What's most important to know?"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">Review (optional)</label>
                    <textarea
                      value={reviewDraft.body}
                      onChange={e => setReviewDraft(d => ({ ...d, body: e.target.value }))}
                      rows={4}
                      placeholder="Share your experience with this product..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={submitReview}
                      disabled={reviewDraft.rating === 0 || reviewLoading}
                      className="bg-amber-400 hover:bg-amber-500 disabled:bg-gray-200 disabled:text-gray-400 text-gray-900 font-semibold px-6 py-2.5 rounded-full text-sm transition-colors"
                    >
                      {reviewLoading ? 'Saving…' : 'Submit Review'}
                    </button>
                    <button
                      onClick={() => setShowReviewForm(false)}
                      className="border border-gray-300 text-gray-700 px-5 py-2.5 rounded-full text-sm hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
