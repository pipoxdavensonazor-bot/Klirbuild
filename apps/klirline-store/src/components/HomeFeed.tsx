import { ChevronRight, Sparkles, Flame, Clock3, Tag } from 'lucide-react';
import type { Product } from '../lib/supabase';
import { ProductCard } from './ProductCard';
import { getPersonalizedRails } from '../lib/activity';

interface HomeFeedProps {
  products: Product[];
  loading: boolean;
  onAddToCart: (product: Product) => void;
  onProductClick: (product: Product) => void;
  onDeptClick: (dept: string) => void;
  onBrowseAll: () => void;
  onSignUp: () => void;
  wishlisted: Set<string>;
  onWishlistToggle: (product: Product) => void;
  signedIn: boolean;
}

function SkeletonCard() {
  return (
    <div className="min-w-[180px] w-[180px] sm:min-w-[200px] sm:w-[200px] bg-white rounded-lg border border-gray-100 p-3 animate-pulse">
      <div className="aspect-square bg-gray-100 rounded mb-3" />
      <div className="h-3 bg-gray-100 rounded w-3/4 mb-2" />
      <div className="h-3 bg-gray-100 rounded w-1/2 mb-3" />
      <div className="h-8 bg-gray-100 rounded" />
    </div>
  );
}

function ProductRail({
  title,
  subtitle,
  icon,
  products,
  loading,
  onAddToCart,
  onProductClick,
  wishlisted,
  onWishlistToggle,
  onSeeAll,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  products: Product[];
  loading?: boolean;
  onAddToCart: (p: Product) => void;
  onProductClick: (p: Product) => void;
  wishlisted: Set<string>;
  onWishlistToggle: (p: Product) => void;
  onSeeAll?: () => void;
}) {
  if (!loading && products.length === 0) return null;

  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-end justify-between gap-3 px-4 sm:px-5 pt-4 pb-2">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
            {icon}
            {title}
          </h2>
          {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        {onSeeAll && (
          <button
            onClick={onSeeAll}
            className="text-sm font-semibold text-brand hover:text-accent whitespace-nowrap flex items-center gap-0.5"
          >
            See all <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="flex gap-3 overflow-x-auto px-4 sm:px-5 pb-5 pt-1 scrollbar-thin">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : products.map(p => (
              <div key={p.id} className="min-w-[180px] w-[180px] sm:min-w-[200px] sm:w-[200px] flex-shrink-0">
                <ProductCard
                  product={p}
                  onAddToCart={onAddToCart}
                  onClick={onProductClick}
                  wishlisted={wishlisted.has(p.id)}
                  onWishlistToggle={onWishlistToggle}
                />
              </div>
            ))}
      </div>
    </section>
  );
}

const QUICK_DEPTS = [
  { label: 'Electronics', dept: 'Electronics' },
  { label: 'Fashion', dept: 'Clothing & Fashion' },
  { label: 'Home', dept: 'Home & Kitchen' },
  { label: 'Books', dept: 'Books' },
  { label: 'Sports', dept: 'Sports & Outdoors' },
];

export function HomeFeed({
  products,
  loading,
  onAddToCart,
  onProductClick,
  onDeptClick,
  onBrowseAll,
  onSignUp,
  wishlisted,
  onWishlistToggle,
  signedIn,
}: HomeFeedProps) {
  const rails = getPersonalizedRails(products);

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-dark via-brand-mid to-brand text-white shadow-xl">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-accent via-transparent to-transparent" />
        <div className="relative grid lg:grid-cols-[1.2fr_0.8fr] gap-6 p-6 sm:p-8 lg:p-10">
          <div>
            <span className="inline-block bg-accent text-brand-dark text-[11px] font-bold px-3 py-1 rounded-full mb-3 uppercase tracking-wide">
              Klirline Store · Haiti
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight mb-3">
              {rails.hasPersonalSignal
                ? 'Picked for you — shop faster'
                : 'Shop & Pay with MonCash'}
            </h1>
            <p className="text-slate-200 text-sm sm:text-base max-w-xl mb-5">
              {rails.hasPersonalSignal
                ? 'Your homepage updates from what you browse, add to cart, and buy — so the next click is closer.'
                : "Browse curated products and pay securely with Digicel MonCash — Haiti's trusted mobile payment."}
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={onBrowseAll}
                className="bg-accent hover:bg-accent-hover text-brand-dark px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors"
              >
                Shop all products
              </button>
              {!signedIn && (
                <button
                  onClick={onSignUp}
                  className="bg-white/10 hover:bg-white/20 border border-white/30 text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors"
                >
                  Create free account
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 content-center">
            {QUICK_DEPTS.map(d => (
              <button
                key={d.dept}
                onClick={() => onDeptClick(d.dept)}
                className="text-left bg-white/10 hover:bg-white/20 border border-white/15 rounded-xl px-4 py-3 transition-colors"
              >
                <p className="text-xs text-slate-300">Shop</p>
                <p className="font-bold text-sm sm:text-base">{d.label}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {QUICK_DEPTS.map(d => (
          <button
            key={d.dept}
            onClick={() => onDeptClick(d.dept)}
            className="flex-shrink-0 px-4 py-2 rounded-full bg-white border border-gray-200 text-sm font-medium text-gray-800 hover:border-brand hover:text-brand transition-colors shadow-sm"
          >
            {d.label}
          </button>
        ))}
        <button
          onClick={onBrowseAll}
          className="flex-shrink-0 px-4 py-2 rounded-full bg-brand text-white text-sm font-semibold hover:bg-brand-mid transition-colors"
        >
          All deals
        </button>
      </div>

      {loading ? (
        <ProductRail
          title="Loading your store…"
          loading
          products={[]}
          onAddToCart={onAddToCart}
          onProductClick={onProductClick}
          wishlisted={wishlisted}
          onWishlistToggle={onWishlistToggle}
        />
      ) : (
        <>
          {rails.continueBrowsing.length > 0 && (
            <ProductRail
              title="Continue browsing"
              subtitle="Pick up where you left off"
              icon={<Clock3 className="w-5 h-5 text-brand" />}
              products={rails.continueBrowsing}
              onAddToCart={onAddToCart}
              onProductClick={onProductClick}
              wishlisted={wishlisted}
              onWishlistToggle={onWishlistToggle}
            />
          )}

          <ProductRail
            title={rails.hasPersonalSignal ? 'Recommended for you' : 'Popular right now'}
            subtitle={
              rails.hasPersonalSignal
                ? 'Ranked from your recent activity on this device'
                : 'Top-rated picks across Haiti'
            }
            icon={<Sparkles className="w-5 h-5 text-accent" />}
            products={rails.recommended.length ? rails.recommended : rails.bestSellers}
            onAddToCart={onAddToCart}
            onProductClick={onProductClick}
            wishlisted={wishlisted}
            onWishlistToggle={onWishlistToggle}
            onSeeAll={onBrowseAll}
          />

          {rails.deals.length > 0 && (
            <ProductRail
              title="Today's deals"
              subtitle="Limited-time savings in HTG"
              icon={<Tag className="w-5 h-5 text-red-600" />}
              products={rails.deals}
              onAddToCart={onAddToCart}
              onProductClick={onProductClick}
              wishlisted={wishlisted}
              onWishlistToggle={onWishlistToggle}
              onSeeAll={onBrowseAll}
            />
          )}

          <ProductRail
            title="Best sellers"
            subtitle="Most reviewed by shoppers"
            icon={<Flame className="w-5 h-5 text-orange-500" />}
            products={rails.bestSellers}
            onAddToCart={onAddToCart}
            onProductClick={onProductClick}
            wishlisted={wishlisted}
            onWishlistToggle={onWishlistToggle}
          />

          {rails.deptRails.map(rail => (
            <ProductRail
              key={rail.department}
              title={`More in ${rail.department}`}
              subtitle="Based on departments you explore"
              products={rail.products}
              onAddToCart={onAddToCart}
              onProductClick={onProductClick}
              wishlisted={wishlisted}
              onWishlistToggle={onWishlistToggle}
              onSeeAll={() => onDeptClick(rail.department)}
            />
          ))}
        </>
      )}
    </div>
  );
}
