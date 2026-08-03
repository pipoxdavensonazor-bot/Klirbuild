import { ChevronRight, Sparkles, Flame, Clock3, Tag, MapPin, Smartphone } from 'lucide-react';
import type { Product } from '../lib/supabase';
import { HAITI_DEPARTMENTS } from '../lib/supabase';
import { ProductCard } from './ProductCard';
import { getPersonalizedRails } from '../lib/activity';
import { useI18n } from '../i18n';
import { BRAND, labelDepartment } from '../lib/brand';
import { HAITI_MONUMENTS, HAITI_MONUMENT_CREDIT } from '../lib/haiti-media';

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
  seeAllLabel,
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
  seeAllLabel?: string;
}) {
  if (!loading && products.length === 0) return null;

  return (
    <section className="bg-white/90 backdrop-blur-sm rounded-xl border border-white/60 overflow-hidden">
      <div className="flex items-end justify-between gap-3 px-4 sm:px-5 pt-4 pb-2">
        <div>
          <h2 className="font-display text-lg sm:text-xl font-semibold text-brand-dark flex items-center gap-2">
            {icon}
            {title}
          </h2>
          {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {onSeeAll && seeAllLabel && (
          <button
            onClick={onSeeAll}
            className="text-sm font-semibold text-brand hover:text-accent whitespace-nowrap flex items-center gap-0.5"
          >
            {seeAllLabel} <ChevronRight className="w-4 h-4" />
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
  const { t, locale } = useI18n();
  const rails = getPersonalizedRails(products);

  const depts = [
    { label: t('navElectronics'), dept: 'Electronics' },
    { label: t('navFashion'), dept: 'Clothing & Fashion' },
    { label: t('navHome'), dept: 'Home & Kitchen' },
    { label: t('navBooks'), dept: 'Books' },
    { label: t('navSports'), dept: 'Sports & Outdoors' },
  ];

  const vendors = Array.from(
    new Map(
      products
        .filter(p => p.brand && p.seller_department)
        .map(p => [p.brand!, { brand: p.brand!, dept: p.seller_department! }]),
    ).values(),
  ).slice(0, 8);

  return (
    <div className="space-y-5">
      {/* Full-bleed Citadelle La Ferrière hero */}
      <div className="relative overflow-hidden rounded-2xl min-h-[340px] sm:min-h-[420px] text-white">
        <img
          src={HAITI_MONUMENTS.citadelleHero}
          alt={HAITI_MONUMENT_CREDIT.citadelle}
          className="absolute inset-0 w-full h-full object-cover object-[center_35%]"
          fetchPriority="high"
        />
        <div className="absolute inset-0 haiti-hero-wash pointer-events-none" />
        <div className="haiti-flag-bar absolute top-0 left-0 right-0 z-10" />
        <div className="relative z-10 grid lg:grid-cols-[1.25fr_0.75fr] gap-6 p-6 sm:p-8 lg:p-10">
          <div>
            <span className="inline-block bg-accent text-brand-dark text-[11px] font-bold px-3 py-1 rounded-sm mb-3 uppercase tracking-wide">
              {BRAND.product} · {BRAND.market}
            </span>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold leading-tight mb-3">
              {rails.hasPersonalSignal ? t('heroPersonalTitle') : t('heroDefaultTitle')}
            </h1>
            <p className="text-slate-200 text-sm sm:text-base max-w-xl mb-5">
              {rails.hasPersonalSignal ? t('heroPersonalSub') : t('heroDefaultSub')}
            </p>
            <div className="flex flex-wrap gap-3 mb-5">
              <button
                onClick={onBrowseAll}
                className="bg-accent hover:bg-accent-hover text-brand-dark px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors"
              >
                {t('shopAll')}
              </button>
              {!signedIn && (
                <button
                  onClick={onSignUp}
                  className="bg-white/10 hover:bg-white/20 border border-white/30 text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors"
                >
                  {t('createAccount')}
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-4 text-xs sm:text-sm text-slate-200/90">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-accent" /> 10 départements
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-accent" /> Digicel MonCash
              </span>
            </div>
            <p className="mt-4 text-[11px] text-slate-300/90 tracking-wide">
              {HAITI_MONUMENT_CREDIT.citadelle} · UNESCO
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 content-center">
            {depts.map(d => (
              <button
                key={d.dept}
                onClick={() => onDeptClick(d.dept)}
                className="text-left bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl px-4 py-3 transition-colors backdrop-blur-sm"
              >
                <p className="text-xs text-slate-300">{t('shop')}</p>
                <p className="font-semibold text-sm sm:text-base">{d.label}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Second monument strip — Sans-Souci */}
      <div className="relative overflow-hidden rounded-xl min-h-[88px] sm:min-h-[100px]">
        <img
          src={HAITI_MONUMENTS.sansSouci}
          alt={HAITI_MONUMENT_CREDIT.sansSouci}
          className="absolute inset-0 w-full h-full object-cover object-[center_40%]"
        />
        <div className="absolute inset-0 bg-brand-dark/75" />
        <div className="relative flex flex-wrap items-center justify-between gap-3 px-4 py-4 text-white text-sm">
          <p className="font-medium">
            <span className="text-accent font-semibold">Séquestre Klirline</span>
            {' · '}commission 8 % · livraison par département
          </p>
          <p className="text-[11px] text-slate-300">{HAITI_MONUMENT_CREDIT.sansSouci}</p>
          <div className="flex gap-1.5 overflow-x-auto max-w-full w-full sm:w-auto">
            {HAITI_DEPARTMENTS.slice(0, 6).map(d => (
              <span key={d} className="flex-shrink-0 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-sm bg-white/10">
                {d}
              </span>
            ))}
            <span className="flex-shrink-0 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-sm bg-accent/20 text-accent">
              +4
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {depts.map(d => (
          <button
            key={d.dept}
            onClick={() => onDeptClick(d.dept)}
            className="flex-shrink-0 px-4 py-2 rounded-full bg-white border border-slate-200 text-sm font-medium text-slate-800 hover:border-brand hover:text-brand transition-colors"
          >
            {d.label}
          </button>
        ))}
        <button
          onClick={onBrowseAll}
          className="flex-shrink-0 px-4 py-2 rounded-full bg-brand text-white text-sm font-semibold hover:bg-brand-mid transition-colors"
        >
          {t('allDeals')}
        </button>
      </div>

      {!loading && vendors.length > 0 && (
        <section className="bg-white/90 rounded-xl border border-white/60 px-4 sm:px-5 py-4">
          <h2 className="font-display text-lg font-semibold text-brand-dark mb-1">Vendeurs à travers Haïti</h2>
          <p className="text-sm text-slate-500 mb-3">Boutiques locales — payez en HTG via MonCash</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {vendors.map(v => (
              <div
                key={v.brand}
                className="flex-shrink-0 min-w-[140px] rounded-lg border border-slate-200 bg-haiti-sand/40 px-3 py-2.5"
              >
                <p className="text-sm font-semibold text-brand-dark truncate">{v.brand}</p>
                <p className="text-[11px] text-brand flex items-center gap-0.5 mt-0.5">
                  <MapPin className="w-3 h-3" /> {v.dept}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {loading ? (
        <ProductRail
          title={t('loadingStore')}
          loading
          products={[]}
          onAddToCart={onAddToCart}
          onProductClick={onProductClick}
          wishlisted={wishlisted}
          onWishlistToggle={onWishlistToggle}
        />
      ) : (
        <>
          {rails.sponsored.length > 0 && (
            <ProductRail
              title="Sponsorisé"
              subtitle="Produits mis en avant par des vendeurs Klirline Sponsored"
              icon={<Sparkles className="w-5 h-5 text-amber-500" />}
              products={rails.sponsored}
              onAddToCart={onAddToCart}
              onProductClick={onProductClick}
              wishlisted={wishlisted}
              onWishlistToggle={onWishlistToggle}
              onSeeAll={onBrowseAll}
              seeAllLabel={t('seeAll')}
            />
          )}

          {rails.continueBrowsing.length > 0 && (
            <ProductRail
              title={t('continueBrowsing')}
              subtitle={t('continueBrowsingSub')}
              icon={<Clock3 className="w-5 h-5 text-brand" />}
              products={rails.continueBrowsing}
              onAddToCart={onAddToCart}
              onProductClick={onProductClick}
              wishlisted={wishlisted}
              onWishlistToggle={onWishlistToggle}
              seeAllLabel={t('seeAll')}
            />
          )}

          <ProductRail
            title={rails.hasPersonalSignal ? t('recommended') : t('popularNow')}
            subtitle={rails.hasPersonalSignal ? t('recommendedSub') : t('popularNowSub')}
            icon={<Sparkles className="w-5 h-5 text-accent" />}
            products={rails.recommended.length ? rails.recommended : rails.bestSellers}
            onAddToCart={onAddToCart}
            onProductClick={onProductClick}
            wishlisted={wishlisted}
            onWishlistToggle={onWishlistToggle}
            onSeeAll={onBrowseAll}
            seeAllLabel={t('seeAll')}
          />

          {rails.deals.length > 0 && (
            <ProductRail
              title={t('dealsTitle')}
              subtitle={t('dealsSub')}
              icon={<Tag className="w-5 h-5 text-haiti-red" />}
              products={rails.deals}
              onAddToCart={onAddToCart}
              onProductClick={onProductClick}
              wishlisted={wishlisted}
              onWishlistToggle={onWishlistToggle}
              onSeeAll={onBrowseAll}
              seeAllLabel={t('seeAll')}
            />
          )}

          <ProductRail
            title={t('bestSellers')}
            subtitle={t('bestSellersSub')}
            icon={<Flame className="w-5 h-5 text-brand" />}
            products={rails.bestSellers}
            onAddToCart={onAddToCart}
            onProductClick={onProductClick}
            wishlisted={wishlisted}
            onWishlistToggle={onWishlistToggle}
            seeAllLabel={t('seeAll')}
          />

          {rails.deptRails.map(rail => (
            <ProductRail
              key={rail.department}
              title={`${t('moreInDept')} ${labelDepartment(rail.department, locale)}`}
              subtitle={t('moreInDeptSub')}
              products={rail.products}
              onAddToCart={onAddToCart}
              onProductClick={onProductClick}
              wishlisted={wishlisted}
              onWishlistToggle={onWishlistToggle}
              onSeeAll={() => onDeptClick(rail.department)}
              seeAllLabel={t('seeAll')}
            />
          ))}
        </>
      )}
    </div>
  );
}
