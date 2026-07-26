import { useState, useEffect, useCallback } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';
import { Header } from './components/Header';
import { ProductCard } from './components/ProductCard';
import { FilterSidebar, type Filters } from './components/FilterSidebar';
import { CartSidebar } from './components/CartSidebar';
import { AuthModal } from './components/AuthModal';
import { AddProductModal } from './components/AddProductModal';
import { CheckoutModal } from './components/CheckoutModal';
import { SellerDashboard } from './components/SellerDashboard';
import { MyOrders } from './components/MyOrders';
import { ProductDetailPage } from './components/ProductDetailPage';
import { WishlistPage } from './components/WishlistPage';
import { AccountPage } from './components/AccountPage';
import { VendorApplyModal } from './components/VendorApplyModal';
import { AdminPanel } from './components/AdminPanel';
import { HomeFeed } from './components/HomeFeed';
import { WhatsAppFab } from './components/WhatsAppFab';
import { useCart } from './hooks/useCart';
import { LocaleProvider } from './i18n';
import { supabase, isDemoMode, type Product, type Category } from './lib/supabase';
import { isJunkProductName } from './lib/brand';
import { DEMO_CATEGORIES, DEMO_PRODUCTS } from './lib/demo-products';
import { trackAddToCart, trackDepartment, trackProductView } from './lib/activity';
import { SlidersHorizontal, Clock, XCircle } from 'lucide-react';

const CATALOG_CACHE_KEY = 'klirline_catalog_cache_v1';
const CATALOG_TTL_MS = 60_000;

type View = 'shop' | 'dashboard' | 'orders' | 'product' | 'wishlist' | 'account' | 'admin';

const DEFAULT_FILTERS: Filters = {
  categoryId: '', department: '', minPrice: '', maxPrice: '',
  minRating: 0, inStockOnly: false, badge: '',
};

function ShopApp() {
  const { user } = useAuth();
  const [view, setView] = useState<View>('shop');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(true);
  const [catalogNotice, setCatalogNotice] = useState<string | null>(null);
  const [filterSidebarOpen, setFilterSidebarOpen] = useState(false);
  const [browseAll, setBrowseAll] = useState(false);
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isVendorApplyOpen, setIsVendorApplyOpen] = useState(false);
  const [authTab, setAuthTab] = useState<'signin' | 'signup'>('signin');
  const [editProduct, setEditProduct] = useState<Product | null>(null);

  const [isAdmin, setIsAdmin] = useState(false);
  const [vendorStatus, setVendorStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none');
  const [vendorBanner, setVendorBanner] = useState<string | null>(null);

  const { cartItems, addToCart, updateQuantity, removeFromCart, cartTotal, cartCount, refreshCart } = useCart();

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  useEffect(() => {
    if (user) {
      fetchWishlistIds();
      fetchUserMeta();
    } else {
      setWishlistIds(new Set());
      setIsAdmin(false);
      setVendorStatus('none');
    }
  }, [user]);

  const fetchProducts = async () => {
    setCatalogNotice(null);
    let hadCache = false;

    // Instant paint from session cache
    try {
      const cached = sessionStorage.getItem(CATALOG_CACHE_KEY);
      if (cached) {
        const { at, products: cachedProducts } = JSON.parse(cached) as { at: number; products: Product[] };
        if (Date.now() - at < CATALOG_TTL_MS && cachedProducts?.length) {
          setProducts(cachedProducts);
          setLoading(false);
          hadCache = true;
        }
      }
    } catch { /* ignore */ }

    if (!hadCache) setLoading(true);

    if (isDemoMode) {
      setProducts(DEMO_PRODUCTS);
      setCatalogNotice('Demo catalog — add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to connect live data.');
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('products fetch failed', error);
      if (!hadCache) {
        setProducts(DEMO_PRODUCTS);
        setCatalogNotice('Could not load live products. Showing curated demo catalog.');
      }
      setLoading(false);
      return;
    }

    const cleaned = (data ?? []).filter(p => !isJunkProductName(p.name));
    if (cleaned.length === 0) {
      setProducts(DEMO_PRODUCTS);
      setCatalogNotice('Live catalog was empty or only contained test listings. Showing curated demo products.');
    } else {
      setProducts(cleaned);
      try {
        sessionStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify({ at: Date.now(), products: cleaned }));
      } catch { /* ignore */ }
    }
    setLoading(false);
  };

  const fetchCategories = async () => {
    if (isDemoMode) {
      setCategories(DEMO_CATEGORIES);
      return;
    }
    const { data, error } = await supabase.from('categories').select('*').order('name');
    if (error || !data?.length) {
      setCategories(DEMO_CATEGORIES);
      return;
    }
    setCategories(data);
  };

  const fetchWishlistIds = async () => {
    const { data } = await supabase.from('wishlists').select('product_id');
    if (data) setWishlistIds(new Set(data.map(w => w.product_id)));
  };

  const fetchUserMeta = async () => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', (await supabase.auth.getUser()).data.user?.id ?? '')
      .maybeSingle();
    if (profile) setIsAdmin(profile.is_admin ?? false);

    const { data: app } = await supabase
      .from('vendor_applications')
      .select('status, rejection_reason')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (app) setVendorStatus(app.status as 'pending' | 'approved' | 'rejected');
    else setVendorStatus('none');
  };

  const filteredProducts = useCallback(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter(p => {
      if (q && !p.name.toLowerCase().includes(q) && !p.description.toLowerCase().includes(q) && !(p.brand ?? '').toLowerCase().includes(q)) return false;
      if (selectedDept && p.department !== selectedDept) return false;
      if (filters.categoryId && p.category_id !== filters.categoryId) return false;
      if (filters.department && p.department !== filters.department) return false;
      if (filters.minPrice && p.price < parseFloat(filters.minPrice)) return false;
      if (filters.maxPrice && p.price > parseFloat(filters.maxPrice)) return false;
      if (filters.minRating > 0 && p.rating < filters.minRating) return false;
      if (filters.inStockOnly && !p.in_stock) return false;
      if (filters.badge && p.badge !== filters.badge) return false;
      return true;
    });
  }, [products, searchQuery, selectedDept, filters]);

  const displayProducts = filteredProducts();

  const handleAddToCart = async (product: Product) => {
    if (!user) {
      setAuthTab('signin');
      setIsAuthOpen(true);
      return;
    }
    trackAddToCart(product);
    await addToCart(product);
    setIsCartOpen(true);
  };

  const requireAuth = (action: () => void) => {
    if (!user) {
      setAuthTab('signin');
      setIsAuthOpen(true);
    } else {
      action();
    }
  };

  const handleProductClick = (product: Product) => {
    trackProductView(product);
    setSelectedProduct(product);
    setView('product');
    window.scrollTo(0, 0);
  };

  const handleAddProductClick = () => requireAuth(() => {
    if (vendorStatus === 'none') {
      setIsVendorApplyOpen(true);
      return;
    }
    if (vendorStatus === 'pending') {
      setVendorBanner('Votre demande vendeur est en cours de vérification par Klirline (ID + preuve Mairie). Vous pourrez vendre après approbation.');
      return;
    }
    if (vendorStatus === 'rejected') {
      setVendorBanner('Votre demande a été refusée. Vous pouvez soumettre une nouvelle candidature avec des documents valides.');
      setIsVendorApplyOpen(true);
      return;
    }
    setEditProduct(null);
    setIsAddProductOpen(true);
  });

  const handleEditProduct = (product: Product) => {
    setEditProduct(product);
    setIsAddProductOpen(true);
  };

  const handleDashboardClick = () => requireAuth(() => setView('dashboard'));
  const handleMyOrdersClick = () => requireAuth(() => setView('orders'));
  const handleWishlistClick = () => requireAuth(() => setView('wishlist'));
  const handleAccountClick = () => requireAuth(() => setView('account'));
  const handleAdminClick = () => requireAuth(() => setView('admin'));
  const handleCheckout = () => requireAuth(() => setIsCheckoutOpen(true));

  const handleCheckoutSuccess = async () => {
    for (const item of cartItems) await removeFromCart(item.id);
    await refreshCart();
  };

  const handleDeptChange = (d: string) => {
    if (d) trackDepartment(d);
    setSelectedDept(d);
    setBrowseAll(!!d);
    setFilters(f => ({ ...f, department: '' }));
    if (view !== 'shop') setView('shop');
  };

  const handleLogoClick = () => {
    setView('shop');
    setSearchQuery('');
    setSelectedDept('');
    setBrowseAll(false);
    setFilters(DEFAULT_FILTERS);
    window.scrollTo(0, 0);
  };

  const handleWishlistToggle = () => {
    if (user) fetchWishlistIds();
  };

  // ── Views that replace the full page ──────────────────────────────────────

  if (view === 'product' && selectedProduct) {
    return (
      <>
        <ProductDetailPage
          product={selectedProduct}
          onBack={() => setView('shop')}
          onAddToCart={handleAddToCart}
        />
        <CartSidebar
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          cartItems={cartItems}
          onUpdateQuantity={updateQuantity}
          onRemoveItem={removeFromCart}
          cartTotal={cartTotal}
          onCheckout={handleCheckout}
        />
      </>
    );
  }

  if (view === 'dashboard') {
    return (
      <>
        <SellerDashboard
          onBack={() => setView('shop')}
          onAddProduct={handleAddProductClick}
          onEditProduct={handleEditProduct}
        />
        <AddProductModal
          isOpen={isAddProductOpen}
          onClose={() => setIsAddProductOpen(false)}
          onSuccess={() => { setIsAddProductOpen(false); fetchProducts(); }}
          editProduct={editProduct}
        />
      </>
    );
  }

  if (view === 'orders') {
    return <MyOrders onBack={() => setView('shop')} />;
  }

  if (view === 'wishlist') {
    return (
      <WishlistPage
        onBack={() => setView('shop')}
        onAddToCart={handleAddToCart}
        onProductClick={handleProductClick}
      />
    );
  }

  if (view === 'account') {
    return (
      <AccountPage
        onBack={() => setView('shop')}
        onMyOrdersClick={() => setView('orders')}
        onWishlistClick={() => setView('wishlist')}
      />
    );
  }

  if (view === 'admin') {
    return <AdminPanel onBack={() => setView('shop')} />;
  }

  // ── Shop view ──────────────────────────────────────────────────────────────

  const hasActiveFilters =
    filters.categoryId || filters.department || filters.minPrice ||
    filters.maxPrice || filters.badge || filters.minRating > 0 || filters.inStockOnly;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        cartCount={cartCount}
        onCartClick={() => setIsCartOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSignInClick={() => { setAuthTab('signin'); setIsAuthOpen(true); }}
        onAddProductClick={handleAddProductClick}
        onDashboardClick={handleDashboardClick}
        onMyOrdersClick={handleMyOrdersClick}
        onWishlistClick={handleWishlistClick}
        onAccountClick={handleAccountClick}
        onLogoClick={handleLogoClick}
        selectedDept={selectedDept}
        onDeptChange={handleDeptChange}
        onAdminClick={handleAdminClick}
        isAdmin={isAdmin}
      />

      <main className="max-w-[1500px] mx-auto px-4 py-6">
        {catalogNotice && (
          <div className="flex items-start gap-3 bg-brand-50 border border-brand/20 rounded-xl px-4 py-3 mb-4 text-sm text-brand-mid">
            <span className="flex-1">{catalogNotice}</span>
            <button onClick={() => setCatalogNotice(null)} className="text-brand hover:text-brand-dark font-bold text-xs ml-2">Dismiss</button>
          </div>
        )}
        {/* Vendor status banner */}
        {vendorBanner && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 text-sm text-amber-800">
            {vendorStatus === 'pending'
              ? <Clock className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-500" />
              : <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500" />}
            <span className="flex-1">{vendorBanner}</span>
            <button onClick={() => setVendorBanner(null)} className="text-amber-600 hover:text-amber-800 font-bold text-xs ml-2">Dismiss</button>
          </div>
        )}
        {!searchQuery && !selectedDept && !hasActiveFilters && !browseAll ? (
          <HomeFeed
            products={products}
            loading={loading}
            onAddToCart={handleAddToCart}
            onProductClick={handleProductClick}
            onDeptClick={handleDeptChange}
            onBrowseAll={() => { setBrowseAll(true); window.scrollTo(0, 0); }}
            onSignUp={() => { setAuthTab('signup'); setIsAuthOpen(true); }}
            wishlisted={wishlistIds}
            onWishlistToggle={handleWishlistToggle}
            signedIn={!!user}
          />
        ) : (
        <div className="flex gap-6">
          <FilterSidebar
            filters={filters}
            onChange={setFilters}
            categories={categories}
            isOpen={filterSidebarOpen}
            onClose={() => setFilterSidebarOpen(false)}
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setFilterSidebarOpen(true)}
                  className="lg:hidden flex items-center gap-1.5 border border-gray-300 rounded-lg px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  Filters
                  {hasActiveFilters && (
                    <span className="bg-brand text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">!</span>
                  )}
                </button>
                <h3 className="font-semibold text-gray-800 text-sm sm:text-base">
                  {searchQuery
                    ? `Results for "${searchQuery}"`
                    : selectedDept
                    ? selectedDept
                    : 'All Products'}
                </h3>
              </div>
              <span className="text-sm text-gray-500">
                {displayProducts.length.toLocaleString()} {displayProducts.length === 1 ? 'result' : 'results'}
              </span>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden animate-pulse">
                    <div className="aspect-square bg-gray-100" />
                    <div className="p-3 space-y-2">
                      <div className="h-3 bg-gray-100 rounded w-3/4" />
                      <div className="h-3 bg-gray-100 rounded w-1/2" />
                      <div className="h-4 bg-gray-100 rounded w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : displayProducts.length === 0 ? (
              <div className="text-center py-24">
                <p className="text-xl text-gray-400 font-medium mb-2">
                  {searchQuery || hasActiveFilters ? 'No products match your search.' : 'No products yet. Be the first to sell!'}
                </p>
                {(searchQuery || hasActiveFilters || selectedDept) && (
                  <button
                    onClick={() => { setSearchQuery(''); setFilters(DEFAULT_FILTERS); setSelectedDept(''); }}
                    className="text-sm text-brand hover:text-accent underline"
                  >
                    Clear all filters
                  </button>
                )}
                {!searchQuery && !hasActiveFilters && !selectedDept && user && (
                  <button
                    onClick={handleAddProductClick}
                    className="mt-4 bg-brand hover:bg-brand-mid text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                  >
                    Add First Product
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                {displayProducts.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={handleAddToCart}
                    onClick={handleProductClick}
                    wishlisted={wishlistIds.has(product.id)}
                    onWishlistToggle={handleWishlistToggle}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
        )}
      </main>

      <footer className="bg-brand-dark text-white mt-16 py-10">
        <div className="max-w-[1500px] mx-auto px-4 text-center">
          <p className="font-extrabold text-xl mb-1">
            Klir<span className="text-accent">line</span>
            <span className="text-gray-400 font-normal text-sm ml-2">Store · Haiti</span>
          </p>
          <p className="text-sm text-slate-400">Secure payments powered by MonCash · Digicel Haiti</p>
          <p className="text-xs text-slate-600 mt-3">© {new Date().getFullYear()} Klirline. All rights reserved.</p>
        </div>
      </footer>

      <CartSidebar
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeFromCart}
        cartTotal={cartTotal}
        onCheckout={handleCheckout}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        defaultTab={authTab}
      />

      <AddProductModal
        isOpen={isAddProductOpen}
        onClose={() => setIsAddProductOpen(false)}
        onSuccess={fetchProducts}
        editProduct={editProduct}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cartItems={cartItems}
        cartTotal={cartTotal}
        onSuccess={handleCheckoutSuccess}
      />

      <VendorApplyModal
        isOpen={isVendorApplyOpen}
        onClose={() => setIsVendorApplyOpen(false)}
        onSuccess={() => {
          setIsVendorApplyOpen(false);
          fetchUserMeta();
          setVendorBanner('Demande envoyée. Klirline vérifiera votre pièce d’identité et votre preuve d’adresse Mairie sous 1–3 jours.');
        }}
      />

      <WhatsAppFab />
    </div>
  );
}

function App() {
  return (
    <LocaleProvider>
      <AuthProvider>
        <ShopApp />
      </AuthProvider>
    </LocaleProvider>
  );
}

export default App;
