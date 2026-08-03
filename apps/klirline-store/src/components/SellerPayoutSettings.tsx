import { useEffect, useState } from 'react';
import { Loader2, Smartphone, Wallet } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function SellerPayoutSettings() {
  const { session } = useAuth();
  const [method, setMethod] = useState<'moncash' | 'natcash'>('moncash');
  const [wallet, setWallet] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc('seller_get_payout_wallet');
      if (!error && data?.[0]) {
        const row = data[0] as {
          payout_method: string | null;
          payout_wallet: string | null;
          business_phone: string | null;
        };
        if (row.payout_method === 'natcash' || row.payout_method === 'moncash') {
          setMethod(row.payout_method);
        }
        setWallet(row.payout_wallet || row.business_phone || '');
      }
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    setMsg('');
    setErr('');
    const { error } = await supabase.rpc('seller_update_payout_wallet', {
      p_method: method,
      p_wallet: wallet,
    });
    if (error) setErr(error.message);
    else setMsg('Portefeuille enregistré. Les versements iront sur ce numéro.');
    setSaving(false);
  };

  if (!session) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Wallet className="w-5 h-5 text-brand" />
        <h3 className="font-semibold text-slate-900">Portefeuille de versement</h3>
      </div>
      <p className="text-sm text-gray-600 mb-4">
        Après livraison confirmée, Klirline verse le net (après 8&nbsp;% commission) sur votre MonCash.
        Compte marchand Digicel préfinancé requis côté Klirline.
      </p>

      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin text-brand" />
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setMethod('moncash')}
              className={`px-3 py-2 rounded-lg text-sm font-medium border ${
                method === 'moncash'
                  ? 'border-haiti-red bg-red-50 text-haiti-red'
                  : 'border-gray-200 text-gray-600'
              }`}
            >
              MonCash
            </button>
            <button
              type="button"
              onClick={() => setMethod('natcash')}
              className={`px-3 py-2 rounded-lg text-sm font-medium border ${
                method === 'natcash'
                  ? 'border-amber-500 bg-amber-50 text-amber-700'
                  : 'border-gray-200 text-gray-600'
              }`}
            >
              NatCash (bientôt)
            </button>
          </div>
          {method === 'natcash' && (
            <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
              Versement NatCash automatique pas encore branché — utilisez MonCash pour recevoir maintenant.
            </p>
          )}
          <label className="block text-xs font-medium text-gray-600">
            Numéro portefeuille (+509)
            <div className="mt-1 flex gap-2">
              <div className="relative flex-1">
                <Smartphone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={wallet}
                  onChange={e => setWallet(e.target.value)}
                  placeholder="509XXXXXXXX"
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <button
                type="button"
                disabled={saving || method !== 'moncash'}
                onClick={save}
                className="px-4 py-2 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-mid disabled:opacity-50"
              >
                {saving ? '…' : 'Enregistrer'}
              </button>
            </div>
          </label>
          {msg && <p className="text-sm text-emerald-700">{msg}</p>}
          {err && <p className="text-sm text-red-600">{err}</p>}
        </div>
      )}
    </div>
  );
}
