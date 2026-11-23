import { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, Lock, ShoppingBag } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../i18n';
import {
  decideResetPhase,
  readAuthRedirectSnapshot,
  recoveryTokenHashToVerify,
  validateNewPassword,
  type AuthRedirectSnapshot,
  type ResetPhase,
} from '../lib/password-recovery';
import {
  authRedirectSnapshot,
  pendingPkcePasswordRecovery,
  peekAuthSignals,
  subscribeAuthSignals,
  verifyRecoveryTokenHash,
} from '../lib/supabase';

type ResetPasswordPageProps = {
  onDone: () => void;
};

function pageSnapshot(): AuthRedirectSnapshot {
  if (typeof window === 'undefined') return authRedirectSnapshot;
  const live = readAuthRedirectSnapshot(window.location.href);
  if (
    live.code ||
    live.accessToken ||
    live.tokenHash ||
    live.error ||
    live.errorCode ||
    live.errorDescription
  ) {
    return live;
  }
  return authRedirectSnapshot;
}

function phaseFor(snapshot: AuthRedirectSnapshot): Exclude<ResetPhase, 'success'> {
  const signals = peekAuthSignals();
  return decideResetPhase({
    snapshot,
    passwordRecoveryEvent: signals.passwordRecovery,
    signedInEvent: signals.signedIn,
    pendingPkcePasswordRecovery,
  });
}

/**
 * Sends a token-hash recovery link to Supabase for server-side verification.
 * Returns false (nothing sent) when the link carries no token_hash to verify.
 */
function startTokenHashVerification(
  snapshot: AuthRedirectSnapshot,
  settle: (next: Exclude<ResetPhase, 'success'>) => void,
): boolean {
  const tokenHash = recoveryTokenHashToVerify(snapshot);
  if (!tokenHash) return false;
  void verifyRecoveryTokenHash(tokenHash).then((result) => {
    if (result.ok) settle('ready');
    else settle(result.expired ? 'expired' : 'invalid');
  });
  return true;
}

export function ResetPasswordPage({ onDone }: ResetPasswordPageProps) {
  const { t, locale, setLocale } = useI18n();
  const { updatePassword } = useAuth();
  const snapshotRef = useRef<AuthRedirectSnapshot | null>(null);
  if (!snapshotRef.current) snapshotRef.current = pageSnapshot();
  const snapshot = snapshotRef.current;
  const [phase, setPhase] = useState<ResetPhase>(() => phaseFor(snapshot));
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const previous = document.title;
    document.title = `${t('resetTitle')} — KlirMarket`;
    return () => {
      document.title = previous;
    };
  }, [t]);

  useEffect(() => {
    if (phase !== 'checking') return;
    let settled = false;
    const settle = (next: Exclude<ResetPhase, 'success'>) => {
      if (settled) return;
      settled = true;
      setPhase(next);
    };

    const applySignals = () => {
      const next = phaseFor(snapshot);
      if (next !== 'checking') settle(next);
    };

    const unsubscribe = subscribeAuthSignals(applySignals);
    // Token-hash links are confirmed by Supabase (verifyOtp); the form only
    // opens when the server accepts the token. Other links wait for auth events.
    const verifying = startTokenHashVerification(snapshot, settle);

    const timer = verifying
      ? undefined
      : window.setTimeout(() => settle('invalid'), 8000);

    return () => {
      settled = true;
      unsubscribe();
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [phase, snapshot]);

  useEffect(() => {
    if (phase !== 'success') return;
    const timer = window.setTimeout(() => onDoneRef.current(), 2200);
    return () => window.clearTimeout(timer);
  }, [phase]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    const check = validateNewPassword(password, confirmation);
    if (check === 'short') {
      setError(t('passwordTooShort'));
      return;
    }
    if (check === 'mismatch') {
      setError(t('passwordMismatch'));
      return;
    }
    setLoading(true);
    const { error: err, reason } = await updatePassword(password);
    setLoading(false);
    if (reason === 'expired') {
      setPhase('expired');
      return;
    }
    if (reason === 'invalid') {
      setPhase('invalid');
      return;
    }
    if (err) {
      setError(err);
      return;
    }
    setPhase('success');
  };

  return (
    <div className="min-h-screen bg-haiti-sand flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-brand-dark px-6 py-5 text-white flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-7 h-7 text-accent" />
              <span className="text-xl font-bold">KlirMarket</span>
            </div>
            <p className="text-slate-300 text-sm mt-1">{t('resetTitle')}</p>
          </div>
          <button
            type="button"
            onClick={() => setLocale(locale === 'fr' ? 'ht' : 'fr')}
            className="min-w-[2.25rem] h-9 px-2 rounded border border-white/20 text-xs font-bold hover:bg-white/10"
            title="FR / Kreyòl"
          >
            {t('langLabel')}
          </button>
        </div>

        <div className="p-6 space-y-4">
          {phase === 'checking' && (
            <p className="text-sm text-gray-600">{t('resetChecking')}</p>
          )}

          {(phase === 'invalid' || phase === 'expired') && (
            <>
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                {phase === 'expired' ? t('resetLinkExpired') : t('resetLinkInvalid')}
              </div>
              <button
                type="button"
                onClick={onDone}
                className="w-full bg-brand hover:bg-brand-mid text-white py-3 rounded-lg font-semibold text-sm"
              >
                {t('backToShop')}
              </button>
            </>
          )}

          {phase === 'success' && (
            <>
              <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">
                {t('resetSuccess')}
              </div>
              <button
                type="button"
                onClick={onDone}
                className="w-full bg-brand hover:bg-brand-mid text-white py-3 rounded-lg font-semibold text-sm"
              >
                {t('backToShop')}
              </button>
            </>
          )}

          {phase === 'ready' && (
            <form onSubmit={(event) => { void handleSubmit(event); }} className="space-y-4">
              <p className="text-sm text-gray-600">{t('resetHint')}</p>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                  {error}
                </div>
              )}
              <div>
                <label htmlFor="new-password" className="block text-sm font-medium text-slate-700 mb-1.5">
                  {t('newPassword')}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    aria-label={showPassword ? 'Masquer' : 'Afficher'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-700 mb-1.5">
                  {t('confirmPassword')}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmation}
                    onChange={(event) => setConfirmation(event.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand hover:bg-brand-mid disabled:opacity-60 text-white py-3 rounded-lg font-semibold text-sm"
              >
                {loading ? '…' : t('savePassword')}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
