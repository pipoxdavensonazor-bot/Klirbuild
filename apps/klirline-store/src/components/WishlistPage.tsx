import { useState, useEffect } from 'react';
import { Heart, ShoppingCart, ArrowLeft, Trash2, Package } from 'lucide-react';
import { supabase, type Product, getDisplayPrice, getOriginalPrice, BADGE_CONFIG } from '../lib/supabase';
import { StarRating } from './StarRating';

interface WishlistPageProps {
  onBack: () => void;
  onAddToCart: (product: Product) => void;
  onProductClick: (product: Product) => void;
}

interface WishlistRow {
  id: string;
  product_id: string;
  products: Product;
}

export const WishlistPage = ({ onBack, onAddToCart, onProductClick }: WishlistPageProps) => {
  const [items, setItems] = useState<WishlistRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    fetchWishlist();
  }, []);

  const fetchWishlist = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('wishlists')
      .select('id, product_id, products(*)')
      .order('created_at', { ascending: false });
    if (data) setItems(data as unknown as WishlistRow[]);
    setLoading(false);
  };

  const handleRemove = async (wishlistId: string) => {
    setRemoving(wishlistId);
    await supabase.from('wishlists').delete().eq('id', wishlistId);
    setItems(prev => prev.filter(i => i.id !== wishlistId));
    setRemoving(null);
  };

  const handleAddToCart = (product: Product) => {
    onAddToCart(product);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#131921] text-white px-4 py-4 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm hover:text-orange-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-400 fill-red-400" />
            <h1 className="text-lg font-bold">My Wishlist</h1>
            {!loading && (
              <span className="bg-gray-700 text-gray-300 text-xs px-2 py-0.5 rounded-full">
                {items.length} {items.length === 1 ? 'item' : 'items'}
              </span>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="w-10 h-10 text-gray-300" />
            </div>
            <h2 className="text-xl font-bold text-gray-700 mb-2">Your wishlist is empty</h2>
            <p className="text-gray-500 text-sm mb-6">Save items you like by clicking the heart icon on any product.</p>
            <button
              onClick={onBack}
              className="bg-amber-400 hover:bg-amber-500 text-gray-900 font-semibold px-6 py-2.5 rounded-full text-sm transition-colors"
            >
              Continue Shopping
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800">
                Saved Items <span className="text-gray-400 font-normal">({items.length})</span>
              </h2>
              <button
                onClick={async () => {
                  await supabase.from('wishlists').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                  setItems([]);
                }}
                className="text-xs text-red-500 hover:text-red-700 underline"
              >
                Clear all
              </button>
            </div>

            {items.map(item => {
              const product = item.products;
              const displayPrice = getDisplayPrice(product);
              const originalPrice = getOriginalPrice(product);
              const badge = product.badge ? BADGE_CONFIG[product.badge] : null;

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-4 flex gap-4"
                >
                  {/* Image */}
                  <button
                    onClick={() => onProductClick(product)}
                    className="flex-shrink-0 w-24 h-24 sm:w-32 sm:h-32 bg-gray-50 rounded-lg overflow-hidden"
                  >
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-contain p-2 hover:scale-105 transition-transform duration-200"
                    />
                  </button>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        {product.brand && (
                          <p className="text-xs text-gray-500 mb-0.5">{product.brand}</p>
                        )}
                        <button
                          onClick={() => onProductClick(product)}
                          className="text-sm font-medium text-gray-900 hover:text-orange-600 transition-colors line-clamp-2 text-left leading-snug"
                        >
                          {product.name}
                        </button>
                        {badge && (
                          <span className={`inline-block mt-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${badge.classes}`}>
                            {badge.label}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemove(item.id)}
                        disabled={removing === item.id}
                        className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {product.rating > 0 && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <StarRating value={product.rating} size="sm" />
                        <span className="text-xs text-blue-600">{product.review_count.toLocaleString()}</span>
                      </div>
                    )}

                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-lg font-bold text-gray-900">
                        HTG {displayPrice.toLocaleString('fr-HT', { minimumFractionDigits: 2 })}
                      </span>
                      {originalPrice && originalPrice > displayPrice && (
                        <span className="text-xs text-gray-400 line-through">
                          HTG {originalPrice.toLocaleString('fr-HT', { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </div>

                    <p className={`text-xs font-medium mt-0.5 ${product.in_stock ? 'text-green-600' : 'text-red-500'}`}>
                      {product.in_stock ? 'In Stock' : 'Out of Stock'}
                    </p>

                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <button
                        onClick={() => handleAddToCart(product)}
                        disabled={!product.in_stock}
                        className="flex items-center gap-1.5 bg-amber-400 hover:bg-amber-500 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-gray-900 font-semibold px-4 py-1.5 rounded-full text-sm transition-colors"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        Add to Cart
                      </button>
                      <button
                        onClick={() => onProductClick(product)}
                        className="text-xs text-blue-600 hover:text-orange-500 underline transition-colors"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer padding */}
      <div className="h-16" />
    </div>
  );
};

// Small empty state icon component for reuse
export const WishlistEmptyIcon = () => (
  <div className="flex items-center gap-1.5 text-gray-400">
    <Package className="w-4 h-4" />
    <span className="text-sm">No saved items</span>
  </div>
);
