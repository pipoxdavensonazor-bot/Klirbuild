import { useRef, useState } from 'react';
import {
  ArrowLeft, Camera, Check, CheckCircle, Loader2, MapPin, Package,
  PenLine, Route, Truck, Wallet,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  FULFILLMENT_LABELS_FR,
  formatHtg,
  isAutoPayoutDue,
  type FulfillmentStatus,
} from '../lib/commerce';
import { resolveDeliveryUrl, uploadDeliveryProof, uploadDeliverySignature } from '../lib/kyc-upload';
import { SignaturePad, type SignaturePadHandle } from './SignaturePad';
import type { SellerFulfillmentRow } from './SellerFulfillmentsPanel';

const METHODS = [
  { id: 'moto-taxi', label: 'Moto-taxi' },
  { id: 'courier', label: 'Coursier / camionnette' },
  { id: 'pickup', label: 'Retrait en boutique' },
  { id: 'bus', label: 'Transport inter-département' },
  { id: 'other', label: 'Autre' },
] as const;

type Props = {
  row: SellerFulfillmentRow;
  onBack: () => void;
  onUpdated: () => void;
};

function Step({
  n, title, done, active, children,
}: {
  n: number;
  title: string;
  done?: boolean;
  active?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <section className={`rounded-2xl border p-4 sm:p-5 ${active ? 'border-brand bg-white' : 'border-gray-100 bg-white/80'}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
          done ? 'bg-emerald-600 text-white' : active ? 'bg-brand text-white' : 'bg-gray-200 text-gray-600'
        }`}>
          {done ? <Check className="w-4 h-4" /> : n}
        </span>
        <h3 className="font-semibold text-slate-900">{title}</h3>
      </div>
      {children}
    </section>
  );
}

export function SellerDeliveryWorkspace({ row, onBack, onUpdated }: Props) {
  const [method, setMethod] = useState(row.delivery_method ?? 'moto-taxi');
  const [carrier, setCarrier] = useState(row.delivery_carrier ?? '');
  const [route, setRoute] = useState(row.delivery_route ?? '');
  const [tracking, setTracking] = useState(row.delivery_tracking_code ?? '');
  const [eta, setEta] = useState(
    row.estimated_delivery_at
      ? new Date(row.estimated_delivery_at).toISOString().slice(0, 16)
      : '',
  );
  const [note, setNote] = useState(row.delivery_note ?? '');
  const [signedName, setSignedName] = useState(row.client_signed_name ?? '');
  const [photoPath, setPhotoPath] = useState(row.delivery_photo_url ?? '');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [hasSig, setHasSig] = useState(false);
  const sigRef = useRef<SignaturePadHandle>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const status = row.fulfillment_status as FulfillmentStatus;
  const planDone = Boolean(row.delivery_method || row.delivery_route || row.delivery_carrier);
  const shipped = Boolean(row.shipped_at) || ['shipped', 'delivered', 'payout_ready', 'paid_out'].includes(status);
  const delivered = ['delivered', 'payout_ready', 'paid_out'].includes(status) || Boolean(row.delivered_at);
  const canEditPlan = !['payout_ready', 'paid_out', 'disputed'].includes(status);
  const canShip = status === 'paid' || status === 'preparing';
  const canConfirm = status === 'shipped' || status === 'preparing' || status === 'paid';
  const canClaim =
    status === 'payout_ready' ||
    status === 'delivered' ||
    (status === 'shipped' && isAutoPayoutDue(row.shipped_at));

  const savePlan = async () => {
    setBusy(true);
    setError('');
    const { error: err } = await supabase.rpc('seller_update_delivery_plan', {
      p_fulfillment_id: row.fulfillment_id,
      p_method: method,
      p_carrier: carrier || null,
      p_route: route || null,
      p_tracking_code: tracking || null,
      p_estimated_at: eta ? new Date(eta).toISOString() : null,
    });
    if (err) setError(err.message);
    else onUpdated();
    setBusy(false);
  };

  const markShipped = async () => {
    setBusy(true);
    setError('');
    if (canEditPlan && (method || route || carrier)) {
      await supabase.rpc('seller_update_delivery_plan', {
        p_fulfillment_id: row.fulfillment_id,
        p_method: method,
        p_carrier: carrier || null,
        p_route: route || null,
        p_tracking_code: tracking || null,
        p_estimated_at: eta ? new Date(eta).toISOString() : null,
      });
    }
    const { error: err } = await supabase.rpc('seller_mark_shipped', {
      p_fulfillment_id: row.fulfillment_id,
    });
    if (err) setError(err.message);
    else onUpdated();
    setBusy(false);
  };

  const onPhoto = async (file: File | null) => {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const path = await uploadDeliveryProof(file);
      setPhotoPath(path);
      setPhotoPreview(await resolveDeliveryUrl(path));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Échec upload photo');
    } finally {
      setBusy(false);
    }
  };

  const confirmDelivery = async () => {
    if (!photoPath) {
      setError('Photo de livraison obligatoire.');
      return;
    }
    if (!sigRef.current?.hasInk()) {
      setError('Signature du client obligatoire à la remise.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const sigFile = await sigRef.current.toFile(`sig-${row.fulfillment_id}.png`);
      const sigPath = await uploadDeliverySignature(sigFile);
      const { error: err } = await supabase.rpc('seller_confirm_delivery', {
        p_fulfillment_id: row.fulfillment_id,
        p_photo_path: photoPath,
        p_note: note || null,
        p_signature_path: sigPath,
        p_signed_name: signedName || row.shipping_full_name || null,
      });
      if (err) setError(err.message);
      else onUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Échec confirmation');
    } finally {
      setBusy(false);
    }
  };

  const claimPayout = async () => {
    setBusy(true);
    setError('');
    const { error: err } = await supabase.rpc('seller_claim_payout', {
      p_fulfillment_id: row.fulfillment_id,
    });
    if (err) setError(err.message);
    else onUpdated();
    setBusy(false);
  };

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
      >
        <ArrowLeft className="w-4 h-4" /> Retour aux livraisons
      </button>

      <div className="bg-brand-dark text-white rounded-2xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-accent text-xs font-bold uppercase tracking-wide mb-1">Fiche livraison</p>
            <h2 className="font-display text-xl font-semibold">{row.product_names || 'Commande'}</h2>
            <p className="text-sm text-slate-300 mt-1">
              #{row.order_id.slice(0, 8).toUpperCase()} · {new Date(row.order_date).toLocaleString('fr-FR')}
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/15">
            {FULFILLMENT_LABELS_FR[status] ?? status}
          </span>
        </div>
        {(row.shipping_full_name || row.shipping_city) && (
          <p className="text-sm text-slate-200 mt-4 flex items-start gap-2">
            <MapPin className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
            <span>
              <strong>{row.shipping_full_name}</strong>
              {row.shipping_phone ? ` · ${row.shipping_phone}` : ''}
              <br />
              {[row.shipping_street, row.shipping_city, row.shipping_department].filter(Boolean).join(', ')}
            </span>
          </p>
        )}
        <div className="grid grid-cols-3 gap-2 mt-4 text-center">
          <div className="bg-white/10 rounded-lg py-2">
            <p className="text-[10px] text-slate-400 uppercase">Brut</p>
            <p className="text-sm font-bold">{formatHtg(Number(row.gross_amount))}</p>
          </div>
          <div className="bg-white/10 rounded-lg py-2">
            <p className="text-[10px] text-slate-400 uppercase">Commission</p>
            <p className="text-sm font-bold">−{formatHtg(Number(row.commission_amount))}</p>
          </div>
          <div className="bg-accent/20 rounded-lg py-2">
            <p className="text-[10px] text-accent uppercase">Net</p>
            <p className="text-sm font-bold text-accent">{formatHtg(Number(row.net_amount))}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
      )}

      <Step n={1} title="Plan de livraison & itinéraire" done={planDone} active={canEditPlan && !shipped}>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block text-xs font-medium text-gray-600">
            Mode
            <select
              value={method}
              disabled={!canEditPlan || busy}
              onChange={e => setMethod(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              {METHODS.map(m => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-gray-600">
            Transporteur / contact
            <input
              value={carrier}
              disabled={!canEditPlan || busy}
              onChange={e => setCarrier(e.target.value)}
              placeholder="Ex. Jean (moto) · +509…"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs font-medium text-gray-600 sm:col-span-2">
            Itinéraire
            <textarea
              value={route}
              disabled={!canEditPlan || busy}
              onChange={e => setRoute(e.target.value)}
              rows={3}
              placeholder="Ex. Delmas 33 → Pétion-Ville → Carrefour · passage marché en Fer"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-y"
            />
          </label>
          <label className="block text-xs font-medium text-gray-600">
            Code suivi (optionnel)
            <input
              value={tracking}
              disabled={!canEditPlan || busy}
              onChange={e => setTracking(e.target.value)}
              placeholder="Réf. interne"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs font-medium text-gray-600">
            Livraison estimée
            <input
              type="datetime-local"
              value={eta}
              disabled={!canEditPlan || busy}
              onChange={e => setEta(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </label>
        </div>
        {canEditPlan && (
          <button
            type="button"
            disabled={busy}
            onClick={savePlan}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-mid disabled:opacity-50"
          >
            <Route className="w-4 h-4" />
            {busy ? 'Enregistrement…' : 'Enregistrer le plan'}
          </button>
        )}
      </Step>

      <Step n={2} title="Expédition" done={shipped} active={canShip}>
        <p className="text-sm text-gray-600 mb-3">
          Quand le colis part vers le client, marquez-le comme expédié. Le client verra le statut dans ses commandes.
        </p>
        {canShip ? (
          <button
            type="button"
            disabled={busy}
            onClick={markShipped}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 disabled:opacity-50"
          >
            <Truck className="w-4 h-4" /> Marquer expédié
          </button>
        ) : shipped ? (
          <p className="text-sm text-emerald-700 font-medium inline-flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4" />
            Expédié le {row.shipped_at ? new Date(row.shipped_at).toLocaleString('fr-FR') : '—'}
          </p>
        ) : null}
      </Step>

      <Step n={3} title="Vérification livraison — photo + signature" done={delivered} active={canConfirm && !delivered}>
        <p className="text-sm text-gray-600 mb-4">
          À la remise : photo du colis + signature du client. Ensuite le versement net devient disponible.
        </p>

        {delivered ? (
          <div className="space-y-2 text-sm text-emerald-800">
            <p className="font-medium inline-flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4" />
              Livré le {row.delivered_at ? new Date(row.delivered_at).toLocaleString('fr-FR') : '—'}
            </p>
            {row.client_signed_name && (
              <p>Signé par : <strong>{row.client_signed_name}</strong></p>
            )}
          </div>
        ) : (
          <>
            {photoPreview ? (
              <img src={photoPreview} alt="Preuve" className="w-full h-40 object-cover rounded-xl border mb-3" />
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-300 rounded-xl py-8 text-sm font-medium text-gray-700 hover:border-brand mb-3 flex flex-col items-center gap-2"
              >
                {busy ? <Loader2 className="w-6 h-6 animate-spin" /> : <Camera className="w-6 h-6 text-brand" />}
                Photo de livraison
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

            <label className="block text-xs font-medium text-gray-600 mb-1">
              Nom du signataire
            </label>
            <input
              value={signedName}
              onChange={e => setSignedName(e.target.value)}
              placeholder={row.shipping_full_name || 'Nom du client'}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3"
            />

            <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-gray-600">
              <PenLine className="w-3.5 h-3.5" /> Signature client
              {hasSig && <span className="text-emerald-600">· OK</span>}
            </div>
            <SignaturePad ref={sigRef} onChange={setHasSig} disabled={busy} />

            <label className="block text-xs font-medium text-gray-600 mt-3 mb-1">Note</label>
            <input
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Ex. Remis en main propre, pièce présentée"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4"
            />

            {canConfirm && (
              <button
                type="button"
                disabled={busy || !photoPath}
                onClick={confirmDelivery}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
              >
                <Package className="w-4 h-4" /> Valider livraison + signature
              </button>
            )}
          </>
        )}
      </Step>

      <Step n={4} title="Versement" done={status === 'paid_out'} active={canClaim}>
        {status === 'paid_out' ? (
          <p className="text-sm text-gray-600 inline-flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-green-600" /> Versement enregistré
          </p>
        ) : canClaim ? (
          <button
            type="button"
            disabled={busy}
            onClick={claimPayout}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-accent text-brand-dark text-sm font-semibold hover:bg-accent-hover disabled:opacity-50"
          >
            <Wallet className="w-4 h-4" /> Marquer versé ({formatHtg(Number(row.net_amount))})
          </button>
        ) : (
          <p className="text-sm text-gray-500">
            Disponible après vérification livraison (ou auto J+7 après expédition).
          </p>
        )}
      </Step>
    </div>
  );
}
