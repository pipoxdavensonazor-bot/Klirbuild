import { useState, useRef, useEffect } from 'react';
import {
  Search, ShoppingCart, ChevronDown, User, LogOut, Plus, BarChart2,
  ShoppingBag, Heart, MapPin, Menu, X, ChevronRight, ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { DEPARTMENTS } from '../lib/supabase';
import { NAV_DEPT_MAP } from '../lib/brand';
import { useI18n } from '../i18n';

interface HeaderProps {
  cartCount: number;
  onCartClick: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSignInClick: () => void;
  onAddProductClick: () => void;
  onDashboardClick: () => void;
  onMyOrdersClick: () => void;
  onWishlistClick: () => void;
  onAccountClick: () => void;
  onLogoClick: () => void;
  selectedDept: string;
  onDeptChange: (d: string) => void;
  onAdminClick: () => void;
  isAdmin: boolean;
}

export const Header = ({
  cartCount, onCartClick, searchQuery, onSearchChange,
  onSignInClick, onAddProductClick, onDashboardClick, onMyOrdersClick,
  onWishlistClick, onAccountClick, onLogoClick,
  selectedDept, onDeptChange, onAdminClick, isAdmin,
}: HeaderProps) => {
  const { user, signOut } = useAuth();
  const { t, locale, setLocale } = useI18n();
  const [accountOpen, setAccountOpen] = useState(false);
  const [deptOpen, setDeptOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const deptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false);
      if (deptRef.current && !deptRef.current.contains(e.target as Node)) setDeptOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const emailLabel = user?.email
    ? (user.email.length > 16 ? user.email.slice(0, 14) + '…' : user.email)
    : null;

  return (
    <header className="sticky top-0 z-50 shadow-lg">
      {/* ── Main bar ─────────────────────────────────────────────────────── */}
      <div className="bg-brand-dark text-white">
        <div className="max-w-[1500px] mx-auto px-3 py-2.5 flex items-center gap-2">

          {/* Logo */}
          <button
            onClick={onLogoClick}
            className="flex-shrink-0 border-2 border-transparent hover:border-white rounded px-2 py-1 transition-colors mr-1"
          >
            <span className="text-2xl font-extrabold tracking-tight">
              Klir<span className="text-accent">line</span>
            </span>
            <span className="block text-[9px] text-gray-400 leading-none text-center -mt-0.5">Store · Haiti</span>
          </button>

          {/* Deliver to */}
          <button className="hidden lg:flex flex-col items-start flex-shrink-0 border-2 border-transparent hover:border-white rounded px-2 py-1 transition-colors">
            <span className="text-[11px] text-gray-400 flex items-center gap-0.5">
              <MapPin className="w-3 h-3" /> {t('deliverTo')}
            </span>
            <span className="text-sm font-bold">Haiti</span>
          </button>

          {/* Search bar */}
          <div className="flex flex-1 min-w-0" ref={deptRef}>
            <div className="flex w-full rounded-md overflow-hidden ring-2 ring-accent focus-within:ring-accent-hover">
              {/* Dept dropdown */}
              <button
                onClick={() => setDeptOpen(v => !v)}
                className="hidden sm:flex items-center gap-1 bg-gray-200 text-gray-800 px-2 text-xs font-medium whitespace-nowrap hover:bg-gray-300 transition-colors flex-shrink-0"
              >
                <span className="max-w-[80px] truncate">{selectedDept || 'All'}</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              <input
                type="text"
                value={searchQuery}
                onChange={e => onSearchChange(e.target.value)}
                placeholder={t('searchPlaceholder')}
                className="flex-1 px-3 py-2.5 text-gray-900 text-sm focus:outline-none min-w-0"
              />
              <button className="bg-accent hover:bg-accent-hover px-4 transition-colors flex-shrink-0">
                <Search className="w-5 h-5 text-brand-dark" />
              </button>
            </div>

            {/* Dept dropdown menu */}
            {deptOpen && (
              <div className="absolute top-[56px] left-0 right-0 sm:left-auto sm:w-64 bg-white text-gray-900 rounded-md shadow-2xl border border-gray-200 z-50 overflow-hidden">
                <div className="p-2 font-semibold text-xs text-gray-500 uppercase tracking-wide border-b px-3 py-2">
                  Select a Department
                </div>
                <button
                  onClick={() => { onDeptChange(''); setDeptOpen(false); }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-orange-50 transition-colors ${!selectedDept ? 'font-bold text-orange-600' : ''}`}
                >
                  All Departments
                </button>
                {DEPARTMENTS.map(d => (
                  <button
                    key={d}
                    onClick={() => { onDeptChange(d); setDeptOpen(false); }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-orange-50 transition-colors ${selectedDept === d ? 'font-bold text-orange-600' : ''}`}
                  >
                    {d}
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
                  <span className="text-[11px] text-gray-400">Hello, {emailLabel}</span>
                  <span className="text-sm font-bold flex items-center gap-0.5">
                    Account <ChevronDown className="w-3.5 h-3.5" />
                  </span>
                </button>

                {accountOpen && (
                  <div className="absolute right-0 top-full mt-1 w-56 bg-white text-gray-900 rounded-lg shadow-2xl border border-gray-200 overflow-hidden z-50">
                    <div className="bg-gray-50 px-4 py-3 border-b">
                      <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-lg mx-auto mb-1">
                        {user.email?.[0].toUpperCase()}
                      </div>
                      <p className="text-xs text-gray-500 text-center truncate">{user.email}</p>
                    </div>
                    <DropItem icon={<BarChart2 />} label="Seller Dashboard" onClick={() => { onDashboardClick(); setAccountOpen(false); }} />
                    <DropItem icon={<ShoppingBag />} label="My Orders" onClick={() => { onMyOrdersClick(); setAccountOpen(false); }} />
                    <DropItem icon={<Heart />} label="My Wishlist" onClick={() => { onWishlistClick(); setAccountOpen(false); }} />
                    <DropItem icon={<User />} label="My Account" onClick={() => { onAccountClick(); setAccountOpen(false); }} />
                    <DropItem icon={<Plus />} label="Add New Product" onClick={() => { onAddProductClick(); setAccountOpen(false); }} />
                    {isAdmin && (
                      <DropItem icon={<ShieldCheck />} label="Admin Panel" onClick={() => { onAdminClick(); setAccountOpen(false); }} />
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

            {/* Cart */}
            <button
              onClick={onCartClick}
              className="relative flex items-end gap-1 border-2 border-transparent hover:border-white rounded px-2 py-1 transition-colors"
            >
              <div className="relative">
                <ShoppingCart className="w-8 h-8" />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 bg-accent text-brand-dark text-xs font-extrabold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 leading-none">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </div>
              <span className="text-sm font-bold pb-0.5">{t('cart')}</span>
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
            <Menu className="w-4 h-4" /> All
          </button>
          {(['Today\'s Deals', 'Customer Service', 'Best Sellers', 'New Releases', 'Electronics', 'Books', 'Fashion', 'Home'] as const).map(item => (
            <button
              key={item}
              onClick={() => {
                const mapped =
                  item === "Today's Deals" || item === 'Customer Service' || item === 'Best Sellers' || item === 'New Releases'
                    ? ''
                    : (NAV_DEPT_MAP[item] ?? item);
                onDeptChange(mapped);
              }}
              className="px-3 py-1.5 rounded hover:bg-white/10 transition-colors whitespace-nowrap flex-shrink-0"
            >
              {item}
            </button>
          ))}
          {user && (
            <button
              onClick={onAddProductClick}
              className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded bg-accent hover:bg-accent-hover transition-colors font-semibold whitespace-nowrap flex-shrink-0 text-brand-dark"
            >
              <Plus className="w-4 h-4" /> Sell
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
                  <p className="text-xs text-gray-400">Signed in as</p>
                  <p className="text-sm font-semibold truncate">{user.email}</p>
                </div>
              </div>
              <MobileItem icon={<BarChart2 />} label="Seller Dashboard" onClick={() => { onDashboardClick(); setMobileMenuOpen(false); }} />
              <MobileItem icon={<ShoppingBag />} label="My Orders" onClick={() => { onMyOrdersClick(); setMobileMenuOpen(false); }} />
              <MobileItem icon={<Heart />} label="My Wishlist" onClick={() => { onWishlistClick(); setMobileMenuOpen(false); }} />
              <MobileItem icon={<User />} label="My Account" onClick={() => { onAccountClick(); setMobileMenuOpen(false); }} />
              <MobileItem icon={<Plus />} label="Add New Product" onClick={() => { onAddProductClick(); setMobileMenuOpen(false); }} />
              {isAdmin && (
                <MobileItem icon={<ShieldCheck />} label="Admin Panel" onClick={() => { onAdminClick(); setMobileMenuOpen(false); }} />
              )}
              <div className="border-t">
                <MobileItem icon={<LogOut />} label="Sign Out" onClick={() => { signOut(); setMobileMenuOpen(false); }} red />
              </div>
            </>
          ) : (
            <MobileItem icon={<User />} label="Sign In / Create Account" onClick={() => { onSignInClick(); setMobileMenuOpen(false); }} />
          )}
          <div className="border-t py-2">
            <p className="px-4 py-1 text-xs font-bold text-gray-500 uppercase tracking-wide">Shop by Department</p>
            {DEPARTMENTS.map(d => (
              <MobileItem
                key={d}
                icon={<ChevronRight className="w-4 h-4" />}
                label={d}
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
      className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors text-left ${red ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-orange-50'}`}
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
