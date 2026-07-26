import { useState, useEffect } from 'react';
import { ArrowLeft, ShoppingBag, ChevronDown, ChevronUp, Package } from 'lucide-react';
import { supabase, type Order, type OrderItem, type Product } from '../lib/supabase';

interface OrderWithItems extends Order {
  order_items: (OrderItem & { product: Product | null })[];
}

interface MyOrdersProps {
  onBack: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  pending:   { label: 'En attente MonCash',   classes: 'bg-amber-100 text-amber-700' },
  completed: { label: 'Payé (séquestre)', classes: 'bg-green-100 text-green-700' },
  failed:    { label: 'Échoué',    classes: 'bg-red-100 text-red-600' },
  cancelled: { label: 'Annulé', classes: 'bg-gray-100 text-gray-500' },
};

export const MyOrders = ({ onBack }: MyOrdersProps) => {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            product:products (*)
          )
        `)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setOrders(data as OrderWithItems[]);
      }
      setLoading(false);
    })();
  }, []);

  const toggle = (id: string) => setExpandedId(prev => (prev === id ? null : id));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-slate-900 text-white sticky top-0 z-30 shadow-lg">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={onBack} className="hover:text-orange-400 transition-colors p-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <ShoppingBag className="w-6 h-6 text-orange-400" />
          <h1 className="text-xl font-bold">Mes commandes</h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-orange-500" />
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 py-20 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-orange-400" />
            </div>
            <h2 className="text-lg font-bold text-slate-800 mb-1">Aucune commande</h2>
            <p className="text-gray-500 text-sm">
              Votre historique apparaîtra ici après un achat MonCash.
            </p>
            <button
              onClick={onBack}
              className="mt-5 bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors"
            >
              Commencer à acheter
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 mb-2">
              {orders.length} commande{orders.length === 1 ? '' : 's'}
            </p>
            {orders.map(order => {
              const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.cancelled;
              const isExpanded = expandedId === order.id;
              const itemCount = order.order_items.reduce((s, i) => s + i.quantity, 0);

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
                >
                  <button
                    onClick={() => toggle(order.id)}
                    className="w-full text-left px-5 py-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
                        <ShoppingBag className="w-5 h-5 text-orange-500" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">
                          Commande #{order.id.slice(0, 8).toUpperCase()}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(order.created_at).toLocaleDateString('fr-HT', {
                            year: 'numeric', month: 'short', day: 'numeric',
                          })}
                          {' · '}
                          {itemCount} article{itemCount === 1 ? '' : 's'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right mr-1">
                        <p className="font-bold text-slate-900 text-sm">
                          HTG {order.total.toLocaleString('fr-HT', { maximumFractionDigits: 0 })}
                        </p>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.classes}`}>
                          {cfg.label}
                        </span>
                      </div>
                      {isExpanded
                        ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-gray-100 px-5 py-4 space-y-3">
                      {order.order_items.map(item => (
                        <div key={item.id} className="flex items-center gap-3">
                          {item.product?.image_url ? (
                            <img
                              src={item.product.image_url}
                              alt={item.product.name}
                              className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                              <Package className="w-5 h-5 text-gray-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">
                              {item.product?.name ?? 'Produit indisponible'}
                            </p>
                            <p className="text-xs text-gray-400">
                              {item.quantity} × HTG {item.price.toLocaleString('fr-HT', { maximumFractionDigits: 0 })}
                            </p>
                          </div>
                          <p className="text-sm font-semibold text-slate-800 flex-shrink-0">
                            HTG {(item.price * item.quantity).toLocaleString('fr-HT', { maximumFractionDigits: 0 })}
                          </p>
                        </div>
                      ))}

                      {(order.shipping_full_name || order.shipping_city) && (
                        <div className="bg-brand-50 border border-brand/10 rounded-lg px-3 py-2 text-xs text-brand-mid">
                          <p className="font-semibold mb-0.5">Livraison</p>
                          <p>
                            {order.shipping_full_name}
                            {order.shipping_phone ? ` · ${order.shipping_phone}` : ''}
                          </p>
                          <p>
                            {order.shipping_street}
                            {order.shipping_city ? `, ${order.shipping_city}` : ''}
                            {order.shipping_department ? ` · ${order.shipping_department}` : ''}
                          </p>
                        </div>
                      )}

                      <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
                        <span className="text-sm text-gray-500">Total</span>
                        <span className="font-bold text-slate-900">
                          HTG {order.total.toLocaleString('fr-HT', { maximumFractionDigits: 0 })}
                        </span>
                      </div>

                      <p className="text-[11px] text-gray-500">
                        L’argent reste en séquestre Klirline jusqu’à ce que le vendeur confirme la livraison avec photo
                        (ou J+7 après expédition).
                      </p>

                      {order.moncash_transaction_id && (
                        <div className="bg-gray-50 rounded-lg px-3 py-2">
                          <p className="text-xs text-gray-400">Transaction MonCash</p>
                          <p className="text-xs font-mono text-gray-600 mt-0.5 break-all">
                            {order.moncash_transaction_id}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
