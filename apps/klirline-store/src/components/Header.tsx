import { useState, useRef, useEffect } from 'react';
import {
  Search, ChevronDown, User, LogOut, Plus, BarChart2,
  ShoppingBag, Heart, MapPin, Menu, X, ChevronRight, ShieldCheck, Store,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { DEPARTMENTS, getDisplayPrice, type Product } from '../lib/supabase';
import { BRAND, NAV_DEPT_MAP, PAYMENTS, SOFT_LAUNCH, labelDepartment } from '../lib/brand';
import { useI18n } from '../i18n';

export type VendorStatus = 'none' | 'pending' | 'approved' | 'rejected';

interface HeaderProps {
  cartCount: number;
  onCartClick: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSignInClick: () => void;
  onAddProductClick: () => void;
  onDashboardClick: () => void;
  onBecomeSellerClick: () => void;
  onMyOrdersClick: () => void;
  onWishlistClick: () => void;
  onAccountClick: () => void;
  onLogoClick: () => void;
  selectedDept: string;
  onDeptChange: (d: string) => void;
  onAdminClick: () => void;
  isAdmin: boolean;
  vendorStatus: VendorStatus;
  searchProducts?: Product[];
  onProductSuggestionClick?: (product: Product) => void;
}

export const Header = ({
  cartCount, onCartClick, searchQuery, onSearchChange,
  onSignInClick, onAddProductClick, onDashboardClick, onBecomeSellerClick,
  onMyOrdersClick, onWishlistClick, onAccountClick, onLogoClick,
  selectedDept, onDeptChange, onAdminClick, isAdmin, vendorStatus,
  searchProducts = [],
  onProductSuggestionClick,
}: HeaderProps) => {
  const { user, signOut } = useAuth();
  const { t, locale, setLocale } = useI18n();
  const [accountOpen, setAccountOpen] = useState(false);
  const [deptOpen, setDeptOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  const accountRef = useRef<HTMLDivElement>(null);
  const deptRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tmr = window.setTimeout(() => setDebouncedQuery(searchQuery), 160);
    return () => window.clearTimeout(tmr);
  }, [searchQuery]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false);
      if (deptRef.current && !deptRef.current.contains(e.target as Node)) setDeptOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSuggestionsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const suggestions = (() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    return searchProducts
      .filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.brand ?? '').toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        (p.seller_shop_name ?? '').toLowerCase().includes(q),
      )
      .slice(0, 8);
  })();

  const emailLabel = user?.email
    ? (user.email.length > 16 ? user.email.slice(0, 14) + '…' : user.email)
    : null;

  const isApprovedSeller = vendorStatus === 'approved';

  const commitSearch = () => {
    setSuggestionsOpen(false);
    onSearchChange(searchQuery.trim());
  };

  return (
    <header className="sticky top-0 z-50">
      <div className="haiti-flag-bar" />
      {/* Soft-launch strip */}
      {SOFT_LAUNCH && (
        <div className="bg-accent text-brand-dark text-center text-xs sm:text-sm font-semibold px-3 py-1.5">
          KlirMarket est ouvert — paiement par carte disponible
          {!PAYMENTS.moncash && ' · MonCash bientôt'}
        </div>
      )}

      {/* ── Main bar ─────────────────────────────────────────────────────── */}
      <div className="bg-brand-dark text-white">
        <div className="max-w-[1500px] mx-auto px-2 sm:px-3 py-2.5 flex items-center gap-1.5 sm:gap-2">

          {/* Logo */}
          <button
            onClick={onLogoClick}
            className="flex-shrink-0 border-2 border-transparent hover:border-white rounded px-1 sm:px-2 py-1 transition-colors"
          >
            <span className="text-xl sm:text-2xl font-extrabold tracking-tight">
              Klir<span className="text-accent">Market</span>
            </span>
            <span className="block text-[8px] sm:text-[9px] text-gray-400 leading-none text-center -mt-0.5">Haiti</span>
          </button>

          {/* Deliver to */}
          <button className="hidden lg:flex flex-col items-start flex-shrink-0 border-2 border-transparent hover:border-white rounded px-2 py-1 transition-colors">
            <span className="text-[11px] text-gray-400 flex items-center gap-0.5">
              <MapPin className="w-3 h-3" /> {t('deliverTo')}
            </span>
            <span className="text-sm font-bold">Haiti</span>
          </button>

          {/* Search bar */}
          <div className="flex flex-1 min-w-0 relative" ref={searchRef}>
            <div className="flex w-full rounded-md overflow-hidden ring-2 ring-accent focus-within:ring-accent-hover" ref={deptRef}>
              {/* Dept dropdown */}
              <button
                type="button"
                onClick={() => setDeptOpen(v => !v)}
                className="hidden sm:flex items-center gap-1 bg-gray-200 text-gray-800 px-2 text-xs font-medium whitespace-nowrap hover:bg-gray-300 transition-colors flex-shrink-0"
              >
                <span className="max-w-[80px] truncate">
                  {selectedDept ? labelDepartment(selectedDept, locale) : t('all')}
                </span>
                <ChevronDown className="w-3 h-3" />
              </button>
              <input
                type="search"
                value={searchQuery}
                onChange={e => {
                  onSearchChange(e.target.value);
                  setSuggestionsOpen(true);
                }}
                onFocus={() => setSuggestionsOpen(true)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitSearch();
                  }
                  if (e.key === 'Escape') setSuggestionsOpen(false);
                }}
                placeholder={t('searchPlaceholder')}
                className="flex-1 px-3 py-2.5 text-gray-900 text-sm focus:outline-none min-w-0"
                autoComplete="off"
                role="combobox"
                aria-expanded={suggestionsOpen && suggestions.length > 0}
                aria-autocomplete="list"
              />
              <button
                type="button"
                onClick={commitSearch}
                className="bg-accent hover:bg-accent-hover px-4 transition-colors flex-shrink-0"
                aria-label={t('searchPlaceholder')}
              >
                <Search className="w-5 h-5 text-brand-dark" />
              </button>
            </div>

            {/* Dept dropdown menu */}
            {deptOpen && (
              <div className="absolute top-full left-0 mt-1 sm:w-64 bg-white text-gray-900 rounded-md shadow-2xl border border-gray-200 z-50 overflow-hidden">
                <div className="p-2 font-semibold text-xs text-gray-500 uppercase tracking-wide border-b px-3 py-2">
                  {t('selectDepartment')}
                </div>
                <button
                  type="button"
                  onClick={() => { onDeptChange(''); setDeptOpen(false); }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-brand-50 transition-colors ${!selectedDept ? 'font-bold text-brand' : ''}`}
                >
                  {t('allDepartments')}
                </button>
                {DEPARTMENTS.map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => { onDeptChange(d); setDeptOpen(false); }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-brand-50 transition-colors ${selectedDept === d ? 'font-bold text-brand' : ''}`}
                  >
                    {labelDepartment(d, locale)}
                  </button>
                ))}
              </div>
            )}

            {suggestionsOpen && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white text-gray-900 rounded-md shadow-2xl border border-gray-200 z-50 overflow-hidden max-h-80 overflow-y-auto">
                <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 border-b">
                  Suggestions
                </p>
                {suggestions.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-brand-50 transition-colors border-b border-gray-50 last:border-0"
                    onClick={() => {
                      setSuggestionsOpen(false);
                      onSearchChange('');
                      onProductSuggestionClick?.(p);
                    }}
                  >
                    <img
                      src={p.image_url}
                      alt=""
                      className="w-10 h-10 object-contain bg-gray-50 rounded border border-gray-100 flex-shrink-0"
                    />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium text-gray-900 line-clamp-1">{p.name}</span>
                      <span className="block text-xs text-gray-500 truncate">
                        {[p.brand, p.seller_shop_name].filter(Boolean).join(' · ') || p.department}
                      </span>
                    </span>
                    <span className="text-sm font-semibold text-brand flex-shrink-0">
                      HTG {getDisplayPrice(p).toLocaleString('fr-HT', { maximumFractionDigits: 0 })}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1 flex-shrink-0">

            <button
              type="button"
              onClick={() => setLocale(locale === 'fr' ? 'ht' : 'fr')}
              className="hidden sm:flex items-center justify-center min-w-[2.25rem] h-9 px-2 rounded border border-white/20 text-xs font-bold hover:bg-white/10 transition-colors"
              title="FR / Kreyòl"
            >
              {t('langLabel')}
            </button>

            {/* Account */}
            {user ? (
              <div className="relative" ref={accountRef}>
                <button
                  onClick={() => setAccountOpen(v => !v)}
                  className="hidden md:flex flex-col border-2 border-transparent hover:border-white rounded px-2 py-1 transition-colors"
                >
                  <span className="text-[11px] text-gray-400">{t('hello')}, {emailLabel}</span>
                  <span className="text-sm font-bold flex items-center gap-0.5">
                    {t('account')} <ChevronDown className="w-3.5 h-3.5" />
                  </span>
                </button>

                {accountOpen && (
                  <div className="absolute right-0 top-full mt-1 w-56 bg-white text-gray-900 rounded-lg shadow-2xl border border-gray-200 overflow-hidden z-50">
                    <div className="bg-gray-50 px-4 py-3 border-b">
                      <div className="w-10 h-10 rounded-full bg-brand flex items-center justify-center text-white font-bold text-lg mx-auto mb-1">
                        {user.email?.[0].toUpperCase()}
                      </div>
                      <p className="text-xs text-gray-500 text-center truncate">{user.email}</p>
                    </div>
                    <DropItem icon={<ShoppingBag />} label={t('myOrders')} onClick={() => { onMyOrdersClick(); setAccountOpen(false); }} />
                    <DropItem icon={<Heart />} label={t('myWishlist')} onClick={() => { onWishlistClick(); setAccountOpen(false); }} />
                    <DropItem icon={<User />} label={t('myAccount')} onClick={() => { onAccountClick(); setAccountOpen(false); }} />
                    {isApprovedSeller ? (
                      <>
                        <DropItem icon={<BarChart2 />} label={t('sellerDashboard')} onClick={() => { onDashboardClick(); setAccountOpen(false); }} />
                        <DropItem icon={<Plus />} label={t('addProduct')} onClick={() => { onAddProductClick(); setAccountOpen(false); }} />
                      </>
                    ) : (
                      <DropItem icon={<Store />} label={t('becomeSeller')} onClick={() => { onBecomeSellerClick(); setAccountOpen(false); }} />
                    )}
                    {isAdmin && (
                      <DropItem icon={<ShieldCheck />} label={t('adminPanel')} onClick={() => { onAdminClick(); setAccountOpen(false); }} />
                    )}
                    <div className="border-t">
                      <DropItem icon={<LogOut />} label={t('signOut')} onClick={() => { signOut(); setAccountOpen(false); }} red />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onSignInClick}
                className="hidden md:flex flex-col border-2 border-transparent hover:border-white rounded px-2 py-1 transition-colors"
              >
                <span className="text-[11px] text-gray-400">{t('helloSignIn')}</span>
                <span className="text-sm font-bold flex items-center gap-0.5">{t('account')} <ChevronDown className="w-3.5 h-3.5" /></span>
              </button>
            )}

            {/* Orders */}
            <button
              onClick={user ? onMyOrdersClick : onSignInClick}
              className="hidden md:flex flex-col border-2 border-transparent hover:border-white rounded px-2 py-1 transition-colors"
            >
              <span className="text-[11px] text-gray-400">{t('ordersReturns')}</span>
              <span className="text-sm font-bold">&nbsp;</span>
            </button>

            {/* Wishlist */}
            <button
              onClick={user ? onWishlistClick : onSignInClick}
              className="hidden md:flex flex-col border-2 border-transparent hover:border-white rounded px-2 py-1 transition-colors"
            >
              <span className="text-[11px] text-gray-400">{t('savedList')}</span>
              <span className="text-sm font-bold flex items-center gap-0.5"><Heart className="w-4 h-4" /></span>
            </button>

            {/* Cart — compact label frees space for search on Android/mobile */}
            <button
              onClick={onCartClick}
              className="relative flex flex-col items-center justify-end border-2 border-transparent hover:border-white rounded px-1 sm:px-2 py-0.5 transition-colors min-w-0"
              aria-label={t('cart')}
            >
              <div className="relative">
                <img
                  src={BRAND.cartIcon}
                  alt=""
                  width={32}
                  height={32}
                  className="w-8 h-8 sm:w-9 sm:h-9 object-contain drop-shadow-sm"
                  aria-hidden
                />
                {cartCount > 0 && (
                  <span className="absolute -top-1 left-1/2 -translate-x-1/2 bg-accent text-brand-dark text-[10px] sm:text-xs font-extrabold rounded-full min-w-[18px] h-4 sm:min-w-[20px] sm:h-5 flex items-center justify-center px-0.5 leading-none">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </div>
              <span className="text-[9px] sm:text-[10px] font-semibold leading-none tracking-tight max-w-[2.6rem] truncate">
                {t('cart')}
              </span>
            </button>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(v => !v)}
              className="md:hidden border-2 border-transparent hover:border-white rounded p-2 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Nav bar ──────────────────────────────────────────────────────── */}
      <div className="bg-brand-mid text-white text-sm">
        <div className="max-w-[1500px] mx-auto px-3 flex items-center gap-1 overflow-x-auto scrollbar-none py-1">
          <button
            onClick={() => setMobileMenuOpen(v => !v)}
            className="flex items-center gap-1 px-3 py-1.5 rounded hover:bg-white/10 transition-colors font-semibold whitespace-nowrap flex-shrink-0"
          >
            <Menu className="w-4 h-4" /> {t('all')}
          </button>
          {(
            [
              { key: 'todaysDeals' as const, dept: '' },
              { key: 'customerService' as const, dept: '' },
              { key: 'bestSellers' as const, dept: '' },
              { key: 'newReleases' as const, dept: '' },
              { key: 'navElectronics' as const, dept: NAV_DEPT_MAP.Electronics },
              { key: 'navBooks' as const, dept: NAV_DEPT_MAP.Books },
              { key: 'navFashion' as const, dept: NAV_DEPT_MAP.Fashion },
              { key: 'navHome' as const, dept: NAV_DEPT_MAP.Home },
            ] as const
          ).map(item => (
            <button
              key={item.key}
              onClick={() => onDeptChange(item.dept)}
              className="px-3 py-1.5 rounded hover:bg-white/10 transition-colors whitespace-nowrap flex-shrink-0"
            >
              {t(item.key)}
            </button>
          ))}
          {user && isApprovedSeller && (
            <button
              onClick={onAddProductClick}
              className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded bg-accent hover:bg-accent-hover transition-colors font-semibold whitespace-nowrap flex-shrink-0 text-brand-dark"
            >
              <Plus className="w-4 h-4" /> {t('sellOnKlirline')}
            </button>
          )}
          {user && !isApprovedSeller && (
            <button
              onClick={onBecomeSellerClick}
              className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded bg-accent hover:bg-accent-hover transition-colors font-semibold whitespace-nowrap flex-shrink-0 text-brand-dark"
            >
              <Store className="w-4 h-4" /> {t('becomeSeller')}
            </button>
          )}
        </div>
      </div>

      {/* ── Mobile slide-down menu ────────────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b shadow-xl z-40">
          {user ? (
            <>
              <div className="bg-brand-dark text-white px-4 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-accent text-brand-dark flex items-center justify-center font-bold">
                  {user.email?.[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-xs text-gray-400">{t('signedInAs')}</p>
                  <p className="text-sm font-semibold truncate">{user.email}</p>
                </div>
              </div>
              <MobileItem icon={<ShoppingBag />} label={t('myOrders')} onClick={() => { onMyOrdersClick(); setMobileMenuOpen(false); }} />
              <MobileItem icon={<Heart />} label={t('myWishlist')} onClick={() => { onWishlistClick(); setMobileMenuOpen(false); }} />
              <MobileItem icon={<User />} label={t('myAccount')} onClick={() => { onAccountClick(); setMobileMenuOpen(false); }} />
              {isApprovedSeller ? (
                <>
                  <MobileItem icon={<BarChart2 />} label={t('sellerDashboard')} onClick={() => { onDashboardClick(); setMobileMenuOpen(false); }} />
                  <MobileItem icon={<Plus />} label={t('addProduct')} onClick={() => { onAddProductClick(); setMobileMenuOpen(false); }} />
                </>
              ) : (
                <MobileItem icon={<Store />} label={t('becomeSeller')} onClick={() => { onBecomeSellerClick(); setMobileMenuOpen(false); }} />
              )}
              {isAdmin && (
                <MobileItem icon={<ShieldCheck />} label={t('adminPanel')} onClick={() => { onAdminClick(); setMobileMenuOpen(false); }} />
              )}
              <div className="border-t">
                <MobileItem icon={<LogOut />} label={t('signOut')} onClick={() => { signOut(); setMobileMenuOpen(false); }} red />
              </div>
            </>
          ) : (
            <MobileItem icon={<User />} label={t('signInCreate')} onClick={() => { onSignInClick(); setMobileMenuOpen(false); }} />
          )}
          <div className="border-t py-2">
            <p className="px-4 py-1 text-xs font-bold text-gray-500 uppercase tracking-wide">{t('shopByDepartment')}</p>
            {DEPARTMENTS.map(d => (
              <MobileItem
                key={d}
                icon={<ChevronRight className="w-4 h-4" />}
                label={labelDepartment(d, locale)}
                onClick={() => { onDeptChange(d); setMobileMenuOpen(false); }}
              />
            ))}
          </div>
        </div>
      )}
    </header>
  );
};

function DropItem({ icon, label, onClick, red }: { icon: React.ReactNode; label: string; onClick: () => void; red?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors text-left ${red ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-brand-50'}`}
    >
      <span className="w-4 h-4 flex-shrink-0">{icon}</span>
      {label}
    </button>
  );
}

function MobileItem({ icon, label, onClick, red }: { icon: React.ReactNode; label: string; onClick: () => void; red?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-sm border-b border-gray-100 transition-colors ${red ? 'text-red-600' : 'text-gray-800 hover:bg-gray-50'}`}
    >
      <span className="w-5 h-5 flex-shrink-0 text-gray-400">{icon}</span>
      {label}
    </button>
  );
}
