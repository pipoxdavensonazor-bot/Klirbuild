import { describe, expect, it } from 'vitest';
import {
  decideResetPhase,
  readAuthRedirectSnapshot,
  recoveryTokenHashToVerify,
} from './password-recovery';

const snap = (path: string) => readAuthRedirectSnapshot(`https://klirline.com${path}`);

describe('recoveryTokenHashToVerify', () => {
  it('returns the token_hash of a token-hash recovery link', () => {
    expect(recoveryTokenHashToVerify(snap('/reset-password?token_hash=abc123&type=recovery'))).toBe('abc123');
  });

  it('reads token_hash from the hash fragment too', () => {
    expect(recoveryTokenHashToVerify(snap('/reset-password#token_hash=h1&type=recovery'))).toBe('h1');
  });

  it('ignores token_hash links that are not recovery links', () => {
    expect(recoveryTokenHashToVerify(snap('/reset-password?token_hash=abc&type=signup'))).toBeNull();
    expect(recoveryTokenHashToVerify(snap('/reset-password?token_hash=abc'))).toBeNull();
  });

  it('leaves PKCE code and implicit access_token links to supabase-js', () => {
    expect(recoveryTokenHashToVerify(snap('/reset-password?code=pkce&token_hash=abc&type=recovery'))).toBeNull();
    expect(recoveryTokenHashToVerify(snap('/reset-password#access_token=at&token_hash=abc&type=recovery'))).toBeNull();
    expect(recoveryTokenHashToVerify(snap('/reset-password?code=pkce'))).toBeNull();
  });

  it('returns null without any token', () => {
    expect(recoveryTokenHashToVerify(snap('/reset-password'))).toBeNull();
    expect(recoveryTokenHashToVerify(snap('/reset-password?type=recovery'))).toBeNull();
  });
});

describe('decideResetPhase', () => {
  const base = { passwordRecoveryEvent: false, signedInEvent: false, pendingPkcePasswordRecovery: false };

  it('never opens the form from the URL alone for a token-hash link', () => {
    expect(decideResetPhase({ ...base, snapshot: snap('/reset-password?token_hash=x&type=recovery') })).toBe('checking');
  });

  it('opens the form once Supabase emits PASSWORD_RECOVERY', () => {
    expect(
      decideResetPhase({ ...base, passwordRecoveryEvent: true, snapshot: snap('/reset-password?token_hash=x&type=recovery') }),
    ).toBe('ready');
  });

  it('accepts a PKCE code only with the stored verifier and SIGNED_IN', () => {
    expect(decideResetPhase({ ...base, snapshot: snap('/reset-password?code=c') })).toBe('invalid');
    expect(
      decideResetPhase({ ...base, signedInEvent: true, pendingPkcePasswordRecovery: true, snapshot: snap('/reset-password?code=c') }),
    ).toBe('ready');
  });

  it('rejects a bare page and reports expired links', () => {
    expect(decideResetPhase({ ...base, snapshot: snap('/reset-password') })).toBe('invalid');
    expect(
      decideResetPhase({ ...base, snapshot: snap('/reset-password#error=access_denied&error_description=Email+link+is+invalid+or+has+expired') }),
    ).toBe('expired');
  });
});
