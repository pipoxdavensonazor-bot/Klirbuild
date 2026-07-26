import { useState } from 'react';
import {
  X, Store, User, MapPin, FileImage, CheckCircle,
  ChevronRight, ChevronLeft, AlertCircle,
} from 'lucide-react';
import { supabase, HAITI_DEPARTMENTS, VENDOR_CATEGORIES } from '../lib/supabase';
import { DocUploadField } from './DocUploadField';

interface VendorApplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 1 | 2 | 3;

const STEPS = [
  { n: 1 as Step, label: 'Commerce', icon: <Store className="w-4 h-4" /> },
  { n: 2 as Step, label: 'Département', icon: <MapPin className="w-4 h-4" /> },
  { n: 3 as Step, label: 'Documents', icon: <FileImage className="w-4 h-4" /> },
];

const EMPTY = {
  business_name: '',
  owner_name: '',
  business_category: '',
  business_phone: '',
  business_address: '',
  city: '',
  department: '',
  id_front_url: '',
  id_back_url: '',
  selfie_url: '',
  address_proof_url: '',
};

export const VendorApplyModal = ({ isOpen, onClose, onSuccess }: VendorApplyModalProps) => {
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const set = (field: keyof typeof EMPTY, value: string) =>
    setForm(f => ({ ...f, [field]: value }));

  const validateStep = (): string => {
    if (step === 1) {
      if (!form.business_name.trim()) return 'Le nom du commerce est obligatoire.';
      if (!form.owner_name.trim()) return 'Le nom du propriétaire est obligatoire.';
      if (!form.business_category) return 'Choisissez une catégorie.';
      if (!form.business_phone.trim()) return 'Le téléphone (+509) est obligatoire.';
    }
    if (step === 2) {
      if (!form.city.trim()) return 'La ville / commune est obligatoire.';
      if (!form.department) return 'Choisissez un département.';
    }
    if (step === 3) {
      if (!form.id_front_url) return 'Envoyez la photo de votre pièce d’identité (recto).';
      if (!form.selfie_url) return 'Envoyez un selfie avec votre pièce d’identité.';
      if (!form.address_proof_url) {
        return 'Envoyez la preuve d’adresse délivrée par la Mairie.';
      }
    }
    return '';
  };

  const handleNext = () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError('');
    setStep(s => (s + 1) as Step);
  };

  const handleBack = () => {
    setError('');
    setStep(s => (s - 1) as Step);
  };

  const handleSubmit = async () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError('');
    setLoading(true);

    const { error: dbError } = await supabase.from('vendor_applications').insert({
      business_name: form.business_name.trim(),
      owner_name: form.owner_name.trim(),
      business_category: form.business_category,
      business_phone: form.business_phone.trim(),
      business_address: form.business_address.trim() || null,
      city: form.city.trim(),
      department: form.department,
      id_front_url: form.id_front_url,
      id_back_url: form.id_back_url || null,
      selfie_url: form.selfie_url,
      address_proof_url: form.address_proof_url,
    });

    if (dbError) {
      if (/address_proof_url|column/i.test(dbError.message)) {
        setError(
          'La base n’a pas encore la colonne preuve Mairie. Appliquez la migration Phase A sur Supabase.',
        );
      } else {
        setError(dbError.message);
      }
    } else {
      setSubmitted(true);
      onSuccess();
    }
    setLoading(false);
  };

  const handleClose = () => {
    setStep(1);
    setForm(EMPTY);
    setError('');
    setSubmitted(false);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm" onClick={handleClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto pointer-events-auto">
          <div className="bg-brand-dark text-white px-6 py-5 rounded-t-2xl sticky top-0 z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-accent" />
                <h2 className="text-lg font-bold">Devenir vendeur Klirline</h2>
              </div>
              <button onClick={handleClose} className="text-gray-400 hover:text-accent transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-0">
              {STEPS.map((s, i) => (
                <div key={s.n} className="flex items-center flex-1">
                  <div className={`flex items-center gap-1.5 flex-shrink-0 ${step === s.n ? 'text-accent' : step > s.n ? 'text-green-400' : 'text-gray-500'}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                      step === s.n ? 'border-accent bg-accent text-brand-dark'
                      : step > s.n ? 'border-green-400 bg-green-400 text-brand-dark'
                      : 'border-gray-600 text-gray-500'
                    }`}>
                      {step > s.n ? '✓' : s.n}
                    </div>
                    <span className="text-xs font-medium hidden sm:block">{s.label}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`flex-1 h-px mx-2 ${step > s.n ? 'bg-green-400' : 'bg-gray-600'}`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="p-6">
            {submitted ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-9 h-9 text-green-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Demande envoyée</h3>
                <p className="text-gray-500 text-sm max-w-xs mx-auto">
                  Un administrateur Klirline vérifiera votre pièce d’identité et votre preuve d’adresse Mairie
                  sous 1 à 3 jours ouvrables. Vous pourrez vendre seulement après approbation.
                </p>
                <button
                  onClick={handleClose}
                  className="mt-6 bg-brand hover:bg-brand-mid text-white font-semibold px-6 py-2.5 rounded-lg transition-colors"
                >
                  Fermer
                </button>
              </div>
            ) : (
              <>
                {error && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-5">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    {error}
                  </div>
                )}

                {step === 1 && (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 mb-0.5">Informations du commerce</p>
                      <p className="text-xs text-gray-500">Ces infos seront vérifiées par l’équipe Klirline.</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nom du commerce / boutique <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={form.business_name}
                          onChange={e => set('business_name', e.target.value)}
                          placeholder="Ex. Boutique Tech Cap-Haïtien"
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nom complet du propriétaire <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={form.owner_name}
                          onChange={e => set('owner_name', e.target.value)}
                          placeholder="Nom tel qu’il apparaît sur la pièce d’identité"
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Catégorie <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={form.business_category}
                        onChange={e => set('business_category', e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand"
                      >
                        <option value="">Choisir…</option>
                        {VENDOR_CATEGORIES.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Téléphone (+509) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        value={form.business_phone}
                        onChange={e => set('business_phone', e.target.value)}
                        placeholder="+509 __ __ __ __"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                      />
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 mb-0.5">Localisation du vendeur</p>
                      <p className="text-xs text-gray-500">
                        Chaque vendeur est identifié par l’un des <strong>10 départements d’Haïti</strong>.
                        Choisissez celui de votre commerce (même que la Mairie).
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Département <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {HAITI_DEPARTMENTS.map(d => {
                          const selected = form.department === d;
                          return (
                            <button
                              key={d}
                              type="button"
                              onClick={() => set('department', d)}
                              className={`text-left px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                                selected
                                  ? 'border-brand bg-brand text-white shadow-sm'
                                  : 'border-gray-200 bg-white text-gray-800 hover:border-brand hover:bg-brand-50'
                              }`}
                            >
                              {d}
                            </button>
                          );
                        })}
                      </div>
                      {!form.department && (
                        <p className="text-xs text-amber-700 mt-2">Sélectionnez un département pour continuer.</p>
                      )}
                      {form.department && (
                        <p className="text-xs text-brand mt-2 font-medium">
                          Vendeur identifié : département {form.department}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ville / Commune <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={form.city}
                        onChange={e => set('city', e.target.value)}
                        placeholder="Ex. Port-au-Prince, Cap-Haïtien…"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Adresse (rue)</label>
                      <input
                        type="text"
                        value={form.business_address}
                        onChange={e => set('business_address', e.target.value)}
                        placeholder="Rue, numéro, quartier…"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                      />
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-5">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 mb-0.5">Vérification d’identité (KYC)</p>
                      <p className="text-xs text-gray-500">
                        Photos depuis votre téléphone. Documents confidentiels — réservés à l’admin Klirline.
                      </p>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-amber-800">
                        Obligatoire : CIN / passeport / permis, selfie avec la pièce, et
                        <strong> attestation ou certificat de résidence de la Mairie</strong> de votre commune.
                      </p>
                    </div>

                    <DocUploadField
                      label="Pièce d’identité (recto)"
                      hint="CIN, passeport ou permis — face avant lisible"
                      required
                      docType="id-front"
                      value={form.id_front_url}
                      onChange={v => set('id_front_url', v)}
                      capture="environment"
                    />

                    <DocUploadField
                      label="Pièce d’identité (verso)"
                      hint="Optionnel si passeport"
                      docType="id-back"
                      value={form.id_back_url}
                      onChange={v => set('id_back_url', v)}
                      capture="environment"
                    />

                    <DocUploadField
                      label="Selfie avec la pièce d’identité"
                      hint="Tenez la pièce à côté de votre visage, bien visible"
                      required
                      docType="selfie"
                      value={form.selfie_url}
                      onChange={v => set('selfie_url', v)}
                      capture="user"
                      acceptPdf={false}
                    />

                    <DocUploadField
                      label="Preuve d’adresse — Mairie"
                      hint="Attestation / certificat de résidence délivré par la Mairie de votre ville"
                      required
                      docType="mairie"
                      value={form.address_proof_url}
                      onChange={v => set('address_proof_url', v)}
                      capture="environment"
                    />
                  </div>
                )}

                <div className="flex gap-3 mt-6">
                  {step > 1 && (
                    <button
                      type="button"
                      onClick={handleBack}
                      className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" /> Retour
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={step === 3 ? handleSubmit : handleNext}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-brand hover:bg-brand-mid disabled:opacity-60 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                  >
                    {loading ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : step === 3 ? (
                      <><CheckCircle className="w-4 h-4" /> Envoyer pour validation</>
                    ) : (
                      <>Continuer <ChevronRight className="w-4 h-4" /></>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
