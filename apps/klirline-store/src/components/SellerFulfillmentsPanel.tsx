import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle, Loader2, Package, Truck, Wallet } from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  FULFILLMENT_LABELS_FR,
  formatHtg,
  isAutoPayoutDue,
  type FulfillmentStatus,
} from '../lib/commerce';
import { resolveDeliveryUrl, uploadDeliveryProof } from '../lib/kyc-upload';

export type SellerFulfillmentRow = {
  fulfillment_id: string;
  order_id: string;
  fulfillment_status: FulfillmentStatus;
  gross_amount: number;
  commission_amount: number;
  net_amount: number;
  shipped_at: string | null;
  delivered_at: string | null;
  delivery_photo_url: string | null;
  payout_ready_at: string | null;
  paid_out_at: string | null;
  order_date: string;
  order_payment_status: string;
  shipping_full_name: string | null;
  shipping_phone: string | null;
  shipping_city: string | null;
  shipping_street: string | null;
  item_count: number;
  product_names: string | null;
  auto_payout_at: string | null;
};

const STATUS_STYLE: Record<string, string> = {
  paid: 'bg-blue-100 text-blue-800',
  preparing: 'bg-slate-100 text-slate-700',
  shipped: 'bg-amber-100 text-amber-800',
  delivered: 'bg-emerald-100 text-emerald-800',
  payout_ready: 'bg-green-100 text-green-800',
  paid_out: 'bg-gray-100 text-gray-600',
  disputed: 'bg-red-100 text-red-700',
};

export function SellerFulfillmentsPanel() {
  const [rows, setRows] = useState<SellerFulfillmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [photoPath, setPhotoPath] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data, error: err } = await supabase.rpc('get_seller_fulfillments', { limit_count: 40 });
    if (err) {
      setError(
        /function|does not exist|schema cache/i.test(err.message)
          ? 'Appliquez la migration Phase B sur Supabase (order_fulfillments).'
          : err.message,
      );
      setRows([]);
    } else {
      setRows((data ?? []) as SellerFulfillmentRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const markShipped = async (id: string) => {
    setBusyId(id);
    setError('');
    const { error: err } = await supabase.rpc('seller_mark_shipped', { p_fulfillment_id: id });
    if (err) setError(err.message);
    await load();
    setBusyId(null);
  };

  const openConfirm = (id: string) => {
    setConfirmId(id);
    setNote('');
    setPhotoPath('');
    setPhotoPreview(null);
  };

  const onPhoto = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const path = await uploadDeliveryProof(file);
      setPhotoPath(path);
      const url = await resolveDeliveryUrl(path);
      setPhotoPreview(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Échec upload photo');
    } finally {
      setUploading(false);
    }
  };

  const submitDelivery = async () => {
    if (!confirmId) return;
    if (!photoPath) {
      setError('Photo de livraison obligatoire.');
      return;
    }
    setBusyId(confirmId);
    setError('');
    const { error: err } = await supabase.rpc('seller_confirm_delivery', {
      p_fulfillment_id: confirmId,
      p_photo_path: photoPath,
      p_note: note || null,
    });
    if (err) setError(err.message);
    else {
      setConfirmId(null);
      await load();
    }
    setBusyId(null);
  };

  const claimPayout = async (id: string) => {
    setBusyId(id);
    setError('');
    const { error: err } = await supabase.rpc('seller_claim_payout', { p_fulfillment_id: id });
    if (err) setError(err.message);
    await load();
    setBusyId(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Commandes & versements</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Escrow MonCash → expédier → photo de livraison → versement (ou auto J+7 après expédition). Commission 8 %.
          </p>
        </div>
        <button onClick={load} className="text-sm text-brand font-semibold hover:underline">Actualiser</button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">{error}</div>
      )}

      {rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center text-gray-500 text-sm">
          Aucune commande payée pour vos produits.
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map(row => {
            const canShip = row.fulfillment_status === 'paid' || row.fulfillment_status === 'preparing';
            const canConfirm =
              row.fulfillment_status === 'shipped' ||
              row.fulfillment_status === 'paid' ||
              row.fulfillment_status === 'preparing';
            const canClaim =
              row.fulfillment_status === 'payout_ready' ||
              row.fulfillment_status === 'delivered' ||
              (row.fulfillment_status === 'shipped' && isAutoPayoutDue(row.shipped_at));

            return (
              <div key={row.fulfillment_id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="font-semibold text-slate-900">{row.product_names || 'Articles'}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Commande {row.order_id.slice(0, 8).toUpperCase()} · {new Date(row.order_date).toLocaleString('fr-FR')}
                      {row.item_count ? ` · ${row.item_count} article(s)` : ''}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLE[row.fulfillment_status] ?? 'bg-gray-100'}`}>
                    {FULFILLMENT_LABELS_FR[row.fulfillment_status] ?? row.fulfillment_status}
                  </span>
                </div>

                {(row.shipping_full_name || row.shipping_city) && (
                  <p className="text-xs text-gray-600 mb-3">
                    Livrer à : <strong>{row.shipping_full_name}</strong>
                    {row.shipping_phone ? ` · ${row.shipping_phone}` : ''}
                    {row.shipping_street ? ` · ${row.shipping_street}` : ''}
                    {row.shipping_city ? `, ${row.shipping_city}` : ''}
                  </p>
                )}

                <div className="grid grid-cols-3 gap-2 text-center mb-4">
                  <div className="bg-gray-50 rounded-lg py-2">
                    <p className="text-[10px] text-gray-500 uppercase">Brut</p>
                    <p className="text-sm font-bold">{formatHtg(Number(row.gross_amount))}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg py-2">
                    <p className="text-[10px] text-gray-500 uppercase">Commission</p>
                    <p className="text-sm font-bold text-red-600">−{formatHtg(Number(row.commission_amount))}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg py-2">
                    <p className="text-[10px] text-gray-500 uppercase">Net vendeur</p>
                    <p className="text-sm font-bold text-green-700">{formatHtg(Number(row.net_amount))}</p>
                  </div>
                </div>

                {row.shipped_at && row.fulfillment_status === 'shipped' && (
                  <p className="text-xs text-amber-700 mb-3">
                    Versement auto possible le {row.auto_payout_at
                      ? new Date(row.auto_payout_at).toLocaleDateString('fr-FR')
                      : '—'} (J+7) si pas de photo avant.
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  {canShip && (
                    <button
                      disabled={busyId === row.fulfillment_id}
                      onClick={() => markShipped(row.fulfillment_id)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-mid disabled:opacity-50"
                    >
                      <Truck className="w-4 h-4" /> Marquer expédié
                    </button>
                  )}
                  {canConfirm && row.fulfillment_status !== 'payout_ready' && row.fulfillment_status !== 'paid_out' && (
                    <button
                      disabled={busyId === row.fulfillment_id}
                      onClick={() => openConfirm(row.fulfillment_id)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <Camera className="w-4 h-4" /> Confirmer livraison + photo
                    </button>
                  )}
                  {canClaim && (
                    <button
                      disabled={busyId === row.fulfillment_id}
                      onClick={() => claimPayout(row.fulfillment_id)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent text-brand-dark text-sm font-semibold hover:bg-accent-hover disabled:opacity-50"
                    >
                      <Wallet className="w-4 h-4" /> Marquer versé
                    </button>
                  )}
                  {row.fulfillment_status === 'paid_out' && (
                    <span className="inline-flex items-center gap-1 text-xs text-gray-500 font-medium">
                      <CheckCircle className="w-4 h-4 text-green-600" /> Versement enregistré
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {confirmId && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setConfirmId(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 pointer-events-auto">
              <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
                <Package className="w-5 h-5 text-brand" /> Confirmer la livraison
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Photo obligatoire du colis remis au client. Ensuite le versement net devient disponible.
              </p>

              {photoPreview ? (
                <img src={photoPreview} alt="Preuve" className="w-full h-40 object-cover rounded-xl border mb-3" />
              ) : (
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-300 rounded-xl py-8 text-sm font-medium text-gray-700 hover:border-brand mb-3 flex flex-col items-center gap-2"
                >
                  {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Camera className="w-6 h-6 text-brand" />}
                  Prendre / choisir une photo
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={e => onPhoto(e.target.files?.[0] ?? null)}
              />

              <label className="block text-xs font-medium text-gray-600 mb-1">Note (optionnel)</label>
              <input
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Ex. Remis en main propre à Port-au-Prince"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4"
              />

              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmId(null)}
                  className="flex-1 py-2.5 border rounded-lg text-sm font-semibold"
                >
                  Annuler
                </button>
                <button
                  onClick={submitDelivery}
                  disabled={!!busyId || !photoPath}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold"
                >
                  Valider
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
