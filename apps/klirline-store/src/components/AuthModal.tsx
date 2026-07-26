import { useState } from 'react';
import { X, Mail, Lock, Eye, EyeOff, ShoppingBag, Phone } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../i18n';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'signin' | 'signup';
}

type Mode = 'phone' | 'email';

export const AuthModal = ({ isOpen, onClose, defaultTab = 'signin' }: AuthModalProps) => {
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>('phone');
  const [tab, setTab] = useState<'signin' | 'signup'>(defaultTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    setPhone('+509');
    setOtp('');
    setOtpSent(false);
    setError('');
    setSuccess('');
    setShowPassword(false);
  };

  const handleClose = () => {
    reset();
    onClose();
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
    } else {
      const { error: err } = await signUp(email, password);
      if (err) setError(err);
      else {
        setSuccess('Compte créé. Vous pouvez vous connecter.');
        setTab('signin');
        setPassword('');
      }
    }
    setLoading(false);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm" onClick={handleClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden pointer-events-auto">
          <div className="bg-brand-dark px-6 py-5 text-white relative">
            <button onClick={handleClose} className="absolute top-4 right-4 text-slate-400 hover:text-accent">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-1">
              <ShoppingBag className="w-7 h-7 text-accent" />
              <span className="text-xl font-bold">Klirline Store</span>
            </div>
            <p className="text-slate-400 text-sm">{t('authTitle')} · Haïti (+509)</p>
          </div>

          <div className="flex border-b border-gray-100">
            {([
              ['phone', t('authPhone')],
              ['email', t('authEmail')],
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
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-brand hover:bg-brand-mid disabled:opacity-60 text-white py-3 rounded-lg font-semibold text-sm"
                >
                  {loading ? '…' : tab === 'signin' ? t('signIn') : t('signUp')}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
