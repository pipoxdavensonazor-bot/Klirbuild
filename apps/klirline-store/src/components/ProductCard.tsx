import { Heart, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Product } from '../lib/supabase';
import { BADGE_CONFIG, getDisplayPrice, getOriginalPrice, discountPct } from '../lib/supabase';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { StarRating } from './StarRating';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  onClick: (product: Product) => void;
  wishlisted?: boolean;
  onWishlistToggle?: (product: Product) => void;
}

export const ProductCard = ({
  product, onAddToCart, onClick, wishlisted = false, onWishlistToggle,
}: ProductCardProps) => {
  const { user } = useAuth();
  const [inWishlist, setInWishlist] = useState(wishlisted);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  useEffect(() => { setInWishlist(wishlisted); }, [wishlisted]);

  const displayPrice = getDisplayPrice(product);
  const originalPrice = getOriginalPrice(product);
  const pct = discountPct(product);
  const badge = product.badge ? BADGE_CONFIG[product.badge] : null;

  const isDealActive =
    product.deal_price != null &&
    (product.deal_ends_at == null || new Date(product.deal_ends_at) > new Date());

  const handleWishlist = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || wishlistLoading) return;
    setWishlistLoading(true);
    if (inWishlist) {
      await supabase.from('wishlists').delete().eq('product_id', product.id);
      setInWishlist(false);
    } else {
      await supabase.from('wishlists').insert({ product_id: product.id });
      setInWishlist(true);
    }
    setWishlistLoading(false);
    onWishlistToggle?.(product);
  };

  return (
    <div
      onClick={() => onClick(product)}
      className="bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-all duration-200 overflow-hidden group cursor-pointer flex flex-col"
    >
      {/* Image */}
      <div className="relative overflow-hidden bg-gray-50 aspect-square">
        <img
          src={product.image_url}
          alt={product.name}
          className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />

        {/* Badge ribbon */}
        {badge && (
          <span className={`absolute top-2 left-0 text-[11px] font-bold px-2 py-0.5 rounded-r-full shadow ${badge.classes}`}>
            {badge.label}
          </span>
        )}

        {/* Deal % */}
        {pct && pct > 0 && (
          <span className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-1.5 py-0.5 rounded">
            -{pct}%
          </span>
        )}

        {/* Out of stock overlay */}
        {!product.in_stock && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <span className="bg-gray-800 text-white text-xs font-semibold px-3 py-1 rounded-full">
              Out of Stock
            </span>
          </div>
        )}

        {/* Wishlist heart */}
        {user && (
          <button
            onClick={handleWishlist}
            className={`absolute bottom-2 right-2 w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-all ${
              inWishlist
                ? 'bg-red-500 text-white'
                : 'bg-white text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100'
            }`}
          >
            <Heart className={`w-4 h-4 ${inWishlist ? 'fill-white' : ''}`} />
          </button>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col flex-1">
        {product.seller_department && (
          <p className="text-[11px] text-brand font-semibold mb-0.5 flex items-center gap-0.5">
            <MapPin className="w-3 h-3" />
            Vendeur · {product.seller_department}
          </p>
        )}
        {product.brand && (
          <p className="text-xs text-gray-500 mb-0.5 truncate">{product.brand}</p>
        )}

        <h3 className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug mb-1.5 group-hover:text-orange-600 transition-colors flex-1">
          {product.name}
        </h3>

        {/* Stars */}
        {product.rating > 0 && (
          <div className="flex items-center gap-1 mb-1.5">
            <StarRating value={product.rating} size="sm" />
            <span className="text-xs text-blue-600 hover:text-orange-500 cursor-pointer">
              {product.review_count.toLocaleString()}
            </span>
          </div>
        )}

        {/* Deal label */}
        {isDealActive && (
          <p className="text-xs text-red-600 font-semibold mb-1">Limited time deal</p>
        )}

        {/* Price */}
        <div className="flex items-baseline gap-1.5 flex-wrap mb-2">
          <span className="text-lg font-bold text-gray-900">
            HTG <span className="text-2xl">{displayPrice.toLocaleString('fr-HT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </span>
          {originalPrice && originalPrice > displayPrice && (
            <span className="text-xs text-gray-400 line-through">
              HTG {originalPrice.toLocaleString('fr-HT', { minimumFractionDigits: 2 })}
            </span>
          )}
        </div>

        <p className="text-xs text-gray-500 mb-2">
          {product.in_stock ? (
            <span className="text-green-600 font-medium">In Stock</span>
          ) : (
            <span className="text-red-500">Out of Stock</span>
          )}
          {' · '}Free delivery
        </p>

        {/* Add to cart */}
        <button
          onClick={e => { e.stopPropagation(); onAddToCart(product); }}
          disabled={!product.in_stock}
          className="w-full bg-amber-400 hover:bg-amber-500 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-gray-900 py-1.5 rounded-full text-sm font-semibold transition-colors shadow-sm"
        >
          {product.in_stock ? 'Add to Cart' : 'Unavailable'}
        </button>
      </div>
    </div>
  );
};
