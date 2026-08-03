import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { normalizeHaitiPhone } from '../lib/whatsapp';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithPhone: (phone: string) => Promise<{ error: string | null }>;
  verifyPhoneOtp: (phone: string, token: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setSession(session);
        setUser(session?.user ?? null);
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined },
    });
    if (error) {
      const msg = /rate limit|over_email/i.test(error.message)
        ? 'Limite d’emails temporaire. Réessayez dans une minute, ou connectez-vous si le compte existe déjà.'
        : error.message;
      return { error: msg };
    }
    if (data.user && !data.session) {
      return {
        error:
          'Compte créé. Si la connexion échoue, utilisez « Se connecter » avec le même email/mot de passe.',
      };
    }
    return { error: null };
  };

  const signInWithPhone = async (phone: string) => {
    const normalized = normalizeHaitiPhone(phone);
    const { error } = await supabase.auth.signInWithOtp({
      phone: normalized,
      options: { channel: 'sms' },
    });
    if (error) {
      const msg = /phone|sms|provider|unsupported/i.test(error.message)
        ? `${error.message} — Activez Phone Auth + SMS (Twilio) dans Supabase.`
        : error.message;
      return { error: msg };
    }
    return { error: null };
  };

  const verifyPhoneOtp = async (phone: string, token: string) => {
    const normalized = normalizeHaitiPhone(phone);
    const { error } = await supabase.auth.verifyOtp({
      phone: normalized,
      token: token.trim(),
      type: 'sms',
    });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{ user, session, loading, signIn, signUp, signInWithPhone, verifyPhoneOtp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
