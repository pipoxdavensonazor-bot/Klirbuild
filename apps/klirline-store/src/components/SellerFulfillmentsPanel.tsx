import { useCallback, useEffect, useState } from 'react';
import { ChevronRight, MapPin, PenLine, Route, Truck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  FULFILLMENT_LABELS_FR,
  formatHtg,
  type FulfillmentStatus,
} from '../lib/commerce';
import { SellerDeliveryWorkspace } from './SellerDeliveryWorkspace';

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
  shipping_department?: string | null;
  item_count: number;
  product_names: string | null;
  auto_payout_at: string | null;
  delivery_method?: string | null;
  delivery_carrier?: string | null;
  delivery_route?: string | null;
  delivery_tracking_code?: string | null;
  estimated_delivery_at?: string | null;
  client_signature_path?: string | null;
  client_signed_at?: string | null;
  client_signed_name?: string | null;
  delivery_note?: string | null;
  payout_provider?: string | null;
  payout_transaction_id?: string | null;
  payout_error?: string | null;
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
  const [error, setError] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data, error: err } = await supabase.rpc('get_seller_fulfillments', { limit_count: 40 });
    if (err) {
      setError(
        /function|does not exist|schema cache/i.test(err.message)
          ? 'Appliquez la migration livraisons vendeur sur Supabase.'
          : err.message,
      );
      setRows([]);
    } else {
      setRows((data ?? []) as SellerFulfillmentRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const active = rows.find(r => r.fulfillment_id === activeId) ?? null;

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (active) {
    return (
      <SellerDeliveryWorkspace
        row={active}
        onBack={() => setActiveId(null)}
        onUpdated={async () => {
          await load();
        }}
      />
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Livraisons & vérifications</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Après chaque achat MonCash : planifier l’itinéraire, expédier, puis vérifier avec photo + signature client.
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
        <div className="space-y-3">
          {rows.map(row => {
            const needsAction = ['paid', 'preparing', 'shipped'].includes(row.fulfillment_status);
            return (
              <button
                key={row.fulfillment_id}
                type="button"
                onClick={() => setActiveId(row.fulfillment_id)}
                className="w-full text-left bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 hover:border-brand/40 transition-colors"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="font-semibold text-slate-900">{row.product_names || 'Articles'}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      #{row.order_id.slice(0, 8).toUpperCase()} · {new Date(row.order_date).toLocaleString('fr-FR')}
                      {row.item_count ? ` · ${row.item_count} article(s)` : ''}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLE[row.fulfillment_status] ?? 'bg-gray-100'}`}>
                    {FULFILLMENT_LABELS_FR[row.fulfillment_status] ?? row.fulfillment_status}
                  </span>
                </div>

                {(row.shipping_full_name || row.shipping_city) && (
                  <p className="text-xs text-gray-600 mb-2 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-brand" />
                    {row.shipping_full_name}
                    {row.shipping_city ? ` · ${row.shipping_city}` : ''}
                    {row.shipping_department ? ` (${row.shipping_department})` : ''}
                  </p>
                )}

                <div className="flex flex-wrap gap-3 text-[11px] text-gray-500 mb-3">
                  {row.delivery_route && (
                    <span className="inline-flex items-center gap-1"><Route className="w-3 h-3" /> Itinéraire</span>
                  )}
                  {row.client_signature_path && (
                    <span className="inline-flex items-center gap-1 text-emerald-700"><PenLine className="w-3 h-3" /> Signé</span>
                  )}
                  {row.shipped_at && (
                    <span className="inline-flex items-center gap-1"><Truck className="w-3 h-3" /> Expédié</span>
                  )}
                  <span className="font-semibold text-slate-700 ml-auto">{formatHtg(Number(row.net_amount))} net</span>
                </div>

                <div className="flex items-center justify-between text-sm font-semibold text-brand">
                  <span>{needsAction ? 'Ouvrir la fiche livraison' : 'Voir le détail'}</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
