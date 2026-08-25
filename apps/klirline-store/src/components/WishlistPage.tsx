import { useState, useEffect } from 'react';
import { Heart, ShoppingCart, ArrowLeft, Trash2, Package } from 'lucide-react';
import { type Product, getDisplayPrice, getOriginalPrice, BADGE_CONFIG } from '../lib/supabase';
import { StarRating } from './StarRating';
import { catalogImageSrc, handleBrokenImage } from '../lib/product-image';

interface WishlistPageProps {
  onBack: () => void;
  onAddToCart: (product: Product) => void;
  onProductClick: (product: Product) => void;
  items: Product[];
  onRemove: (productId: string) => void;
  onClear: () => void;
}

export const WishlistPage = ({
  onBack,
  onAddToCart,
  onProductClick,
  items,
  onRemove,
  onClear,
}: WishlistPageProps) => {
  const [removing, setRemoving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, [items]);

  const handleRemove = async (productId: string) => {
    setRemoving(productId);
    await onRemove(productId);
    setRemoving(null);
  };

  return (
    <div className="min-h-screen bg-haiti-sand">
      <div className="bg-brand-dark text-white px-4 py-4 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 text-sm hover:text-accent transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-400 fill-red-400" />
            <h1 className="text-lg font-bold">Ma liste</h1>
            {!loading && (
              <span className="bg-gray-700 text-gray-300 text-xs px-2 py-0.5 rounded-full">
                {items.length} {items.length === 1 ? 'article' : 'articles'}
              </span>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="w-10 h-10 text-gray-300" />
            </div>
            <h2 className="text-xl font-bold text-gray-700 mb-2">Votre liste est vide</h2>
            <p className="text-gray-500 text-sm mb-6">
              Enregistrez des articles avec le cœur — même sans compte.
            </p>
            <button
              type="button"
              onClick={onBack}
              className="bg-amber-400 hover:bg-amber-500 text-gray-900 font-semibold px-6 py-2.5 rounded-full text-sm transition-colors"
            >
              Continuer vos achats
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800">
                Articles enregistrés <span className="text-gray-400 font-normal">({items.length})</span>
              </h2>
              <button
                type="button"
                onClick={() => void onClear()}
                className="text-xs text-red-500 hover:text-red-700 underline"
              >
                Tout effacer
              </button>
            </div>

            {items.map(product => {
              const displayPrice = getDisplayPrice(product);
              const originalPrice = getOriginalPrice(product);
              const badge = product.badge ? BADGE_CONFIG[product.badge] : null;

              return (
                <div
                  key={product.id}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-4 flex gap-4"
                >
                  <button
                    type="button"
                    onClick={() => onProductClick(product)}
                    className="flex-shrink-0 w-24 h-24 sm:w-32 sm:h-32 bg-gray-50 rounded-lg overflow-hidden"
                  >
                    <img
                      src={catalogImageSrc(product.image_url, product.id)}
                      alt={product.name}
                      className="w-full h-full object-contain p-2 hover:scale-105 transition-transform duration-200"
                      onError={e => handleBrokenImage(e.currentTarget, product.id)}
                    />
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        {product.brand && (
                          <p className="text-xs text-gray-500 mb-0.5">{product.brand}</p>
                        )}
                        <button
                          type="button"
                          onClick={() => onProductClick(product)}
                          className="text-sm font-medium text-gray-900 hover:text-brand transition-colors line-clamp-2 text-left leading-snug"
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
                        type="button"
                        onClick={() => handleRemove(product.id)}
                        disabled={removing === product.id}
                        className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {product.rating > 0 && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <StarRating value={product.rating} size="sm" />
                        <span className="text-xs text-brand">{product.review_count.toLocaleString()}</span>
                      </div>
                    )}

                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-lg font-bold text-gray-900">
                        HTG {displayPrice.toLocaleString('fr-HT', { maximumFractionDigits: 0 })}
                      </span>
                      {originalPrice && originalPrice > displayPrice && (
                        <span className="text-xs text-gray-400 line-through">
                          HTG {originalPrice.toLocaleString('fr-HT', { maximumFractionDigits: 0 })}
                        </span>
                      )}
                    </div>

                    <p className={`text-xs font-medium mt-0.5 ${product.in_stock ? 'text-green-600' : 'text-red-500'}`}>
                      {product.in_stock ? 'En stock' : 'Rupture'}
                    </p>

                    <div className="flex flex-wrap gap-2 mt-3">
                      <button
                        type="button"
                        onClick={() => onAddToCart(product)}
                        disabled={!product.in_stock}
                        className="inline-flex items-center gap-1.5 bg-amber-400 hover:bg-amber-500 disabled:bg-gray-200 disabled:text-gray-400 text-gray-900 text-sm font-semibold px-4 py-2 rounded-full transition-colors"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        Ajouter au panier
                      </button>
                      {!product.in_stock && (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                          <Package className="w-3.5 h-3.5" /> Indisponible
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};
