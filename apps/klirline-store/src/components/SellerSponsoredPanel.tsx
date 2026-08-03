import { useCallback, useEffect, useState } from 'react';
import {
  Sparkles, CheckCircle, Loader2, Headset, ArrowRight, AlertCircle, Megaphone,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatHtg } from '../lib/commerce';

type SponsorshipRow = {
  id: string;
  status: string;
  plan: string;
  amount_htg: number;
  starts_at: string | null;
  ends_at: string | null;
  priority_support: boolean;
  admin_followup_status: string;
  days_left: number | null;
};

const DEFAULT_PRICE_HTG = 5000;

export function SellerSponsoredPanel({
  onActivated,
}: {
  onActivated?: () => void;
}) {
  const { session } = useAuth();
  const [row, setRow] = useState<SponsorshipRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [priceHtg, setPriceHtg] = useState(DEFAULT_PRICE_HTG);
  const [usdHint, setUsdHint] = useState('38');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data, error: err } = await supabase.rpc('seller_get_sponsorship');
    if (err) {
      setError(
        /function|does not exist|schema cache/i.test(err.message)
          ? 'Migration Sponsored non appliquée sur Supabase.'
          : err.message,
      );
      setRow(null);
    } else {
      setRow((data?.[0] as SponsorshipRow) ?? null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    (async () => {
      try {
        const { data: { session: s } } = await supabase.auth.getSession();
        if (!s) return;
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/seller-sponsor-checkout/pricing`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${s.access_token}`,
              apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
              'Content-Type': 'application/json',
            },
            body: '{}',
          },
        );
        const data = await res.json();
        if (res.ok && data.amountHtg) {
          setPriceHtg(Number(data.amountHtg));
          if (data.usdEstimate) setUsdHint(String(data.usdEstimate));
        }
      } catch { /* keep defaults */ }
    })();
  }, [load]);

  // Return from Stripe
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') !== 'sponsor_success') return;
    const sessionId = params.get('session_id');
    const sponsorshipId = params.get('sponsorship_id');
    if (!session?.access_token) return;

    let cancelled = false;
    (async () => {
      setBusy(true);
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/seller-sponsor-checkout/verify`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sessionId, sponsorshipId }),
          },
        );
        const data = await res.json();
        if (!cancelled) {
          if (!res.ok || !data.success) {
            setError(data.error || 'Paiement Sponsored non confirmé.');
          } else {
            onActivated?.();
          }
          window.history.replaceState({}, '', window.location.pathname);
          await load();
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erreur vérification');
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => { cancelled = true; };
  }, [session, load, onActivated]);

  const subscribe = async () => {
    setBusy(true);
    setError('');
    try {
      if (!session?.access_token) throw new Error('Connectez-vous.');
      const origin = window.location.origin;
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/seller-sponsor-checkout/create`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            successUrl: `${origin}/?checkout=sponsor_success`,
            cancelUrl: `${origin}/?checkout=sponsor_cancel`,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok || !data.checkoutUrl) {
        throw new Error(data.error || 'Échec Stripe Sponsored.');
      }
      window.location.href = data.checkoutUrl as string;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
      setBusy(false);
    }
  };

  const active = row?.status === 'active';

  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-6 sm:p-8">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center flex-shrink-0">
            <Megaphone className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              Abonnement Sponsored
              <Sparkles className="w-5 h-5 text-amber-500" />
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Mettez vos produits en tête du fil d’actualité et obtenez un suivi immédiat
              auprès des responsables Klirline.
            </p>
          </div>
        </div>

        <ul className="space-y-2.5 mb-6">
          {[
            'Produits affichés en premier sur la page d’actualité (rail Sponsorisé)',
            'Boost dans les recommandations personnalisées',
            'Badge « Sponsorisé » visible par les acheteurs',
            'Suivi prioritaire : un responsable Klirline vous contacte sous 24–48 h',
          ].map(t => (
            <li key={t} className="flex gap-2 text-sm text-slate-700">
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              {t}
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-end justify-between gap-4 border-t border-amber-100 pt-5">
          <div>
            <p className="text-3xl font-bold text-slate-900">{formatHtg(priceHtg)}</p>
            <p className="text-xs text-slate-500">pour 30 jours · ~${usdHint} USD (Stripe)</p>
          </div>
          {active ? (
            <div className="text-right">
              <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full">
                <CheckCircle className="w-4 h-4" /> Actif
                {row?.days_left != null ? ` · ${row.days_left} j restants` : ''}
              </p>
              {row?.ends_at && (
                <p className="text-xs text-slate-500 mt-1">
                  Jusqu’au {new Date(row.ends_at).toLocaleDateString('fr-HT')}
                </p>
              )}
            </div>
          ) : (
            <button
              type="button"
              disabled={busy || loading}
              onClick={subscribe}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm disabled:opacity-50 shadow-md"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              S’abonner Sponsored
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {active && (
          <div className="mt-5 flex gap-2 rounded-xl bg-brand-dark/5 border border-brand/20 px-4 py-3">
            <Headset className="w-5 h-5 text-brand flex-shrink-0 mt-0.5" />
            <div className="text-sm text-slate-700">
              <p className="font-semibold text-brand-dark">Suivi Klirline</p>
              <p className="text-xs mt-0.5">
                Statut :{' '}
                {row?.admin_followup_status === 'pending' && 'En attente de contact prioritaire'}
                {row?.admin_followup_status === 'contacted' && 'Responsable en contact avec vous'}
                {row?.admin_followup_status === 'done' && 'Suivi terminé'}
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 flex gap-2 text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
        </div>
      )}
    </div>
  );
}
