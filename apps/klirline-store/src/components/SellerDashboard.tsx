import { useState, useEffect, useCallback } from 'react';
import { Package, TrendingUp, ShoppingBag, Clock, CreditCard as Edit2, Trash2, ToggleLeft, ToggleRight, Plus, AlertCircle, BarChart2, ArrowLeft, RefreshCw, Truck, Sparkles } from 'lucide-react';
import { supabase, type Product } from '../lib/supabase';
import { SellerFulfillmentsPanel } from './SellerFulfillmentsPanel';
import { SellerPayoutSettings } from './SellerPayoutSettings';
import { SellerSponsoredPanel } from './SellerSponsoredPanel';

interface SellerStats {
  total_products: number;
  total_orders: number;
  total_revenue: number;
  pending_orders: number;
}

interface RecentSale {
  order_item_id: string;
  order_id: string;
  order_status: string;
  order_date: string;
  product_id: string;
  product_name: string;
  product_image: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

interface SellerDashboardProps {
  onBack: () => void;
  onAddProduct: () => void;
  onEditProduct: (product: Product) => void;
  /** Open Sponsored tab (e.g. after Stripe return) */
  initialTab?: 'overview' | 'products' | 'sales' | 'fulfillments' | 'sponsored';
}

const STATUS_STYLES: Record<string, string> = {
  completed: 'bg-green-100 text-green-700',
  pending:   'bg-amber-100 text-amber-700',
  failed:    'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

export const SellerDashboard = ({
  onBack, onAddProduct, onEditProduct, initialTab = 'fulfillments',
}: SellerDashboardProps) => {
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<RecentSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [tab, setTab] = useState<'overview' | 'products' | 'sales' | 'fulfillments' | 'sponsored'>(initialTab);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setProducts([]);
      setStats(null);
      setSales([]);
      setLoading(false);
      return;
    }

    const [statsRes, productsRes, salesRes] = await Promise.all([
      supabase.rpc('get_seller_stats'),
      supabase
        .from('products')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false }),
      supabase.rpc('get_seller_recent_sales', { limit_count: 30 }),
    ]);

    if (statsRes.data) setStats(statsRes.data as SellerStats);
    if (productsRes.data) setProducts(productsRes.data);
    if (salesRes.data) setSales(salesRes.data as RecentSale[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleStock = async (product: Product) => {
    const next = !product.in_stock;
    await supabase
      .from('products')
      .update({ in_stock: next })
      .eq('id', product.id);
    setProducts(prev =>
      prev.map(p => p.id === product.id ? { ...p, in_stock: next } : p)
    );
    if (next) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stock-notify`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${session.access_token}`,
                apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ productId: product.id }),
            },
          );
        }
      } catch { /* ignore notify failures */ }
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      alert(error.message || 'Could not delete product (it may be linked to past orders).');
      setDeleteId(null);
      return;
    }
    setProducts(prev => prev.filter(p => p.id !== id));
    if (stats) setStats({ ...stats, total_products: stats.total_products - 1 });
    setDeleteId(null);
  };

  return (
    <div className="min-h-screen bg-haiti-sand">
      {/* Header */}
      <div className="bg-brand-dark text-white sticky top-0 z-30 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="hover:text-accent transition-colors p-1">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <BarChart2 className="w-6 h-6 text-accent" />
            <h1 className="text-xl font-bold">Espace vendeur</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={load}
              className="text-slate-400 hover:text-accent transition-colors p-1"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onAddProduct}
              className="flex items-center gap-2 bg-brand hover:bg-brand-mid text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Product
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4 flex gap-1 pb-0 overflow-x-auto">
          {([
            ['fulfillments', 'Livraisons'],
            ['sponsored', 'Sponsored'],
            ['overview', 'Aperçu'],
            ['products', 'Produits'],
            ['sales', 'Ventes'],
          ] as const).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${
                tab === t
                  ? 'bg-white text-slate-900'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t === 'fulfillments' && <Truck className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />}
              {t === 'sponsored' && <Sparkles className="w-3.5 h-3.5 inline mr-1 -mt-0.5 text-amber-400" />}
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {tab === 'fulfillments' ? (
          <div>
            <SellerPayoutSettings />
            <SellerFulfillmentsPanel />
          </div>
        ) : tab === 'sponsored' ? (
          <SellerSponsoredPanel onActivated={load} />
        ) : loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-brand" />
          </div>
        ) : (
          <>
            {/* Overview */}
            {tab === 'overview' && (
              <div className="space-y-8">
                {/* Stats grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard
                    icon={<Package className="w-6 h-6" />}
                    label="Products Listed"
                    value={stats?.total_products ?? 0}
                    color="blue"
                  />
                  <StatCard
                    icon={<ShoppingBag className="w-6 h-6" />}
                    label="Total Orders"
                    value={stats?.total_orders ?? 0}
                    color="brand"
                  />
                  <StatCard
                    icon={<TrendingUp className="w-6 h-6" />}
                    label="Revenue (HTG)"
                    value={`${(stats?.total_revenue ?? 0).toLocaleString('fr-HT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    color="green"
                  />
                  <StatCard
                    icon={<Clock className="w-6 h-6" />}
                    label="Pending Orders"
                    value={stats?.pending_orders ?? 0}
                    color="amber"
                  />
                </div>

                {/* Recent sales preview */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-slate-900">Recent Sales</h2>
                    <button
                      onClick={() => setTab('sales')}
                      className="text-sm text-brand hover:text-brand font-medium transition-colors"
                    >
                      View all
                    </button>
                  </div>
                  {sales.length === 0 ? (
                    <EmptyState icon={<ShoppingBag />} message="No sales yet. Share your products to get started!" />
                  ) : (
                    <SalesTable rows={sales.slice(0, 5)} />
                  )}
                </div>
              </div>
            )}

            {/* Products */}
            {tab === 'products' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-slate-900">
                    Your Products
                    <span className="ml-2 text-base font-normal text-gray-500">({products.length})</span>
                  </h2>
                  <button
                    onClick={onAddProduct}
                    className="flex items-center gap-2 bg-brand hover:bg-brand-mid text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    New Product
                  </button>
                </div>

                {products.length === 0 ? (
                  <EmptyState icon={<Package />} message="You haven't listed any products yet." action={{ label: 'Add First Product', onClick: onAddProduct }} />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {products.map(p => (
                      <ProductCard
                        key={p.id}
                        product={p}
                        onEdit={() => onEditProduct(p)}
                        onToggleStock={() => toggleStock(p)}
                        onDeleteRequest={() => setDeleteId(p.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Sales */}
            {tab === 'sales' && (
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-6">Recent Sales</h2>
                {sales.length === 0 ? (
                  <EmptyState icon={<ShoppingBag />} message="No sales yet. Your orders will appear here." />
                ) : (
                  <SalesTable rows={sales} />
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete confirmation */}
      {deleteId && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 pointer-events-auto animate-fade-in">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-center text-slate-800 mb-2">Delete Product?</h3>
              <p className="text-sm text-gray-500 text-center mb-6">
                This action cannot be undone. The product will be permanently removed.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteId(null)}
                  className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteId)}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ── Sub-components ────────────────────────────────────────────────────────────

const COLOR_MAP: Record<string, string> = {
  blue:   'bg-brand-50 text-brand',
  brand:  'bg-brand-50 text-brand',
  green:  'bg-green-100 text-green-600',
  amber:  'bg-amber-100 text-amber-600',
};

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${COLOR_MAP[color]}`}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-slate-900 leading-tight">{value}</div>
      <div className="text-sm text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

function ProductCard({
  product, onEdit, onToggleStock, onDeleteRequest,
}: {
  product: Product;
  onEdit: () => void;
  onToggleStock: () => void;
  onDeleteRequest: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group">
      <div className="relative">
        <img
          src={product.image_url}
          alt={product.name}
          className="w-full h-40 object-cover group-hover:scale-[1.02] transition-transform duration-300"
        />
        <div className={`absolute top-2 right-2 text-xs font-bold px-2 py-0.5 rounded-full ${product.in_stock ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
          {product.in_stock ? 'In Stock' : 'Out of Stock'}
        </div>
      </div>
      <div className="p-4">
        <p className="font-semibold text-slate-800 truncate">{product.name}</p>
        <p className="text-brand font-bold text-lg mt-0.5">HTG {product.price.toLocaleString()}</p>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="p-1.5 text-gray-500 hover:text-brand hover:bg-brand-50 rounded-lg transition-colors"
              title="Edit"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={onDeleteRequest}
              className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <button onClick={onToggleStock} className="transition-colors" title="Toggle stock">
            {product.in_stock
              ? <ToggleRight className="w-7 h-7 text-brand" />
              : <ToggleLeft className="w-7 h-7 text-gray-400" />}
          </button>
        </div>
      </div>
    </div>
  );
}

function SalesTable({ rows }: { rows: RecentSale[] }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-left">
              <th className="px-5 py-3 font-semibold text-gray-500">Product</th>
              <th className="px-5 py-3 font-semibold text-gray-500">Qty</th>
              <th className="px-5 py-3 font-semibold text-gray-500">Total</th>
              <th className="px-5 py-3 font-semibold text-gray-500">Status</th>
              <th className="px-5 py-3 font-semibold text-gray-500">Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.order_item_id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={row.product_image}
                      alt={row.product_name}
                      className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
                    />
                    <span className="font-medium text-slate-800 truncate max-w-[160px]">{row.product_name}</span>
                  </div>
                </td>
                <td className="px-5 py-3 text-gray-600">{row.quantity}</td>
                <td className="px-5 py-3 font-semibold text-slate-800">
                  HTG {row.line_total.toLocaleString('fr-HT', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-5 py-3">
                  <span className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${STATUS_STYLES[row.order_status] ?? STATUS_STYLES.cancelled}`}>
                    {row.order_status}
                  </span>
                </td>
                <td className="px-5 py-3 text-gray-400 whitespace-nowrap">
                  {new Date(row.order_date).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmptyState({
  icon, message, action,
}: {
  icon: React.ReactNode;
  message: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 py-16 flex flex-col items-center text-center">
      <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-3 text-gray-400">
        {icon}
      </div>
      <p className="text-gray-500 text-sm max-w-xs">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 bg-brand hover:bg-brand-mid text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
