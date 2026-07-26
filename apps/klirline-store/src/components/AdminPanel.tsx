import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft, ShieldCheck, Clock, CheckCircle, XCircle,
  Eye, ChevronDown, ChevronUp, Search, CreditCard, Camera,
  Users, Store, AlertTriangle, RefreshCw, MapPin, FileCheck,
  Scale, ShoppingBag,
} from 'lucide-react';
import { supabase, type VendorApplication } from '../lib/supabase';
import { resolveKycUrl } from '../lib/kyc-upload';
import { FULFILLMENT_LABELS_FR, formatHtg, type FulfillmentStatus } from '../lib/commerce';

interface AdminPanelProps {
  onBack: () => void;
}

type Tab = 'kyc' | 'conflicts' | 'clients';
type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

const STATUS_CONFIG = {
  pending:  { label: 'En attente',  icon: <Clock className="w-3.5 h-3.5" />,       classes: 'bg-amber-100 text-amber-800 border-amber-200' },
  approved: { label: 'Approuvé', icon: <CheckCircle className="w-3.5 h-3.5" />, classes: 'bg-green-100 text-green-800 border-green-200' },
  rejected: { label: 'Refusé', icon: <XCircle className="w-3.5 h-3.5" />,     classes: 'bg-red-100 text-red-800 border-red-200' },
};

type ConflictRow = {
  id: string;
  order_id: string;
  seller_id: string;
  status: FulfillmentStatus;
  gross_amount: number;
  net_amount: number;
  delivery_note: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  created_at: string;
  orders?: {
    shipping_full_name: string | null;
    shipping_phone: string | null;
    shipping_city: string | null;
    user_id: string;
    total: number;
    status: string;
  } | null;
};

type ClientRow = {
  id: string;
  display_name: string | null;
  phone: string | null;
  is_admin: boolean;
  created_at: string;
};

function DocThumb({ label, path, icon }: { label: string; path: string | null | undefined; icon: React.ReactNode }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const resolved = await resolveKycUrl(path);
      if (!cancelled) setUrl(resolved);
    })();
    return () => { cancelled = true; };
  }, [path]);
  if (!path) return null;
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-gray-600 flex items-center gap-1">{icon} {label}</p>
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer">
          <img src={url} alt={label} className="w-full h-28 object-cover rounded-lg border" />
        </a>
      ) : (
        <div className="w-full h-20 rounded-lg border bg-gray-100 animate-pulse" />
      )}
    </div>
  );
}

export const AdminPanel = ({ onBack }: AdminPanelProps) => {
  const [tab, setTab] = useState<Tab>('kyc');
  const [applications, setApplications] = useState<VendorApplication[]>([]);
  const [conflicts, setConflicts] = useState<ConflictRow[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState<VendorApplication | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [checks, setChecks] = useState({
    checklist_id_ok: false,
    checklist_selfie_ok: false,
    checklist_mairie_ok: false,
  });

  const loadAll = useCallback(async () => {
    setLoading(true);
    setActionError('');
    const [appsRes, fulfillRes, profilesRes] = await Promise.all([
      supabase.from('vendor_applications').select('*').order('created_at', { ascending: false }),
      supabase
        .from('order_fulfillments')
        .select('*, orders(shipping_full_name, shipping_phone, shipping_city, user_id, total, status)')
        .order('created_at', { ascending: false })
        .limit(80),
      supabase.from('profiles').select('id, display_name, phone, is_admin, created_at').order('created_at', { ascending: false }).limit(100),
    ]);
    if (appsRes.data) setApplications(appsRes.data as VendorApplication[]);
    if (fulfillRes.error) {
      /* table may not exist until migration */
    } else if (fulfillRes.data) {
      setConflicts(fulfillRes.data as ConflictRow[]);
    }
    if (profilesRes.data) setClients(profilesRes.data as ClientRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const stats = {
    pending:  applications.filter(a => a.status === 'pending').length,
    approved: applications.filter(a => a.status === 'approved').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
    disputed: conflicts.filter(c => c.status === 'disputed').length,
  };

  const filtered = applications.filter(a => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return a.business_name.toLowerCase().includes(q) ||
             a.owner_name.toLowerCase().includes(q) ||
             (a.city ?? '').toLowerCase().includes(q) ||
             (a.department ?? '').toLowerCase().includes(q);
    }
    return true;
  });

  const openApp = (app: VendorApplication | null) => {
    setSelected(app);
    setRejectionReason('');
    setActionError('');
    if (app) {
      setChecks({
        checklist_id_ok: Boolean(app.checklist_id_ok),
        checklist_selfie_ok: Boolean(app.checklist_selfie_ok),
        checklist_mairie_ok: Boolean(app.checklist_mairie_ok),
      });
    }
  };

  const allChecksOk = checks.checklist_id_ok && checks.checklist_selfie_ok && checks.checklist_mairie_ok;

  const handleApprove = async (app: VendorApplication) => {
    if (!allChecksOk) {
      setActionError('Cochez les 3 points de contrôle avant d’approuver.');
      return;
    }
    setActionLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('vendor_applications').update({
      status: 'approved',
      rejection_reason: null,
      reviewed_by: user?.id ?? null,
      reviewed_at: new Date().toISOString(),
      ...checks,
    }).eq('id', app.id);
    if (error) setActionError(error.message);
    else { await loadAll(); openApp(null); }
    setActionLoading(false);
  };

  const handleReject = async (app: VendorApplication) => {
    if (!rejectionReason.trim()) {
      setActionError('Indiquez un motif de refus.');
      return;
    }
    setActionLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('vendor_applications').update({
      status: 'rejected',
      rejection_reason: rejectionReason.trim(),
      reviewed_by: user?.id ?? null,
      reviewed_at: new Date().toISOString(),
      ...checks,
    }).eq('id', app.id);
    if (error) setActionError(error.message);
    else { await loadAll(); openApp(null); setRejectionReason(''); }
    setActionLoading(false);
  };

  const setConflictStatus = async (id: string, status: string, note?: string) => {
    setActionLoading(true);
    setActionError('');
    const { error } = await supabase.rpc('admin_set_fulfillment_status', {
      p_fulfillment_id: id,
      p_status: status,
      p_note: note ?? null,
    });
    if (error) setActionError(error.message);
    await loadAll();
    setActionLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-brand-dark text-white px-4 py-4 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex items-center gap-4 flex-wrap">
          <button onClick={onBack} className="flex items-center gap-2 text-sm hover:text-accent">
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-accent" />
            <h1 className="text-lg font-bold">Admin Klirline</h1>
          </div>
          <button onClick={loadAll} className="ml-auto flex items-center gap-1.5 text-sm text-gray-400 hover:text-white">
            <RefreshCw className="w-4 h-4" /> Actualiser
          </button>
        </div>
        <div className="max-w-5xl mx-auto flex gap-1 mt-3 overflow-x-auto">
          {([
            ['kyc', 'Vendeurs KYC', stats.pending],
            ['conflicts', 'Litiges / commandes', stats.disputed],
            ['clients', 'Clients', clients.length],
          ] as const).map(([key, label, count]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg whitespace-nowrap ${
                tab === key ? 'bg-white text-slate-900' : 'text-slate-400 hover:text-white'
              }`}
            >
              {label}
              <span className="ml-1.5 text-xs opacity-70">({count})</span>
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {actionError && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">
            <AlertTriangle className="w-4 h-4" /> {actionError}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tab === 'clients' ? (
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b">
              <h2 className="font-bold text-slate-900 flex items-center gap-2"><Users className="w-5 h-5 text-brand" /> Clients & comptes</h2>
              <p className="text-xs text-gray-500 mt-0.5">Profils inscrits (acheteurs / vendeurs).</p>
            </div>
            {clients.length === 0 ? (
              <p className="text-center text-gray-500 text-sm py-12">Aucun profil (ou droits admin manquants).</p>
            ) : (
              <div className="divide-y">
                {clients.map(c => (
                  <div key={c.id} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{c.display_name || 'Sans nom'}</p>
                      <p className="text-xs text-gray-500 font-mono">{c.id.slice(0, 8)}…{c.phone ? ` · ${c.phone}` : ''}</p>
                    </div>
                    <div className="text-right">
                      {c.is_admin && <span className="text-[10px] font-bold bg-accent text-brand-dark px-2 py-0.5 rounded-full">ADMIN</span>}
                      <p className="text-xs text-gray-400 mt-1">{new Date(c.created_at).toLocaleDateString('fr-FR')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : tab === 'conflicts' ? (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900">
              <p className="font-semibold flex items-center gap-2"><Scale className="w-4 h-4" /> Gestion des conflits</p>
              <p className="text-xs mt-1">Marquez un litige, débloquez un versement, ou clôturez après médiation vendeur / client.</p>
            </div>
            {conflicts.length === 0 ? (
              <div className="bg-white rounded-xl border py-16 text-center text-gray-500 text-sm">
                Aucune commande fulfillment (appliquez la migration Phase B + droits admin).
              </div>
            ) : (
              conflicts.map(row => (
                <div key={row.id} className="bg-white rounded-xl border shadow-sm p-4">
                  <div className="flex flex-wrap justify-between gap-2 mb-2">
                    <div>
                      <p className="font-semibold text-slate-900 flex items-center gap-2">
                        <ShoppingBag className="w-4 h-4 text-brand" />
                        Commande {row.order_id.slice(0, 8).toUpperCase()}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Client : {row.orders?.shipping_full_name || '—'}
                        {row.orders?.shipping_phone ? ` · ${row.orders.shipping_phone}` : ''}
                        {row.orders?.shipping_city ? ` · ${row.orders.shipping_city}` : ''}
                      </p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      row.status === 'disputed' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {FULFILLMENT_LABELS_FR[row.status] ?? row.status}
                    </span>
                  </div>
                  <p className="text-sm mb-3">
                    Brut {formatHtg(Number(row.gross_amount))} · Net vendeur {formatHtg(Number(row.net_amount))}
                  </p>
                  {row.delivery_note && <p className="text-xs text-gray-600 mb-3">Note : {row.delivery_note}</p>}
                  <div className="flex flex-wrap gap-2">
                    <button
                      disabled={actionLoading}
                      onClick={() => setConflictStatus(row.id, 'disputed', 'Litige ouvert par admin Klirline')}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      Ouvrir litige
                    </button>
                    <button
                      disabled={actionLoading}
                      onClick={() => setConflictStatus(row.id, 'payout_ready', 'Litige résolu — versement autorisé')}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      Résoudre → versement
                    </button>
                    <button
                      disabled={actionLoading}
                      onClick={() => setConflictStatus(row.id, 'paid_out', 'Clôturé par admin')}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-brand text-white hover:bg-brand-mid disabled:opacity-50"
                    >
                      Marquer versé / clos
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { key: 'pending' as StatusFilter, label: 'En attente', value: stats.pending, color: 'bg-amber-50 border-amber-200', icon: <Clock className="w-5 h-5 text-amber-500" /> },
                { key: 'approved' as StatusFilter, label: 'Approuvés', value: stats.approved, color: 'bg-green-50 border-green-200', icon: <CheckCircle className="w-5 h-5 text-green-500" /> },
                { key: 'rejected' as StatusFilter, label: 'Refusés', value: stats.rejected, color: 'bg-red-50 border-red-200', icon: <XCircle className="w-5 h-5 text-red-500" /> },
              ].map(stat => (
                <button key={stat.key} onClick={() => setStatusFilter(stat.key)} className={`rounded-xl border p-4 text-left ${stat.color} ${statusFilter === stat.key ? 'ring-2 ring-brand' : ''}`}>
                  <div className="flex items-center gap-2 mb-1">{stat.icon}<span className="text-xs font-medium text-gray-600">{stat.label}</span></div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Rechercher nom, ville, département…" className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-brand" />
              </div>
              {(['all', 'pending', 'approved', 'rejected'] as StatusFilter[]).map(f => (
                <button key={f} onClick={() => setStatusFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${statusFilter === f ? 'bg-brand text-white' : 'bg-white border text-gray-600'}`}>
                  {f === 'all' ? 'Tous' : STATUS_CONFIG[f as Exclude<StatusFilter, 'all'>]?.label ?? f}
                </button>
              ))}
            </div>

            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              {filtered.length === 0 ? (
                <div className="text-center py-16 text-gray-500 text-sm">Aucune candidature.</div>
              ) : (
                <div className="divide-y">
                  {filtered.map(app => {
                    const cfg = STATUS_CONFIG[app.status];
                    const isSelected = selected?.id === app.id;
                    return (
                      <div key={app.id}>
                        <button onClick={() => openApp(isSelected ? null : app)} className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 text-left">
                          <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center"><Store className="w-5 h-5 text-brand" /></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{app.business_name}</p>
                            <p className="text-xs text-gray-500 truncate">
                              {app.owner_name} · {app.department ? `📍 ${app.department}` : ''} {app.city ? `· ${app.city}` : ''}
                            </p>
                          </div>
                          <span className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${cfg.classes}`}>{cfg.icon}{cfg.label}</span>
                          {isSelected ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                        </button>
                        {isSelected && (
                          <div className="bg-gray-50 border-t px-5 py-5">
                            <div className="grid sm:grid-cols-2 gap-5 mb-5">
                              <dl className="space-y-1.5 text-sm">
                                {[
                                  ['Commerce', app.business_name],
                                  ['Propriétaire', app.owner_name],
                                  ['Téléphone', app.business_phone ?? '—'],
                                  ['Département', app.department ?? '—'],
                                  ['Ville', app.city ?? '—'],
                                ].map(([l, v]) => (
                                  <div key={l} className="flex gap-2"><span className="text-gray-500 min-w-28">{l}:</span><span className="font-medium">{v}</span></div>
                                ))}
                              </dl>
                              <div className="space-y-3">
                                <DocThumb label="ID recto" path={app.id_front_url} icon={<CreditCard className="w-4 h-4" />} />
                                <DocThumb label="Selfie" path={app.selfie_url} icon={<Camera className="w-4 h-4" />} />
                                <DocThumb label="Mairie" path={app.address_proof_url} icon={<MapPin className="w-4 h-4" />} />
                              </div>
                            </div>
                            {app.status === 'pending' && (
                              <>
                                <div className="bg-white border rounded-xl p-4 mb-4">
                                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-1"><FileCheck className="w-4 h-4" /> Checklist</h4>
                                  {[
                                    { key: 'checklist_id_ok' as const, label: 'Pièce d’identité OK' },
                                    { key: 'checklist_selfie_ok' as const, label: 'Selfie correspond' },
                                    { key: 'checklist_mairie_ok' as const, label: 'Preuve Mairie OK' },
                                  ].map(item => (
                                    <label key={item.key} className="flex items-center gap-2 text-sm mb-2">
                                      <input type="checkbox" checked={checks[item.key]} onChange={e => setChecks(c => ({ ...c, [item.key]: e.target.checked }))} />
                                      {item.label}
                                    </label>
                                  ))}
                                </div>
                                <div className="flex flex-col sm:flex-row gap-3">
                                  <input value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} placeholder="Motif de refus…" className="flex-1 border rounded-lg px-3 py-2 text-sm" />
                                  <button onClick={() => handleReject(app)} disabled={actionLoading} className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-semibold">Refuser</button>
                                  <button onClick={() => handleApprove(app)} disabled={actionLoading || !allChecksOk} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50">Approuver</button>
                                </div>
                              </>
                            )}
                            {app.status !== 'pending' && (
                              <p className="text-xs text-gray-500 flex items-center gap-1"><Eye className="w-4 h-4" /> Examiné le {app.reviewed_at ? new Date(app.reviewed_at).toLocaleString('fr-FR') : '—'}</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
};
