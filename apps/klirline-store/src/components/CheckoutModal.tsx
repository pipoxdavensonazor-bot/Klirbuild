import { useEffect, useState } from 'react';
import {
  X, ShoppingBag, CheckCircle, AlertCircle, ExternalLink, Smartphone,
  ArrowRight, MapPin, CreditCard,
} from 'lucide-react';
import { HAITI_DEPARTMENTS, type Address, type CartItem, type Product } from '../lib/supabase';
import { getDisplayPrice, supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { KLIRLINE_COMMISSION_RATE, formatHtg, getShippingFee } from '../lib/commerce';
import { PAYMENTS } from '../lib/brand';
import { useI18n } from '../i18n';
import { orderPaidWhatsAppUrl } from '../lib/whatsapp';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: (CartItem & { product: Product })[];
  cartTotal: number;
  onSuccess: () => void;
  /** Returning from Stripe Checkout */
  stripeReturn?: { orderId: string; sessionId: string | null; guestToken?: string | null } | null;
  onStripeReturnHandled?: () => void;
  /** Returning from NatCash callback */
  natcashReturn?: { orderId: string; guestToken?: string | null } | null;
  onNatcashReturnHandled?: () => void;
  /** Resume MonCash/NatCash after same-window redirect */
  walletResume?: { orderId: string; method: 'moncash' | 'natcash' } | null;
  onWalletResumeHandled?: () => void;
}

type Step = 'summary' | 'processing' | 'awaiting' | 'success' | 'error';
type PayMethod = 'moncash' | 'stripe' | 'natcash';

type ShipForm = {
  shipping_full_name: string;
  shipping_phone: string;
  shipping_street: string;
  shipping_city: string;
  shipping_department: string;
};

const EMPTY_SHIP: ShipForm = {
  shipping_full_name: '',
  shipping_phone: '',
  shipping_street: '',
  shipping_city: '',
  shipping_department: '',
};

/** Display estimate — server uses STRIPE_HTG_PER_USD (default 132). */
const HTG_PER_USD_HINT = 132;

export const CheckoutModal = ({
  isOpen,
  onClose,
  cartItems,
  cartTotal,
  onSuccess,
  stripeReturn = null,
  onStripeReturnHandled,
  natcashReturn = null,
  onNatcashReturnHandled,
  walletResume = null,
  onWalletResumeHandled,
}: CheckoutModalProps) => {
  const { session, user } = useAuth();
  const { t, locale } = useI18n();
  const [step, setStep] = useState<Step>('summary');
  const [errorMsg, setErrorMsg] = useState('');
  const [orderId, setOrderId] = useState('');
  const [ship, setShip] = useState<ShipForm>(EMPTY_SHIP);
  const [waSellerUrl, setWaSellerUrl] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState<PayMethod>(
    PAYMENTS.moncash ? 'moncash' : 'stripe',
  );
  const [guestEmail, setGuestEmail] = useState('');
  const [guestToken, setGuestToken] = useState<string | null>(null);

  const shippingFee = getShippingFee(ship.shipping_department);
  const grandTotal = cartTotal + shippingFee;
  const usdEstimate = (grandTotal / HTG_PER_USD_HINT).toFixed(2);

  useEffect(() => {
    if (!isOpen || !user) return;
    (async () => {
      const { data } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        const a = data as Address;
        setShip({
          shipping_full_name: a.full_name || '',
          shipping_phone: a.phone || '',
          shipping_street: a.street || '',
          shipping_city: a.city || '',
          shipping_department: a.state_dept || '',
        });
      }
    })();
  }, [isOpen, user]);

  // Complete Stripe return (auth or guest token)
  useEffect(() => {
    if (!isOpen || !stripeReturn?.orderId) return;
    const token = stripeReturn.guestToken || guestToken || sessionStorage.getItem('klirline_guest_token');
    if (!session && !token) return;
    let cancelled = false;
    (async () => {
      setOrderId(stripeReturn.orderId);
      setPayMethod('stripe');
      setStep('processing');
      try {
        const headers: HeadersInit = {
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        };
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout/verify`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({
              orderId: stripeReturn.orderId,
              sessionId: stripeReturn.sessionId,
              guestToken: token,
            }),
          },
        );
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && data.success) {
          sessionStorage.removeItem('klirline_guest_token');
          await afterPaidSuccess(stripeReturn.orderId);
        } else {
          setErrorMsg(data.error || 'Paiement Stripe non confirmé.');
          setStep('error');
        }
      } catch (e) {
        if (!cancelled) {
          setErrorMsg(e instanceof Error ? e.message : 'Erreur vérification Stripe');
          setStep('error');
        }
      } finally {
        onStripeReturnHandled?.();
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, stripeReturn, session]);

  // Complete NatCash return (callback redirect)
  useEffect(() => {
    if (!isOpen || !natcashReturn?.orderId) return;
    const token = natcashReturn.guestToken || guestToken || sessionStorage.getItem('klirline_guest_token');
    if (!session && !token) return;
    let cancelled = false;
    (async () => {
      setOrderId(natcashReturn.orderId);
      setPayMethod('natcash');
      setStep('processing');
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/natcash-payment/verify`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ orderId: natcashReturn.orderId, guestToken: token }),
          },
        );
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && data.success) {
          sessionStorage.removeItem('klirline_guest_token');
          await afterPaidSuccess(natcashReturn.orderId);
        } else {
          setErrorMsg(data.error || 'Paiement NatCash non confirmé.');
          setStep('error');
        }
      } catch (e) {
        if (!cancelled) {
          setErrorMsg(e instanceof Error ? e.message : 'Erreur vérification NatCash');
          setStep('error');
        }
      } finally {
        onNatcashReturnHandled?.();
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, natcashReturn, session]);

  // Resume wallet payment after same-window MonCash/NatCash redirect
  useEffect(() => {
    if (!isOpen || !walletResume?.orderId) return;
    setOrderId(walletResume.orderId);
    setPayMethod(walletResume.method);
    setGuestToken(sessionStorage.getItem('klirline_guest_token'));
    setStep('awaiting');
    onWalletResumeHandled?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, walletResume]);

  if (!isOpen) return null;

  const handleClose = () => {
    if (step === 'success') onSuccess();
    sessionStorage.removeItem('klirline_pending_wallet');
    setStep('summary');
    setErrorMsg('');
    setOrderId('');
    onClose();
  };

  const setShipField = (k: keyof ShipForm, v: string) => setShip(s => ({ ...s, [k]: v }));

  const validateShip = (): string => {
    if (!user) {
      const email = guestEmail.trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return 'Email obligatoire pour payer sans compte.';
      }
    }
    if (!ship.shipping_full_name.trim()) return 'Nom du destinataire obligatoire.';
    if (!ship.shipping_phone.trim()) return 'Téléphone de livraison obligatoire.';
    if (!ship.shipping_street.trim()) return 'Adresse (rue) obligatoire.';
    if (!ship.shipping_city.trim()) return 'Ville obligatoire.';
    if (!ship.shipping_department) return 'Département obligatoire.';
    return '';
  };

  const payHeaders = (): HeadersInit => ({
    Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
    'Content-Type': 'application/json',
  });

  const afterPaidSuccess = async (paidOrderId: string) => {
    try {
      const sellerIds = [
        ...new Set(
          cartItems
            .map(i => i.product.seller_id)
            .filter((id): id is string => Boolean(id)),
        ),
      ];
      if (sellerIds.length) {
        const { data: apps } = await supabase
          .from('vendor_applications')
          .select('business_phone, user_id')
          .eq('status', 'approved')
          .in('user_id', sellerIds)
          .limit(1);
        const phone = apps?.[0]?.business_phone;
        setWaSellerUrl(
          orderPaidWhatsAppUrl({
            sellerPhone: phone,
            orderId: paidOrderId,
            city: ship.shipping_city,
            locale,
          }),
        );
      }
    } catch { /* ignore */ }
    setStep('success');
  };

  const createPendingOrder = async (): Promise<{ orderId: string; guestToken: string | null }> => {
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/checkout-create`,
      {
        method: 'POST',
        headers: payHeaders(),
        body: JSON.stringify({
          items: cartItems.map(item => ({
            product_id: item.product_id,
            quantity: item.quantity,
          })),
          payment_method: payMethod,
          guest_email: user ? undefined : guestEmail.trim().toLowerCase(),
          shipping_full_name: ship.shipping_full_name.trim(),
          shipping_phone: ship.shipping_phone.trim(),
          shipping_street: ship.shipping_street.trim(),
          shipping_city: ship.shipping_city.trim(),
          shipping_department: ship.shipping_department,
        }),
      },
    );
    const data = await res.json();
    if (!res.ok || !data.orderId) {
      throw new Error(data.error || 'Impossible de créer la commande.');
    }
    const token = (data.guestToken as string | null) ?? null;
    if (token) {
      setGuestToken(token);
      sessionStorage.setItem('klirline_guest_token', token);
    }
    return { orderId: data.orderId as string, guestToken: token };
  };

  const initiatePayment = async () => {
    const shipErr = validateShip();
    if (shipErr) {
      setErrorMsg(shipErr);
      return;
    }

    setStep('processing');
    setErrorMsg('');

    try {
      const { orderId: newOrderId, guestToken: token } = await createPendingOrder();
      setOrderId(newOrderId);

      if (payMethod === 'stripe') {
        const origin = window.location.origin;
        // guest_token stays in sessionStorage only — never in the return URL
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout/create`,
          {
            method: 'POST',
            headers: payHeaders(),
            body: JSON.stringify({
              orderId: newOrderId,
              guestToken: token,
              successUrl: `${origin}/?checkout=stripe_success&order_id=${newOrderId}&session_id={CHECKOUT_SESSION_ID}`,
              cancelUrl: `${origin}/?checkout=stripe_cancel&order_id=${newOrderId}`,
            }),
          },
        );
        const payData = await res.json();
        if (!res.ok || payData.error || !payData.checkoutUrl) {
          throw new Error(payData.error || 'Échec d’initialisation Stripe.');
        }
        window.location.href = payData.checkoutUrl as string;
        return;
      }

      const fn =
        payMethod === 'natcash' ? 'natcash-payment/create' : 'moncash-payment/create';
      const label = payMethod === 'natcash' ? 'NatCash' : 'MonCash';

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${fn}`,
        {
          method: 'POST',
          headers: payHeaders(),
          body: JSON.stringify({ orderId: newOrderId, guestToken: token }),
        },
      );

      const payData = await res.json();
      if (!res.ok || payData.error) {
        throw new Error(payData.error || `Échec d’initialisation ${label}.`);
      }

      const { paymentUrl } = payData;
      // Same-window redirect (Capacitor-safe). Token already in sessionStorage.
      sessionStorage.setItem(
        'klirline_pending_wallet',
        JSON.stringify({ orderId: newOrderId, method: payMethod }),
      );
      window.location.href = paymentUrl as string;
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur inattendue.');
      setStep('error');
    }
  };

  const confirmPayment = async () => {
    setStep('processing');
    try {
      const fn =
        payMethod === 'natcash' ? 'natcash-payment/verify' : 'moncash-payment/verify';
      const label = payMethod === 'natcash' ? 'NatCash' : 'MonCash';
      const token = guestToken || sessionStorage.getItem('klirline_guest_token');

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${fn}`,
        {
          method: 'POST',
          headers: payHeaders(),
          body: JSON.stringify({ orderId, guestToken: token }),
        },
      );

      const verifyData = await res.json();
      if (res.ok && verifyData.success) {
        sessionStorage.removeItem('klirline_guest_token');
        sessionStorage.removeItem('klirline_pending_wallet');
        await afterPaidSuccess(orderId);
        return;
      }

      throw new Error(
        verifyData.error ||
          `Paiement non confirmé. Terminez sur ${label}, puis réessayez.`,
      );
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Échec de vérification.');
      setStep('error');
    }
  };

  const walletLabel = payMethod === 'natcash' ? 'NatCash' : 'MonCash';
  const isWallet = payMethod === 'moncash' || payMethod === 'natcash';

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm" onClick={step === 'summary' ? handleClose : undefined} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden pointer-events-auto max-h-[92vh] overflow-y-auto">

          <div className="bg-brand-dark text-white px-6 py-5 flex items-center justify-between sticky top-0">
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-6 h-6 text-accent" />
              <h2 className="text-xl font-bold">Paiement</h2>
            </div>
            {step !== 'processing' && (
              <button onClick={handleClose} className="text-slate-400 hover:text-accent transition-colors">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {step === 'summary' && (
            <div className="p-6">
              {errorMsg && (
                <div className="flex gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm mb-4">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {errorMsg}
                </div>
              )}

              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Résumé</h3>
              <div className="space-y-3 mb-5 max-h-40 overflow-y-auto">
                {cartItems.map(item => {
                  const unit = getDisplayPrice(item.product);
                  return (
                    <div key={item.id} className="flex items-center gap-3">
                      <img src={item.product.image_url} alt={item.product.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{item.product.name}</p>
                        <p className="text-xs text-gray-500">Qté : {item.quantity}</p>
                      </div>
                      <p className="text-sm font-semibold text-slate-800">
                        {formatHtg(unit * item.quantity)}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="border border-gray-200 rounded-xl p-4 mb-5 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="w-4 h-4 text-brand" />
                  <p className="text-sm font-semibold text-slate-800">Adresse de livraison</p>
                </div>
                {!user && (
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Email (reçu de commande)</label>
                    <input
                      type="email"
                      value={guestEmail}
                      onChange={e => setGuestEmail(e.target.value)}
                      placeholder="vous@email.com"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">Paiement sans compte — un email suffit.</p>
                  </div>
                )}
                {(
                  [
                    ['shipping_full_name', 'Nom complet', 'text'],
                    ['shipping_phone', 'Téléphone +509', 'tel'],
                    ['shipping_street', 'Rue / adresse', 'text'],
                    ['shipping_city', 'Ville', 'text'],
                  ] as [keyof ShipForm, string, string][]
                ).map(([key, label, type]) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{label} *</label>
                    <input
                      type={type}
                      value={ship[key]}
                      onChange={e => setShipField(key, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Département *</label>
                  <select
                    value={ship.shipping_department}
                    onChange={e => setShipField('shipping_department', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand"
                  >
                    <option value="">Choisir…</option>
                    {HAITI_DEPARTMENTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 mb-4 space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">{t('subtotal')}</span>
                  <span className="font-medium">{formatHtg(cartTotal)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">{t('shippingFee')}</span>
                  <span className="font-medium">{formatHtg(shippingFee)}</span>
                </div>
                <p className="text-[11px] text-gray-500">{t('zoneHint')}</p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-base font-semibold text-slate-700">{t('total')}</span>
                  <span className="text-2xl font-bold text-slate-900">{formatHtg(grandTotal)}</span>
                </div>
                <p className="text-[11px] text-gray-500 mt-2">
                  Séquestre KlirMarket (commission {Math.round(KLIRLINE_COMMISSION_RATE * 100)} %)
                  jusqu’à confirmation de livraison.
                </p>
              </div>

              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Mode de paiement</p>
              <div className="space-y-2 mb-5">
                <button
                  type="button"
                  disabled={!PAYMENTS.moncash}
                  onClick={() => PAYMENTS.moncash && setPayMethod('moncash')}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-colors ${
                    !PAYMENTS.moncash
                      ? 'border-gray-100 bg-gray-50 opacity-70 cursor-not-allowed'
                      : payMethod === 'moncash'
                        ? 'border-haiti-red bg-red-50'
                        : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <Smartphone className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 flex items-center gap-2">
                      MonCash
                      {!PAYMENTS.moncash && (
                        <span className="text-[10px] font-bold uppercase tracking-wide bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
                          Bientôt
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">Digicel Haïti · mobile money</p>
                  </div>
                  <span className={`w-4 h-4 rounded-full border-2 ${payMethod === 'moncash' && PAYMENTS.moncash ? 'border-haiti-red bg-haiti-red' : 'border-gray-300'}`} />
                </button>

                <button
                  type="button"
                  disabled={!PAYMENTS.natcash}
                  onClick={() => PAYMENTS.natcash && setPayMethod('natcash')}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-colors ${
                    !PAYMENTS.natcash
                      ? 'border-gray-100 bg-gray-50 opacity-70 cursor-not-allowed'
                      : payMethod === 'natcash'
                        ? 'border-amber-500 bg-amber-50'
                        : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <Smartphone className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 flex items-center gap-2">
                      NatCash
                      {!PAYMENTS.natcash && (
                        <span className="text-[10px] font-bold uppercase tracking-wide bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
                          Bientôt
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">Natcom Haïti · mobile money</p>
                  </div>
                  <span className={`w-4 h-4 rounded-full border-2 ${payMethod === 'natcash' && PAYMENTS.natcash ? 'border-amber-500 bg-amber-500' : 'border-gray-300'}`} />
                </button>

                <button
                  type="button"
                  onClick={() => setPayMethod('stripe')}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-colors ${
                    payMethod === 'stripe'
                      ? 'border-brand bg-brand-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="w-10 h-10 bg-brand rounded-full flex items-center justify-center flex-shrink-0">
                    <CreditCard className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800">Carte · Stripe Link</p>
                    <p className="text-xs text-gray-500">
                      Visa / Mastercard / Link · ~${usdEstimate} USD
                    </p>
                  </div>
                  <span className={`w-4 h-4 rounded-full border-2 ${payMethod === 'stripe' ? 'border-brand bg-brand' : 'border-gray-300'}`} />
                </button>
              </div>

              <button
                onClick={initiatePayment}
                className={`w-full text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg ${
                  payMethod === 'stripe'
                    ? 'bg-brand hover:bg-brand-mid'
                    : payMethod === 'natcash'
                      ? 'bg-amber-500 hover:bg-amber-600'
                      : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {payMethod === 'stripe' ? <CreditCard className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />}
                {payMethod === 'stripe'
                  ? `Payer par carte · ~$${usdEstimate}`
                  : `Payer ${formatHtg(grandTotal)}`}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === 'processing' && (
            <div className="p-12 flex flex-col items-center text-center">
              <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-lg font-semibold text-slate-800">Traitement…</p>
            </div>
          )}

          {step === 'awaiting' && (
            <div className="p-6 text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                payMethod === 'natcash' ? 'bg-amber-100' : 'bg-red-100'
              }`}>
                <ExternalLink className={`w-8 h-8 ${payMethod === 'natcash' ? 'text-amber-600' : 'text-red-600'}`} />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Terminez sur {walletLabel}</h3>
              <p className="text-sm text-gray-600 mb-6">
                Payez <span className="font-bold">{formatHtg(grandTotal)}</span> puis cliquez ci-dessous.
              </p>
              <button
                onClick={confirmPayment}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold transition-colors shadow-md mb-3"
              >
                J’ai terminé le paiement
              </button>
              <button onClick={handleClose} className="w-full text-sm text-gray-500 py-2">Fermer</button>
            </div>
          )}

          {step === 'success' && (
            <div className="p-8 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Paiement réussi</h3>
              <p className="text-gray-600 text-sm mb-2">
                Fonds en séquestre. Le vendeur sera payé après confirmation de livraison (+ photo).
              </p>
              {orderId && (
                <p className="text-xs text-gray-400 font-mono mb-6">Commande : {orderId.slice(0, 8).toUpperCase()}</p>
              )}
              <button
                onClick={handleClose}
                className="w-full bg-brand hover:bg-brand-mid text-white py-3 rounded-xl font-bold transition-colors"
              >
                Continuer
              </button>
              {waSellerUrl && (
                <a
                  href={waSellerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 w-full inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1ebe57] text-white py-3 rounded-xl font-bold transition-colors"
                >
                  {t('whatsappOrder')}
                </a>
              )}
            </div>
          )}

          {step === 'error' && (
            <div className="p-8 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-10 h-10 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Échec</h3>
              <p className="text-sm text-gray-600 mb-6">{errorMsg}</p>
              <button
                onClick={() => { setErrorMsg(''); setStep(orderId && isWallet ? 'awaiting' : 'summary'); }}
                className="w-full bg-brand hover:bg-brand-mid text-white py-3 rounded-xl font-bold mb-3"
              >
                Réessayer
              </button>
              <button onClick={handleClose} className="w-full text-sm text-gray-500 py-2">Annuler</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
