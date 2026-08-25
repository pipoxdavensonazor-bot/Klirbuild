import { X, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';
import type { CartItem, Product } from '../lib/supabase';
import { getDisplayPrice } from '../lib/supabase';
import { formatHtg } from '../lib/commerce';
import { useI18n } from '../i18n';
import { catalogImageSrc, handleBrokenImage } from '../lib/product-image';

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: (CartItem & { product: Product })[];
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  cartTotal: number;
  onCheckout: () => void;
  onContinueShopping?: () => void;
}

export const CartSidebar = ({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  cartTotal,
  onCheckout,
  onContinueShopping,
}: CartSidebarProps) => {
  const { t } = useI18n();
  if (!isOpen) return null;

  const continueShop = () => {
    onClose();
    onContinueShopping?.();
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
      />

      <div className="fixed right-0 top-0 h-full w-full md:w-96 bg-white shadow-2xl z-50 flex flex-col animate-slide-in">
        <div className="bg-brand-dark text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-6 h-6" />
            <h2 className="text-xl font-bold">{t('shoppingCart')}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="hover:text-accent transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {cartItems.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 px-6 text-center">
            <ShoppingBag className="w-24 h-24 mb-4 text-gray-300" />
            <p className="text-lg font-semibold mb-2">{t('cartEmpty')}</p>
            <p className="text-sm mb-6">{t('cartEmptyHint')}</p>
            <button
              type="button"
              onClick={continueShop}
              className="bg-brand hover:bg-brand-mid text-white px-6 py-2.5 rounded-lg font-semibold transition-colors"
            >
              {t('continueShopping')}
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4">
              {cartItems.map((item) => {
                const unit = getDisplayPrice(item.product);
                return (
                  <div
                    key={item.id}
                    className="bg-white border border-gray-200 rounded-lg p-4 mb-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex gap-4">
                      <img
                        src={catalogImageSrc(item.product.image_url, item.product.id)}
                        alt={item.product.name}
                        className="w-20 h-20 object-cover rounded"
                        onError={e => handleBrokenImage(e.currentTarget, item.product.id)}
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900 mb-1 line-clamp-2">
                          {item.product.name}
                        </h3>
                        <p className="text-lg font-bold text-brand mb-2">
                          {formatHtg(unit)}
                        </p>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center border border-gray-300 rounded">
                            <button
                              type="button"
                              onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                              className="p-1 hover:bg-gray-100 transition-colors"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="px-3 py-1 font-semibold">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                              className="p-1 hover:bg-gray-100 transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => onRemoveItem(item.id)}
                            className="text-red-500 hover:text-red-700 transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-gray-200 p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-4">
                <span className="text-lg font-semibold text-slate-900">{t('subtotal')}:</span>
                <span className="text-2xl font-bold text-brand">
                  {formatHtg(cartTotal)}
                </span>
              </div>
              <button
                type="button"
                className="w-full bg-brand hover:bg-brand-mid text-white py-3 rounded-lg font-semibold transition-colors shadow-md hover:shadow-lg"
                onClick={() => { onClose(); onCheckout(); }}
              >
                {t('proceedCheckout')}
              </button>
              <p className="text-xs text-center text-gray-500 mt-2">
                MonCash · NatCash · Carte
              </p>
              <button
                type="button"
                onClick={continueShop}
                className="w-full mt-2 bg-slate-200 hover:bg-slate-300 text-slate-900 py-3 rounded-lg font-semibold transition-colors"
              >
                {t('continueShopping')}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
};
