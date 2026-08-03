import { useState, useEffect, useCallback, useRef } from 'react';
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
import { StoreFooter } from './components/StoreFooter';
import { LegalPage } from './components/LegalPage';
import { useCart } from './hooks/useCart';
import { useWishlist } from './hooks/useWishlist';
import { LocaleProvider } from './i18n';
import { supabase, isDemoMode, type Product, type Category } from './lib/supabase';
import { isJunkProductName, CATEGORY_TO_DEPARTMENT } from './lib/brand';
import { DEMO_CATEGORIES, DEMO_PRODUCTS } from './lib/demo-products';
import { trackAddToCart, trackDepartment, trackProductView } from './lib/activity';
import {
  navigateTo,
  parseLegalSlugFromPath,
  parseProductIdFromPath,
  productPath,
  legalPath,
  type LegalSlug,
} from './lib/routing';
import { searchCatalog } from './lib/searchCatalog';
import { applyHomeSeo } from './lib/seo';
import { SlidersHorizontal, Clock, XCircle } from 'lucide-react';

const CATALOG_CACHE_KEY = 'klirline_catalog_cache_v2';
const CATALOG_TTL_MS = 60_000;

type View = 'shop' | 'dashboard' | 'orders' | 'product' | 'wishlist' | 'account' | 'admin' | 'legal';

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
  const [serverSearchHits, setServerSearchHits] = useState<Product[] | null>(null);
  const [searching, setSearching] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [legalSlug, setLegalSlug] = useState<LegalSlug | null>(null);

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [stripeReturn, setStripeReturn] = useState<{ orderId: string; sessionId: string | null; guestToken: string | null } | null>(null);
  const [natcashReturn, setNatcashReturn] = useState<{ orderId: string; guestToken: string | null } | null>(null);
  const [walletResume, setWalletResume] = useState<{ orderId: string; method: 'moncash' | 'natcash' } | null>(null);
  const [sponsorCheckout, setSponsorCheckout] = useState(false);
  const [isVendorApplyOpen, setIsVendorApplyOpen] = useState(false);
  const [authTab, setAuthTab] = useState<'signin' | 'signup'>('signin');
  const [editProduct, setEditProduct] = useState<Product | null>(null);

  const [isAdmin, setIsAdmin] = useState(false);
  const [vendorStatus, setVendorStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none');
  const [vendorBanner, setVendorBanner] = useState<string | null>(null);
  const pendingCheckoutRef = useRef(false);

  const { cartItems, addToCart, updateQuantity, removeFromCart, cartTotal, cartCount, refreshCart } = useCart(products);
  const {
    wishlistIds,
    wishlistItems,
    toggleWishlist,
    removeFromWishlist,
    clearWishlist,
  } = useWishlist(products);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  // Deep-link /produit/:id, /cgv|/confidentialite|/litiges + browser back/forward
  useEffect(() => {
    const openFromPath = () => {
      const legal = parseLegalSlugFromPath();
      if (legal) {
        setLegalSlug(legal);
        setSelectedProduct(null);
        setView('legal');
        return;
      }

      const id = parseProductIdFromPath();
      if (id) {
        const found = products.find(p => p.id === id);
        if (found) {
          setSelectedProduct(found);
          setLegalSlug(null);
          setView('product');
        }
        return;
      }

      setSelectedProduct(null);
      setLegalSlug(null);
      setView(current => (current === 'product' || current === 'legal' ? 'shop' : current));
    };

    openFromPath();
    window.addEventListener('popstate', openFromPath);
    return () => window.removeEventListener('popstate', openFromPath);
  }, [products]);

  useEffect(() => {
    if (view === 'shop' || view === 'wishlist' || view === 'account' || view === 'orders' || view === 'dashboard' || view === 'admin') {
      if (view === 'shop' && !selectedProduct) applyHomeSeo();
    }
  }, [view, selectedProduct]);

  // Stripe / NatCash return (?checkout=…&order_id=…)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q && q.trim()) {
      setSearchQuery(q.trim());
      setBrowseAll(true);
    }
    const checkout = params.get('checkout');
    const orderId = params.get('order_id');
    if (checkout === 'stripe_success' && orderId) {
      // Prefer sessionStorage; ignore guest_token query if present (legacy links)
      const guestToken = sessionStorage.getItem('klirline_guest_token');
      setStripeReturn({ orderId, sessionId: params.get('session_id'), guestToken });
      setIsCheckoutOpen(true);
      setIsCartOpen(false);
      window.history.replaceState({}, '', window.location.pathname);
    } else if ((checkout === 'natcash_success' || checkout === 'moncash_success') && orderId) {
      const guestToken = sessionStorage.getItem('klirline_guest_token');
      const method = checkout === 'moncash_success' ? 'moncash' : 'natcash';
      if (method === 'natcash') {
        setNatcashReturn({ orderId, guestToken });
      } else {
        setWalletResume({ orderId, method });
      }
      setIsCheckoutOpen(true);
      setIsCartOpen(false);
      window.history.replaceState({}, '', window.location.pathname);
    } else if (checkout === 'sponsor_success') {
      setSponsorCheckout(true);
      setView('dashboard');
      // keep query params for SellerSponsoredPanel verify
    } else if (checkout === 'sponsor_cancel') {
      setSponsorCheckout(true);
      setView('dashboard');
      window.history.replaceState({}, '', window.location.pathname);
    } else if (checkout === 'stripe_cancel' || checkout === 'natcash_cancel' || checkout === 'moncash_cancel') {
      window.history.replaceState({}, '', window.location.pathname);
    } else {
      // Resume wallet after Digicel redirect / app reopen
      try {
        const raw = sessionStorage.getItem('klirline_pending_wallet');
        if (raw) {
          const pending = JSON.parse(raw) as { orderId?: string; method?: string };
          if (
            pending?.orderId &&
            (pending.method === 'moncash' || pending.method === 'natcash')
          ) {
            setWalletResume({
              orderId: pending.orderId,
              method: pending.method,
            });
            setIsCheckoutOpen(true);
            setIsCartOpen(false);
          }
        }
      } catch {
        /* ignore bad pending payload */
      }
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchUserMeta();
      if (pendingCheckoutRef.current) {
        pendingCheckoutRef.current = false;
        setIsAuthOpen(false);
        setIsCheckoutOpen(true);
      }
    } else {
      setIsAdmin(false);
      setVendorStatus('none');
    }
  }, [user]);

  // Server-side search (debounced) when query ≥ 2 chars
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setServerSearchHits(null);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const tmr = window.setTimeout(async () => {
      const hits = await searchCatalog(q, products, 48);
      if (!cancelled) {
        setServerSearchHits(hits);
        setSearching(false);
      }
    }, 220);
    return () => {
      cancelled = true;
      window.clearTimeout(tmr);
    };
  }, [searchQuery, products]);

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
      .select('*, categories(name)')
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

    const cleaned = (data ?? [])
      .filter(p => !isJunkProductName(p.name))
      .map(p => {
        const row = p as Product & { categories?: { name?: string } | null };
        const catName = row.categories?.name;
        const department =
          row.department ||
          (catName ? CATEGORY_TO_DEPARTMENT[catName] ?? catName : null);
        const { categories: _c, ...rest } = row;
        return { ...rest, department } as Product;
      });
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
    const base = q.length >= 2 && serverSearchHits
      ? serverSearchHits
      : products;

    return base
      .filter(p => {
        if (!serverSearchHits && q) {
          if (
            !p.name.toLowerCase().includes(q) &&
            !p.description.toLowerCase().includes(q) &&
            !(p.brand ?? '').toLowerCase().includes(q) &&
            !(p.seller_shop_name ?? '').toLowerCase().includes(q)
          ) return false;
        }
        if (selectedDept && p.department !== selectedDept) return false;
        if (filters.categoryId && p.category_id !== filters.categoryId) return false;
        if (filters.department && p.department !== filters.department) return false;
        if (filters.minPrice && p.price < parseFloat(filters.minPrice)) return false;
        if (filters.maxPrice && p.price > parseFloat(filters.maxPrice)) return false;
        if (filters.minRating > 0 && p.rating < filters.minRating) return false;
        if (filters.inStockOnly && !p.in_stock) return false;
        if (filters.badge && p.badge !== filters.badge) return false;
        return true;
      })
      .sort((a, b) => Number(Boolean(b.sponsored)) - Number(Boolean(a.sponsored)));
  }, [products, searchQuery, selectedDept, filters, serverSearchHits]);

  const displayProducts = filteredProducts();
  const suggestionCatalog = serverSearchHits?.length ? serverSearchHits : products;

  const handleAddToCart = async (product: Product, quantity = 1) => {
    trackAddToCart(product);
    await addToCart(product, quantity);
    setIsCartOpen(true);
  };

  const handleBuyNow = async (product: Product, quantity = 1) => {
    trackAddToCart(product);
    await addToCart(product, quantity);
    setIsCartOpen(false);
    if (!user) {
      pendingCheckoutRef.current = true;
      setAuthTab('signin');
      setIsAuthOpen(true);
      return;
    }
    setIsCheckoutOpen(true);
  };

  const relatedForSelected = selectedProduct
    ? products
        .filter(p => {
          if (p.id === selectedProduct.id) return false;
          return (
            (selectedProduct.category_id && p.category_id === selectedProduct.category_id) ||
            (selectedProduct.department && p.department === selectedProduct.department) ||
            (selectedProduct.seller_id && p.seller_id === selectedProduct.seller_id)
          );
        })
        .slice(0, 8)
    : [];

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
    navigateTo(productPath(product.id));
    window.scrollTo(0, 0);
  };

  const goShop = (replace = false) => {
    setView('shop');
    setSelectedProduct(null);
    setLegalSlug(null);
    navigateTo('/', replace);
  };

  const openLegal = (slug: LegalSlug) => {
    setLegalSlug(slug);
    setSelectedProduct(null);
    setView('legal');
    navigateTo(legalPath(slug));
    window.scrollTo(0, 0);
  };

  const openVendorApplyOrBanner = () => {
    if (vendorStatus === 'pending') {
      setVendorBanner('Votre demande vendeur est en cours de vérification par Klirline (ID + selfie + preuve Mairie). Vous pourrez vendre après approbation.');
      return;
    }
    if (vendorStatus === 'rejected') {
      setVendorBanner('Votre demande a été refusée. Vous pouvez soumettre une nouvelle candidature avec des documents valides.');
      setIsVendorApplyOpen(true);
      return;
    }
    if (vendorStatus === 'approved') {
      return;
    }
    setIsVendorApplyOpen(true);
  };

  const handleBecomeSellerClick = () => requireAuth(() => {
    openVendorApplyOrBanner();
  });

  const handleAddProductClick = () => requireAuth(() => {
    if (vendorStatus !== 'approved') {
      openVendorApplyOrBanner();
      return;
    }
    setEditProduct(null);
    setIsAddProductOpen(true);
  });

  const handleEditProduct = (product: Product) => {
    setEditProduct(product);
    setIsAddProductOpen(true);
  };

  const handleDashboardClick = () => requireAuth(() => {
    if (vendorStatus !== 'approved') {
      openVendorApplyOrBanner();
      return;
    }
    setView('dashboard');
  });

  const handleSignedUp = (intent: 'buyer' | 'seller') => {
    if (intent === 'seller') {
      setIsVendorApplyOpen(true);
    }
  };
  const handleMyOrdersClick = () => requireAuth(() => setView('orders'));
  const handleWishlistClick = () => setView('wishlist');
  const handleAccountClick = () => requireAuth(() => setView('account'));
  const handleAdminClick = () => requireAuth(() => setView('admin'));
  const handleCheckout = () => setIsCheckoutOpen(true);

  const handleCheckoutSuccess = async () => {
    for (const item of cartItems) await removeFromCart(item.id);
    await refreshCart();
  };

  const handleLogoClick = () => {
    setSearchQuery('');
    setSelectedDept('');
    setBrowseAll(false);
    setFilters(DEFAULT_FILTERS);
    setServerSearchHits(null);
    goShop();
    window.scrollTo(0, 0);
  };

  const handleDeptChange = (d: string) => {
    if (d) trackDepartment(d);
    setSelectedDept(d);
    setBrowseAll(!!d);
    setFilters(f => ({ ...f, department: '' }));
    if (view !== 'shop') goShop();
  };

  const handleWishlistToggle = async (product?: Product) => {
    if (!product) return;
    await toggleWishlist(product);
  };

  // ── Views that replace the full page ──────────────────────────────────────

  if (view === 'product' && selectedProduct) {
    return (
      <div className="min-h-screen bg-transparent">
        <Header
          cartCount={cartCount}
          onCartClick={() => setIsCartOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSignInClick={() => { setAuthTab('signin'); setIsAuthOpen(true); }}
          onAddProductClick={handleAddProductClick}
          onDashboardClick={handleDashboardClick}
          onBecomeSellerClick={handleBecomeSellerClick}
          onMyOrdersClick={handleMyOrdersClick}
          onWishlistClick={handleWishlistClick}
          onAccountClick={handleAccountClick}
          onLogoClick={handleLogoClick}
          selectedDept={selectedDept}
          onDeptChange={handleDeptChange}
          onAdminClick={handleAdminClick}
          isAdmin={isAdmin}
          vendorStatus={vendorStatus}
          searchProducts={suggestionCatalog}
          onProductSuggestionClick={handleProductClick}
        />
        <ProductDetailPage
          product={selectedProduct}
          relatedProducts={relatedForSelected}
          onBack={() => goShop()}
          onAddToCart={handleAddToCart}
          onBuyNow={handleBuyNow}
          onProductClick={handleProductClick}
          wishlistedIds={wishlistIds}
          onWishlistToggle={handleWishlistToggle}
        />
        <StoreFooter onLegalNavigate={openLegal} />
        <WhatsAppFab />
        <CartSidebar
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          cartItems={cartItems}
          onUpdateQuantity={updateQuantity}
          onRemoveItem={removeFromCart}
          cartTotal={cartTotal}
          onCheckout={handleCheckout}
          onContinueShopping={() => { setIsCartOpen(false); goShop(); }}
        />
        <CheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => { setIsCheckoutOpen(false); setStripeReturn(null); setNatcashReturn(null); setWalletResume(null); }}
          cartItems={cartItems}
          cartTotal={cartTotal}
          onSuccess={handleCheckoutSuccess}
          stripeReturn={stripeReturn}
          onStripeReturnHandled={() => setStripeReturn(null)}
          natcashReturn={natcashReturn}
          onNatcashReturnHandled={() => setNatcashReturn(null)}
          walletResume={walletResume}
          onWalletResumeHandled={() => setWalletResume(null)}
        />
        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          defaultTab={authTab}
          onSignedUp={handleSignedUp}
        />
      </div>
    );
  }

  if (view === 'legal' && legalSlug) {
    return (
      <div className="min-h-screen bg-transparent">
        <LegalPage
          slug={legalSlug}
          onBack={() => goShop()}
          onNavigateLegal={openLegal}
        />
        <StoreFooter onLegalNavigate={openLegal} />
        <WhatsAppFab />
      </div>
    );
  }

  if (view === 'dashboard') {
    if (vendorStatus !== 'approved') {
      return (
        <div className="min-h-screen bg-haiti-sand flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 max-w-md w-full p-6 text-center space-y-4">
            <p className="text-lg font-semibold text-gray-900">Espace réservé aux vendeurs</p>
            <p className="text-sm text-gray-600">
              {vendorStatus === 'pending'
                ? 'Votre dossier vendeur est en cours de vérification.'
                : 'Complétez le formulaire vendeur (KYC) pour accéder à cet espace.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <button
                type="button"
                onClick={() => setView('shop')}
                className="px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Retour boutique
              </button>
              {vendorStatus !== 'pending' && (
                <button
                  type="button"
                  onClick={() => { setView('shop'); setIsVendorApplyOpen(true); }}
                  className="px-4 py-2.5 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-mid"
                >
                  Devenir vendeur
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }
    return (
      <>
        <SellerDashboard
          onBack={() => { setSponsorCheckout(false); setView('shop'); }}
          onAddProduct={handleAddProductClick}
          onEditProduct={handleEditProduct}
          initialTab={sponsorCheckout ? 'sponsored' : 'fulfillments'}
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
        items={wishlistItems}
        onRemove={removeFromWishlist}
        onClear={clearWishlist}
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
    <div className="min-h-screen bg-transparent">
      <Header
        cartCount={cartCount}
        onCartClick={() => setIsCartOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSignInClick={() => { setAuthTab('signin'); setIsAuthOpen(true); }}
        onAddProductClick={handleAddProductClick}
        onDashboardClick={handleDashboardClick}
        onBecomeSellerClick={handleBecomeSellerClick}
        onMyOrdersClick={handleMyOrdersClick}
        onWishlistClick={handleWishlistClick}
        onAccountClick={handleAccountClick}
        onLogoClick={handleLogoClick}
        selectedDept={selectedDept}
        onDeptChange={handleDeptChange}
        onAdminClick={handleAdminClick}
        isAdmin={isAdmin}
        vendorStatus={vendorStatus}
        searchProducts={suggestionCatalog}
        onProductSuggestionClick={handleProductClick}
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
                {searching ? 'Recherche… · ' : ''}
                {displayProducts.length.toLocaleString()} {displayProducts.length === 1 ? 'résultat' : 'résultats'}
                {searchQuery.trim().length >= 2 ? ' (serveur)' : ''}
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
                {!searchQuery && !hasActiveFilters && !selectedDept && user && vendorStatus === 'approved' && (
                  <button
                    onClick={handleAddProductClick}
                    className="mt-4 bg-brand hover:bg-brand-mid text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                  >
                    Ajouter un produit
                  </button>
                )}
                {!searchQuery && !hasActiveFilters && !selectedDept && user && vendorStatus !== 'approved' && (
                  <button
                    onClick={handleBecomeSellerClick}
                    className="mt-4 bg-brand hover:bg-brand-mid text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                  >
                    Devenir vendeur
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

      <StoreFooter onLegalNavigate={openLegal} />

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
        onSignedUp={handleSignedUp}
      />

      <AddProductModal
        isOpen={isAddProductOpen}
        onClose={() => setIsAddProductOpen(false)}
        onSuccess={fetchProducts}
        editProduct={editProduct}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => { setIsCheckoutOpen(false); setStripeReturn(null); setNatcashReturn(null); setWalletResume(null); }}
        cartItems={cartItems}
        cartTotal={cartTotal}
        onSuccess={handleCheckoutSuccess}
        stripeReturn={stripeReturn}
        onStripeReturnHandled={() => setStripeReturn(null)}
        natcashReturn={natcashReturn}
        onNatcashReturnHandled={() => setNatcashReturn(null)}
        walletResume={walletResume}
        onWalletResumeHandled={() => setWalletResume(null)}
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
