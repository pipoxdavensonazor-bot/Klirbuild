/** Pure helpers for the /reset-password screen. No Supabase client here. */

export type AuthRedirectSnapshot = {
  code: string | null;
  tokenHash: string | null;
  type: string | null;
  error: string | null;
  errorCode: string | null;
  errorDescription: string | null;
  accessToken: string | null;
};

export const emptyAuthRedirectSnapshot: AuthRedirectSnapshot = {
  code: null,
  tokenHash: null,
  type: null,
  error: null,
  errorCode: null,
  errorDescription: null,
  accessToken: null,
};

export type ResetPhase = 'checking' | 'ready' | 'expired' | 'invalid' | 'success';

/** Search params win over the hash, same precedence as supabase-js. */
export function readAuthRedirectSnapshot(href: string): AuthRedirectSnapshot {
  const url = new URL(href, 'https://klirline.com');
  const hash = new URLSearchParams(url.hash.startsWith('#') ? url.hash.slice(1) : '');
  const pick = (key: string) => url.searchParams.get(key) || hash.get(key);
  return {
    code: pick('code'),
    tokenHash: pick('token_hash'),
    type: pick('type'),
    error: pick('error'),
    errorCode: pick('error_code'),
    errorDescription: pick('error_description'),
    accessToken: pick('access_token'),
  };
}

function errorBlob(snapshot: AuthRedirectSnapshot): string {
  return `${snapshot.errorCode ?? ''} ${snapshot.error ?? ''} ${snapshot.errorDescription ?? ''}`.toLowerCase();
}

/**
 * Decide what the reset page should show.
 * PKCE (default supabase-js) emits SIGNED_IN, not PASSWORD_RECOVERY, after a
 * recovery code exchange. Implicit links and verifyOtp still emit PASSWORD_RECOVERY.
 */
export function decideResetPhase(input: {
  snapshot: AuthRedirectSnapshot;
  passwordRecoveryEvent: boolean;
  signedInEvent: boolean;
  pendingPkcePasswordRecovery: boolean;
}): Exclude<ResetPhase, 'success'> {
  const snapshot = input.snapshot;
  if (snapshot.error || snapshot.errorCode || snapshot.errorDescription) {
    return errorBlob(snapshot).includes('expir') ? 'expired' : 'invalid';
  }

  const hasCode = Boolean(snapshot.code);
  const tokenHashRecovery = Boolean(snapshot.tokenHash && snapshot.type === 'recovery');
  const implicitRecovery = Boolean(snapshot.accessToken && snapshot.type === 'recovery');
  const attempt = hasCode || tokenHashRecovery || implicitRecovery;
  if (!attempt) return 'invalid';

  if (input.passwordRecoveryEvent) return 'ready';
  if (input.signedInEvent && input.pendingPkcePasswordRecovery && hasCode) return 'ready';

  // Code without the verifier stored by resetPasswordForEmail cannot be exchanged.
  if (hasCode && !input.pendingPkcePasswordRecovery && !tokenHashRecovery && !implicitRecovery) {
    return 'invalid';
  }

  return 'checking';
}

/**
 * token_hash to send to Supabase verifyOtp, or null when the link is not a
 * token-hash-only recovery link (PKCE code and implicit access_token links are
 * completed by supabase-js itself). Returning a value never grants access: the
 * reset form only opens once Supabase accepts the token server-side.
 */
export function recoveryTokenHashToVerify(snapshot: AuthRedirectSnapshot): string | null {
  if (!snapshot.tokenHash) return null;
  if (snapshot.type !== 'recovery') return null;
  if (snapshot.code || snapshot.accessToken) return null;
  return snapshot.tokenHash;
}

export function validateNewPassword(
  password: string,
  confirmation: string,
): 'ok' | 'short' | 'mismatch' {
  if (password.length < 8) return 'short';
  if (password !== confirmation) return 'mismatch';
  return 'ok';
}
