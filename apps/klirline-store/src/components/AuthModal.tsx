import { useState } from 'react';
import {
  X, Mail, Lock, Eye, EyeOff, ShoppingBag, Phone, MapPin, Store, User,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../i18n';
import { HAITI_DEPARTMENTS, supabase } from '../lib/supabase';

export type SignupIntent = 'buyer' | 'seller';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'signin' | 'signup';
  /** Called after successful signup (session present). Seller → open KYC form. */
  onSignedUp?: (intent: SignupIntent) => void;
}

type Mode = 'phone' | 'email';

export const AuthModal = ({
  isOpen,
  onClose,
  defaultTab = 'signin',
  onSignedUp,
}: AuthModalProps) => {
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>('email');
  const [tab, setTab] = useState<'signin' | 'signup'>(defaultTab);
  const [intent, setIntent] = useState<SignupIntent>('buyer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('+509');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [stateDept, setStateDept] = useState('');
  const [phone, setPhone] = useState('+509');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, signInWithPhone, verifyPhoneOtp } = useAuth();

  if (!isOpen) return null;

  const reset = () => {
    setEmail('');
    setPassword('');
    setDisplayName('');
    setBuyerPhone('+509');
    setStreet('');
    setCity('');
    setStateDept('');
    setPhone('+509');
    setOtp('');
    setOtpSent(false);
    setError('');
    setSuccess('');
    setShowPassword(false);
    setIntent('buyer');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const persistBuyerProfile = async (userId: string) => {
    const name = displayName.trim() || email.split('@')[0] || 'Acheteur';
    await supabase.from('profiles').upsert({
      id: userId,
      display_name: name,
      phone: buyerPhone.trim() || null,
    });
    if (intent === 'buyer') {
      await supabase.from('addresses').insert({
        user_id: userId,
        full_name: name,
        phone: buyerPhone.trim() || null,
        street: street.trim(),
        city: city.trim(),
        state_dept: stateDept,
        country: 'HT',
        is_default: true,
      });
    }
  };

  const handlePhoneSend = async () => {
    setError('');
    setLoading(true);
    const { error: err } = await signInWithPhone(phone);
    if (err) setError(err);
    else {
      setOtpSent(true);
      setSuccess('Code SMS envoyé. Vérifiez votre téléphone.');
    }
    setLoading(false);
  };

  const handlePhoneVerify = async () => {
    setError('');
    setLoading(true);
    const { error: err } = await verifyPhoneOtp(phone, otp);
    if (err) setError(err);
    else {
      reset();
      onClose();
    }
    setLoading(false);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (tab === 'signin') {
      const { error: err } = await signIn(email, password);
      if (err) setError(err);
      else {
        reset();
        onClose();
      }
      setLoading(false);
      return;
    }

    if (intent === 'buyer') {
      if (!displayName.trim()) {
        setError('Indiquez votre nom complet.');
        setLoading(false);
        return;
      }
      if (!street.trim() || !city.trim() || !stateDept) {
        setError('Adresse de livraison incomplète (rue, ville, département).');
        setLoading(false);
        return;
      }
    }

    const { error: err } = await signUp(email, password);
    if (err) {
      setError(err);
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      try {
        if (intent === 'buyer' || displayName.trim() || buyerPhone.trim()) {
          await persistBuyerProfile(user.id);
        } else if (intent === 'seller' && displayName.trim()) {
          await supabase.from('profiles').upsert({
            id: user.id,
            display_name: displayName.trim(),
            phone: buyerPhone.trim() || null,
          });
        }
      } catch (persistErr) {
        console.error(persistErr);
      }
      const chosen = intent;
      reset();
      onClose();
      onSignedUp?.(chosen);
    } else {
      setSuccess(
        intent === 'seller'
          ? 'Compte créé. Connectez-vous, puis ouvrez « Devenir vendeur » pour le dossier KYC.'
          : 'Compte créé. Connectez-vous pour continuer.',
      );
    }
    setLoading(false);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm" onClick={handleClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto pointer-events-auto">
          <div className="bg-brand-dark px-6 py-5 text-white relative sticky top-0 z-10">
            <button onClick={handleClose} className="absolute top-4 right-4 text-slate-400 hover:text-accent">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-1">
              <ShoppingBag className="w-7 h-7 text-accent" />
              <span className="text-xl font-bold">KlirMarket</span>
            </div>
            <p className="text-slate-400 text-sm">{t('authTitle')} · Haïti (+509)</p>
          </div>

          <div className="flex border-b border-gray-100">
            {([
              ['email', t('authEmail')],
              ['phone', t('authPhone')],
            ] as const).map(([m, label]) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(''); setSuccess(''); }}
                className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                  mode === m ? 'text-brand border-b-2 border-brand' : 'text-gray-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="p-6 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
            )}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">{success}</div>
            )}

            {mode === 'phone' ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('authPhone')}</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder={t('phonePlaceholder')}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>
                </div>
                {otpSent && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('otpPlaceholder')}</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={otp}
                      onChange={e => setOtp(e.target.value)}
                      maxLength={8}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm tracking-widest focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>
                )}
                <button
                  type="button"
                  disabled={loading}
                  onClick={otpSent ? handlePhoneVerify : handlePhoneSend}
                  className="w-full bg-brand hover:bg-brand-mid disabled:opacity-60 text-white py-3 rounded-lg font-semibold text-sm"
                >
                  {loading ? '…' : otpSent ? t('verifyCode') : t('sendCode')}
                </button>
                <p className="text-[11px] text-gray-500">
                  Nécessite Phone Auth activé dans Supabase (SMS Twilio). Sinon utilisez l’email.
                </p>
              </>
            ) : (
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div className="flex gap-1 mb-1">
                  {(['signin', 'signup'] as const).map(tKey => (
                    <button
                      key={tKey}
                      type="button"
                      onClick={() => setTab(tKey)}
                      className={`flex-1 py-2 text-xs font-semibold rounded-lg ${
                        tab === tKey ? 'bg-brand-50 text-brand' : 'text-gray-500'
                      }`}
                    >
                      {tKey === 'signin' ? t('signIn') : t('signUp')}
                    </button>
                  ))}
                </div>

                {tab === 'signup' && (
                  <div>
                    <p className="text-sm font-medium text-slate-700 mb-2">{t('accountType')}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setIntent('buyer')}
                        className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-3 text-sm font-semibold transition-colors ${
                          intent === 'buyer'
                            ? 'border-brand bg-brand-50 text-brand'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <User className="w-5 h-5" />
                        {t('accountTypeBuyer')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIntent('seller')}
                        className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-3 text-sm font-semibold transition-colors ${
                          intent === 'seller'
                            ? 'border-brand bg-brand-50 text-brand'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <Store className="w-5 h-5" />
                        {t('accountTypeSeller')}
                      </button>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-2">
                      {intent === 'buyer'
                        ? t('buyerSignupHint')
                        : t('sellerSignupHint')}
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('authEmail')}</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('password')}</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {tab === 'signup' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        {t('fullName')} {intent === 'buyer' && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type="text"
                        value={displayName}
                        onChange={e => setDisplayName(e.target.value)}
                        required={intent === 'buyer'}
                        placeholder="Nom et prénom"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('authPhone')}</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="tel"
                          value={buyerPhone}
                          onChange={e => setBuyerPhone(e.target.value)}
                          placeholder={t('phonePlaceholder')}
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                        />
                      </div>
                    </div>
                  </>
                )}

                {tab === 'signup' && intent === 'buyer' && (
                  <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
                    <p className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-brand" />
                      {t('deliveryAddress')} *
                    </p>
                    <input
                      type="text"
                      value={street}
                      onChange={e => setStreet(e.target.value)}
                      required
                      placeholder="Rue / adresse"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={city}
                        onChange={e => setCity(e.target.value)}
                        required
                        placeholder="Ville"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white"
                      />
                      <select
                        value={stateDept}
                        onChange={e => setStateDept(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white"
                      >
                        <option value="">{t('selectDepartment')}</option>
                        {HAITI_DEPARTMENTS.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-brand hover:bg-brand-mid disabled:opacity-60 text-white py-3 rounded-lg font-semibold text-sm"
                >
                  {loading
                    ? '…'
                    : tab === 'signin'
                      ? t('signIn')
                      : intent === 'seller'
                        ? t('signUpSeller')
                        : t('signUpBuyer')}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
