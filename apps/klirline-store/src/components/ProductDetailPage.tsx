import { useState, useEffect } from 'react';
import {
  ArrowLeft, Heart, ShoppingCart, Zap, Share2, Shield, Truck,
  RefreshCw, Star, ChevronLeft, ChevronRight, Plus, Minus, Check,
} from 'lucide-react';
import type { Product, Review } from '../lib/supabase';
import { supabase, BADGE_CONFIG, getDisplayPrice, getOriginalPrice, discountPct } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { StarRating } from './StarRating';
import { VerifiedSellerBadge } from './VerifiedSellerBadge';
import { ProductCard } from './ProductCard';
import { productAbsoluteUrl } from '../lib/routing';
import { labelDepartment } from '../lib/brand';
import { useI18n } from '../i18n';
import { applyHomeSeo, applyProductSeo } from '../lib/seo';

interface ProductDetailPageProps {
  product: Product;
  relatedProducts?: Product[];
  onBack: () => void;
  onAddToCart: (product: Product, quantity?: number) => void;
  onBuyNow: (product: Product, quantity: number) => void;
  onProductClick?: (product: Product) => void;
  wishlistedIds?: Set<string>;
  onWishlistToggle?: (product?: Product) => void | Promise<void>;
}

export const ProductDetailPage = ({
  product,
  relatedProducts = [],
  onBack,
  onAddToCart,
  onBuyNow,
  onProductClick,
  wishlistedIds,
  onWishlistToggle,
}: ProductDetailPageProps) => {
  const { user } = useAuth();
  const { locale } = useI18n();
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [inWishlist, setInWishlist] = useState(false);
  const [reviews, setReviews] = useState<(Review & { profiles?: { display_name: string | null } })[]>([]);
  const [userReview, setUserReview] = useState<{ rating: number; title: string; body: string } | null>(null);
  const [reviewDraft, setReviewDraft] = useState({ rating: 0, title: '', body: '' });
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [shareHint, setShareHint] = useState<string | null>(null);
  const [alertEmail, setAlertEmail] = useState('');
  const [alertStatus, setAlertStatus] = useState<'idle' | 'saving' | 'ok' | 'err'>('idle');
  const [alertMsg, setAlertMsg] = useState('');

  const allImages = [product.image_url, ...(product.images ?? [])].filter(Boolean);
  const displayPrice = getDisplayPrice(product);
  const originalPrice = getOriginalPrice(product);
  const pct = discountPct(product);
  const badge = product.badge ? BADGE_CONFIG[product.badge] : null;

  useEffect(() => {
    applyProductSeo({
      id: product.id,
      name: product.name,
      description: product.description,
      image_url: product.image_url,
      images: product.images,
      brand: product.brand,
      in_stock: product.in_stock,
      rating: product.rating,
      review_count: product.review_count,
      seller_shop_name: product.seller_shop_name,
      seller_department: product.seller_department,
      department: product.department,
      price: displayPrice,
      pageUrl: productAbsoluteUrl(product.id),
    });
    return () => {
      applyHomeSeo();
    };
  }, [product.id, product.name, product.description, product.image_url, product.images, product.brand, product.in_stock, product.rating, product.review_count, product.seller_shop_name, product.seller_department, product.department, displayPrice]);

  useEffect(() => {
    setQuantity(1);
    setSelectedImage(0);
    setSelectedVariants({});
    setAddedToCart(false);
  }, [product.id]);

  useEffect(() => {
    setInWishlist(Boolean(wishlistedIds?.has(product.id)));
  }, [product.id, wishlistedIds]);

  useEffect(() => {
    if (user?.email) setAlertEmail(user.email);
  }, [user?.email]);

  const subscribeStockAlert = async () => {
    const email = alertEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setAlertStatus('err');
      setAlertMsg('Email invalide.');
      return;
    }
    setAlertStatus('saving');
    const { error } = await supabase.from('stock_alerts').insert({
      product_id: product.id,
      email,
      user_id: user?.id ?? null,
    });
    if (error) {
      if (error.code === '23505') {
        setAlertStatus('ok');
        setAlertMsg('Vous êtes déjà inscrit pour cet article.');
      } else {
        setAlertStatus('err');
        setAlertMsg(error.message || 'Impossible d’enregistrer.');
      }
      return;
    }
    setAlertStatus('ok');
    setAlertMsg('On vous préviendra dès le retour en stock.');
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('reviews')
        .select('*, profiles(display_name)')
        .eq('product_id', product.id)
        .order('created_at', { ascending: false });
      if (data) setReviews(data);

      if (user) {
        const mine = data?.find(r => r.user_id === user.id);
        if (mine) {
          setUserReview({ rating: mine.rating, title: mine.title ?? '', body: mine.body ?? '' });
          setReviewDraft({ rating: mine.rating, title: mine.title ?? '', body: mine.body ?? '' });
        }
      }
    })();

    void supabase.rpc('increment_product_views' as never, { product_id: product.id } as never);
  }, [product.id, user]);

  const toggleWishlist = async () => {
    const next = !inWishlist;
    setInWishlist(next);
    try {
      await onWishlistToggle?.(product);
    } catch {
      setInWishlist(!next);
    }
  };

  const handleAddToCart = () => {
    onAddToCart(product, quantity);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleBuyNow = () => {
    onBuyNow(product, quantity);
  };

  const handleShare = async () => {
    const url = productAbsoluteUrl(product.id);
    const shareData = { title: product.name, text: `Voir sur KlirMarket : ${product.name}`, url };
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share(shareData);
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareHint('Lien copié');
      setTimeout(() => setShareHint(null), 2000);
    } catch {
      setShareHint('Partage annulé');
      setTimeout(() => setShareHint(null), 2000);
    }
  };

  const scrollToReviews = () => {
    document.getElementById('product-reviews')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const submitReview = async () => {
    if (!user || reviewDraft.rating === 0) return;
    setReviewLoading(true);
    await supabase.from('reviews').upsert({
      product_id: product.id,
      rating: reviewDraft.rating,
      title: reviewDraft.title || null,
      body: reviewDraft.body || null,
    }, { onConflict: 'product_id,user_id' });

    const { data } = await supabase
      .from('reviews')
      .select('*, profiles(display_name)')
      .eq('product_id', product.id)
      .order('created_at', { ascending: false });
    if (data) setReviews(data);
    setUserReview(reviewDraft);
    setShowReviewForm(false);
    setReviewLoading(false);
  };

  const dist = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
    pct: reviews.length ? Math.round((reviews.filter(r => r.rating === star).length / reviews.length) * 100) : 0,
  }));

  const prevImage = () => setSelectedImage(i => (i - 1 + allImages.length) % allImages.length);
  const nextImage = () => setSelectedImage(i => (i + 1) % allImages.length);

  const related = relatedProducts.filter(p => p.id !== product.id).slice(0, 8);

  return (
    <div className="min-h-screen bg-haiti-sand pb-24 lg:pb-0">
      <div className="bg-white border-b">
        <div className="max-w-[1500px] mx-auto px-4 py-2 flex items-center gap-2 text-sm text-gray-500">
          <button onClick={onBack} className="flex items-center gap-1 hover:text-brand transition-colors font-medium">
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>
          <span>/</span>
          {product.department && (
            <>
              <span className="text-gray-400">{labelDepartment(product.department, locale)}</span>
              <span>/</span>
            </>
          )}
          <span className="text-gray-700 truncate max-w-xs">{product.name}</span>
        </div>
      </div>

      <div className="max-w-[1500px] mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5">
            <div className="bg-white rounded-xl border border-gray-200 p-4 sticky top-24">
              <div className="relative aspect-square bg-gray-50 rounded-lg overflow-hidden mb-3">
                <img
                  src={allImages[selectedImage] ?? product.image_url}
                  alt={product.name}
                  className="w-full h-full object-contain p-4"
                />
                {allImages.length > 1 && (
                  <>
                    <button type="button" onClick={prevImage} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow flex items-center justify-center hover:bg-gray-50 transition-colors" aria-label="Image précédente">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={nextImage} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow flex items-center justify-center hover:bg-gray-50 transition-colors" aria-label="Image suivante">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </>
                )}
                {pct && pct > 0 && (
                  <span className="absolute top-3 left-3 bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded">
                    -{pct}%
                  </span>
                )}
              </div>

              {allImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {allImages.map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedImage(i)}
                      className={`flex-shrink-0 w-14 h-14 rounded-lg border-2 overflow-hidden transition-all ${
                        selectedImage === i ? 'border-brand' : 'border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-contain p-1" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4">
            {badge && (
              <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full ${badge.classes}`}>
                {badge.label}
              </span>
            )}

            <VerifiedSellerBadge
              shopName={product.seller_shop_name}
              verified={Boolean(product.seller_verified)}
              size="md"
              className="mb-1"
            />

            {!product.seller_shop_name && product.brand && (
              <p className="text-sm text-brand font-medium">{product.brand}</p>
            )}
            {product.seller_shop_name && product.brand && product.brand !== product.seller_shop_name && (
              <p className="text-sm text-gray-500">Marque · {product.brand}</p>
            )}

            <h1 className="text-2xl font-medium text-gray-900 leading-snug">{product.name}</h1>

            {product.rating > 0 && (
              <button type="button" onClick={scrollToReviews} className="flex items-center gap-3 pb-2 border-b border-gray-200 text-left w-full">
                <StarRating value={product.rating} size="md" />
                <span className="text-sm text-brand hover:underline">
                  {product.rating.toFixed(1)} · {product.review_count.toLocaleString('fr-HT')} avis
                </span>
              </button>
            )}

            <div className="space-y-1">
              {pct && pct > 0 && (
                <p className="text-sm text-red-600 font-semibold">{pct}% de réduction — offre limitée</p>
              )}
              <div className="flex items-baseline gap-3">
                <span className="text-sm text-gray-500">Prix :</span>
                <span className="text-3xl font-bold text-gray-900">
                  HTG {displayPrice.toLocaleString('fr-HT', { minimumFractionDigits: 0 })}
                </span>
              </div>
              {originalPrice && originalPrice > displayPrice && (
                <p className="text-sm text-gray-500">
                  Prix barré :{' '}
                  <span className="line-through">
                    HTG {originalPrice.toLocaleString('fr-HT', { minimumFractionDigits: 0 })}
                  </span>
                </p>
              )}
            </div>

            {(product.variants ?? []).map(variant => (
              <div key={variant.name}>
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  {variant.name} :{' '}
                  <span className="font-normal text-gray-500">{selectedVariants[variant.name] ?? 'Choisir'}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {variant.options.map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setSelectedVariants(s => ({ ...s, [variant.name]: opt }))}
                      className={`px-3 py-1.5 rounded border text-sm transition-all ${
                        selectedVariants[variant.name] === opt
                          ? 'border-brand bg-brand-50 text-brand-dark font-semibold'
                          : 'border-gray-300 text-gray-700 hover:border-brand'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {(product.about_items ?? []).length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Points clés</h3>
                <ul className="space-y-1">
                  {product.about_items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-2 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Description</h3>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{product.description}</p>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200 p-4 sticky top-24 space-y-4 hidden lg:block">
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  HTG {displayPrice.toLocaleString('fr-HT', { minimumFractionDigits: 0 })}
                </p>
                {pct ? <p className="text-xs text-red-600 font-medium">Économisez {pct}%</p> : null}
              </div>

              <div className="flex items-start gap-1.5 text-sm">
                <Truck className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">
                  Livraison selon votre département — frais calculés au paiement
                </span>
              </div>

              <p className={`text-sm font-semibold ${product.in_stock ? 'text-green-600' : 'text-red-600'}`}>
                {product.in_stock ? 'En stock' : 'Indisponible'}
              </p>

              {!product.in_stock && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
                  <p className="text-xs font-semibold text-amber-900">Me prévenir au retour</p>
                  <input
                    type="email"
                    value={alertEmail}
                    onChange={e => setAlertEmail(e.target.value)}
                    placeholder="votre@email.com"
                    className="w-full border border-amber-200 rounded-lg px-2.5 py-1.5 text-sm bg-white"
                  />
                  <button
                    type="button"
                    onClick={subscribeStockAlert}
                    disabled={alertStatus === 'saving'}
                    className="w-full py-2 rounded-full text-sm font-semibold bg-brand text-white hover:bg-brand-mid disabled:opacity-60"
                  >
                    {alertStatus === 'saving' ? 'Enregistrement…' : 'Me prévenir'}
                  </button>
                  {alertMsg && (
                    <p className={`text-xs ${alertStatus === 'err' ? 'text-red-600' : 'text-green-700'}`}>{alertMsg}</p>
                  )}
                </div>
              )}

              {product.in_stock && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Qté :</span>
                  <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                    <button type="button" onClick={() => setQuantity(q => Math.max(1, q - 1))} className="px-2 py-1 hover:bg-gray-100 transition-colors" aria-label="Diminuer">
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-3 py-1 text-sm font-semibold border-x border-gray-300">{quantity}</span>
                    <button type="button" onClick={() => setQuantity(q => Math.min(99, q + 1))} className="px-2 py-1 hover:bg-gray-100 transition-colors" aria-label="Augmenter">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!product.in_stock}
                className={`w-full py-2.5 rounded-full text-sm font-semibold transition-all shadow-sm ${
                  addedToCart
                    ? 'bg-green-500 text-white'
                    : 'bg-amber-400 hover:bg-amber-500 text-gray-900 disabled:bg-gray-200 disabled:text-gray-400'
                }`}
              >
                {addedToCart ? (
                  <span className="flex items-center justify-center gap-1.5"><Check className="w-4 h-4" /> Ajouté</span>
                ) : (
                  <span className="flex items-center justify-center gap-1.5">
                    <ShoppingCart className="w-4 h-4" /> Ajouter au panier
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={handleBuyNow}
                disabled={!product.in_stock}
                className="w-full py-2.5 rounded-full text-sm font-semibold bg-brand hover:bg-brand-mid text-white transition-colors shadow-sm disabled:bg-gray-200 disabled:text-gray-400"
              >
                <span className="flex items-center justify-center gap-1.5">
                  <Zap className="w-4 h-4" /> Acheter maintenant
                </span>
              </button>

              <button
                type="button"
                onClick={toggleWishlist}
                className={`w-full py-2 rounded-full text-sm font-medium border transition-all ${
                  inWishlist
                    ? 'border-red-300 text-red-600 bg-red-50 hover:bg-red-100'
                    : 'border-gray-300 text-gray-700 hover:border-gray-400'
                }`}
              >
                <span className="flex items-center justify-center gap-1.5">
                  <Heart className={`w-4 h-4 ${inWishlist ? 'fill-red-500' : ''}`} />
                  {inWishlist ? 'Dans la liste' : 'Ajouter à la liste'}
                </span>
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="w-full flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                <Share2 className="w-4 h-4" /> {shareHint ?? 'Partager'}
              </button>

              <div className="border-t pt-3 space-y-2 text-xs text-gray-600">
                <div className="flex items-start gap-1.5">
                  <Shield className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-brand" />
                  <span>Paiement sécurisé (MonCash, NatCash, carte). Fonds en séquestre jusqu’à confirmation de livraison.</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-brand" />
                  <span>Retours : contactez le support sous 48 h après livraison si l’article ne correspond pas.</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Produits similaires</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {related.map(p => (
                <ProductCard
                  key={p.id}
                  product={p}
                  onAddToCart={(prod) => onAddToCart(prod, 1)}
                  onClick={(prod) => onProductClick?.(prod)}
                  wishlisted={wishlistedIds?.has(p.id)}
                  onWishlistToggle={onWishlistToggle ? (prod) => onWishlistToggle(prod) : undefined}
                />
              ))}
            </div>
          </section>
        )}

        <div id="product-reviews" className="mt-10 bg-white rounded-xl border border-gray-200 p-6 scroll-mt-24">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Avis clients</h2>

          {reviews.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              <div className="lg:col-span-1">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-5xl font-bold">{product.rating.toFixed(1)}</span>
                  <div>
                    <StarRating value={product.rating} size="md" />
                    <p className="text-sm text-gray-500 mt-1">{reviews.length} avis</p>
                  </div>
                </div>
                {dist.map(d => (
                  <div key={d.star} className="flex items-center gap-2 mb-1">
                    <div className="flex items-center gap-0.5 w-16 flex-shrink-0">
                      {Array.from({ length: d.star }).map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-accent text-accent" />
                      ))}
                    </div>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div className="bg-accent h-2 rounded-full transition-all" style={{ width: `${d.pct}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 w-8 text-right">{d.pct}%</span>
                  </div>
                ))}
              </div>

              <div className="lg:col-span-2 space-y-5">
                {reviews.map(r => (
                  <div key={r.id} className="border-b pb-5 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-7 h-7 rounded-full bg-brand-50 flex items-center justify-center text-brand font-bold text-xs">
                        {(r.profiles?.display_name ?? 'A')[0].toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold text-gray-800">
                        {r.profiles?.display_name ?? 'Anonyme'}
                      </span>
                      {r.verified_purchase && (
                        <span className="text-xs text-green-700 bg-green-50 px-1.5 py-0.5 rounded font-medium">
                          Achat vérifié
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <StarRating value={r.rating} size="sm" />
                      {r.title && <span className="text-sm font-semibold text-gray-800">{r.title}</span>}
                    </div>
                    {r.body && <p className="text-sm text-gray-600 leading-relaxed">{r.body}</p>}
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(r.created_at).toLocaleDateString('fr-HT')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 mb-6">
              <Star className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-500">Pas encore d’avis. Soyez le premier !</p>
            </div>
          )}

          {user && (
            <div className="border-t pt-6">
              {!showReviewForm ? (
                <button
                  type="button"
                  onClick={() => setShowReviewForm(true)}
                  className="bg-amber-400 hover:bg-amber-500 text-gray-900 font-semibold px-6 py-2.5 rounded-full text-sm transition-colors shadow-sm"
                >
                  {userReview ? 'Modifier mon avis' : 'Écrire un avis'}
                </button>
              ) : (
                <div className="max-w-lg space-y-4">
                  <h3 className="font-bold text-gray-900">
                    {userReview ? 'Modifier mon avis' : 'Écrire un avis'}
                  </h3>
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Note globale</p>
                    <StarRating value={reviewDraft.rating} size="lg" interactive onChange={v => setReviewDraft(d => ({ ...d, rating: v }))} />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">Titre (optionnel)</label>
                    <input
                      type="text"
                      value={reviewDraft.title}
                      onChange={e => setReviewDraft(d => ({ ...d, title: e.target.value }))}
                      placeholder="Le point le plus important ?"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">Avis (optionnel)</label>
                    <textarea
                      value={reviewDraft.body}
                      onChange={e => setReviewDraft(d => ({ ...d, body: e.target.value }))}
                      rows={4}
                      placeholder="Partagez votre expérience…"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand resize-none"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={submitReview}
                      disabled={reviewDraft.rating === 0 || reviewLoading}
                      className="bg-amber-400 hover:bg-amber-500 disabled:bg-gray-200 disabled:text-gray-400 text-gray-900 font-semibold px-6 py-2.5 rounded-full text-sm transition-colors"
                    >
                      {reviewLoading ? 'Enregistrement…' : 'Publier'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowReviewForm(false)}
                      className="border border-gray-300 text-gray-700 px-5 py-2.5 rounded-full text-sm hover:bg-gray-50 transition-colors"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sticky mobile buy bar */}
      {product.in_stock && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-gray-200 bg-white/95 backdrop-blur px-4 py-3 safe-pb">
          <div className="flex items-center gap-3 max-w-[1500px] mx-auto">
            <div className="flex-1 min-w-0">
              <p className="text-lg font-bold text-gray-900 truncate">
                HTG {displayPrice.toLocaleString('fr-HT', { minimumFractionDigits: 0 })}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <button type="button" onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-7 h-7 border rounded flex items-center justify-center" aria-label="Diminuer">
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-sm font-semibold w-6 text-center">{quantity}</span>
                <button type="button" onClick={() => setQuantity(q => Math.min(99, q + 1))} className="w-7 h-7 border rounded flex items-center justify-center" aria-label="Augmenter">
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={handleAddToCart}
              className="px-3 py-2.5 rounded-full bg-amber-400 text-gray-900 text-sm font-semibold"
            >
              Panier
            </button>
            <button
              type="button"
              onClick={handleBuyNow}
              className="px-4 py-2.5 rounded-full bg-brand text-white text-sm font-semibold"
            >
              Acheter
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
