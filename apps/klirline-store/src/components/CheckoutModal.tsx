import { useEffect, useState } from 'react';
import { X, ShoppingBag, CheckCircle, AlertCircle, ExternalLink, Smartphone, ArrowRight, MapPin } from 'lucide-react';
import { HAITI_DEPARTMENTS, type Address, type CartItem, type Product } from '../lib/supabase';
import { getDisplayPrice, supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { KLIRLINE_COMMISSION_RATE, formatHtg, getShippingFee } from '../lib/commerce';
import { useI18n } from '../i18n';
import { orderPaidWhatsAppUrl } from '../lib/whatsapp';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: (CartItem & { product: Product })[];
  cartTotal: number;
  onSuccess: () => void;
}

type Step = 'summary' | 'processing' | 'awaiting' | 'success' | 'error';

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

export const CheckoutModal = ({ isOpen, onClose, cartItems, cartTotal, onSuccess }: CheckoutModalProps) => {
  const { session, user } = useAuth();
  const { t, locale } = useI18n();
  const [step, setStep] = useState<Step>('summary');
  const [errorMsg, setErrorMsg] = useState('');
  const [orderId, setOrderId] = useState('');
  const [paymentWindow, setPaymentWindow] = useState<Window | null>(null);
  const [ship, setShip] = useState<ShipForm>(EMPTY_SHIP);
  const [waSellerUrl, setWaSellerUrl] = useState<string | null>(null);

  const shippingFee = getShippingFee(ship.shipping_department);
  const grandTotal = cartTotal + shippingFee;

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

  if (!isOpen) return null;

  const handleClose = () => {
    if (step === 'success') onSuccess();
    setStep('summary');
    setErrorMsg('');
    setOrderId('');
    onClose();
  };

  const setShipField = (k: keyof ShipForm, v: string) => setShip(s => ({ ...s, [k]: v }));

  const validateShip = (): string => {
    if (!ship.shipping_full_name.trim()) return 'Nom du destinataire obligatoire.';
    if (!ship.shipping_phone.trim()) return 'Téléphone de livraison obligatoire.';
    if (!ship.shipping_street.trim()) return 'Adresse (rue) obligatoire.';
    if (!ship.shipping_city.trim()) return 'Ville obligatoire.';
    if (!ship.shipping_department) return 'Département obligatoire.';
    return '';
  };

  const authHeaders = (): HeadersInit => {
    const token = session?.access_token;
    if (!token) throw new Error('Connectez-vous pour payer.');
    return {
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
      'Content-Type': 'application/json',
    };
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
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          total: grandTotal,
          status: 'pending',
          shipping_fee: shippingFee,
          shipping_full_name: ship.shipping_full_name.trim(),
          shipping_phone: ship.shipping_phone.trim(),
          shipping_street: ship.shipping_street.trim(),
          shipping_city: ship.shipping_city.trim(),
          shipping_department: ship.shipping_department,
        })
        .select()
        .maybeSingle();

      if (orderError || !order) throw new Error(orderError?.message || 'Impossible de créer la commande.');

      const { error: itemsError } = await supabase.from('order_items').insert(
        cartItems.map(item => ({
          order_id: order.id,
          product_id: item.product_id,
          quantity: item.quantity,
          price: getDisplayPrice(item.product),
        })),
      );
      if (itemsError) throw new Error(itemsError.message);

      setOrderId(order.id);

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/moncash-payment/create`,
        {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ orderId: order.id }),
        },
      );

      const payData = await res.json();
      if (!res.ok || payData.error) {
        throw new Error(payData.error || 'Échec d’initialisation MonCash.');
      }

      const { paymentUrl } = payData;
      const win = window.open(paymentUrl, '_blank', 'noopener,noreferrer');
      setPaymentWindow(win);
      setStep('awaiting');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur inattendue.');
      setStep('error');
    }
  };

  const confirmPayment = async () => {
    setStep('processing');
    try {
      if (paymentWindow && !paymentWindow.closed) paymentWindow.close();

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/moncash-payment/verify`,
        {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ orderId }),
        },
      );

      const verifyData = await res.json();
      if (res.ok && verifyData.success) {
        // Best-effort WhatsApp link to first seller with a business phone
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
                orderId,
                city: ship.shipping_city,
                locale,
              }),
            );
          }
        } catch { /* ignore */ }
        setStep('success');
        return;
      }

      throw new Error(
        verifyData.error ||
          'Paiement non confirmé. Terminez sur MonCash, puis réessayez.',
      );
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Échec de vérification.');
      setStep('error');
    }
  };

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
                        HTG {(unit * item.quantity).toFixed(0)}
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
                  Paiement MonCash sécurisé. Séquestre Klirline (commission {Math.round(KLIRLINE_COMMISSION_RATE * 100)} %)
                  jusqu’à confirmation de livraison.
                </p>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-orange-50 border border-orange-200 rounded-xl p-4 mb-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <Smartphone className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">Payer avec MonCash</p>
                    <p className="text-xs text-gray-500">Digicel Haïti</p>
                  </div>
                </div>
              </div>

              <button
                onClick={initiatePayment}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg"
              >
                <Smartphone className="w-5 h-5" />
                Payer {formatHtg(grandTotal)}
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
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ExternalLink className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Terminez sur MonCash</h3>
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
                onClick={() => { setErrorMsg(''); setStep(orderId ? 'awaiting' : 'summary'); }}
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
