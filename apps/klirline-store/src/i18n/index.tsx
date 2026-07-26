import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Locale = 'fr' | 'ht';

const STORAGE_KEY = 'klirline_locale';

const dict = {
  fr: {
    deliverTo: 'Livrer à',
    searchPlaceholder: 'Rechercher sur Klirline Store',
    helloSignIn: 'Bonjour, connectez-vous',
    account: 'Compte',
    ordersReturns: 'Commandes',
    savedList: 'Liste',
    cart: 'Panier',
    todaysDeals: 'Offres du jour',
    bestSellers: 'Meilleures ventes',
    sellOnKlirline: 'Vendre',
    signOut: 'Déconnexion',
    langLabel: 'FR',
    authTitle: 'Connexion',
    authPhone: 'Téléphone',
    authEmail: 'Email',
    phonePlaceholder: '+509 XXXX XXXX',
    sendCode: 'Envoyer le code',
    verifyCode: 'Vérifier le code',
    otpPlaceholder: 'Code SMS à 6 chiffres',
    password: 'Mot de passe',
    signIn: 'Se connecter',
    signUp: 'Créer un compte',
    orEmail: 'Ou avec email',
    whatsappHelp: 'Aide WhatsApp',
    whatsappOrder: 'Prévenir le vendeur (WhatsApp)',
    shipping: 'Livraison',
    shippingFee: 'Frais de livraison',
    freeShipping: 'Livraison gratuite',
    subtotal: 'Sous-total',
    total: 'Total',
    payMoncash: 'Payer avec MonCash',
    zoneHint: 'Frais selon le département en Haïti',
  },
  ht: {
    deliverTo: 'Livre nan',
    searchPlaceholder: 'Chèche sou Klirline Store',
    helloSignIn: 'Bonjou, konekte',
    account: 'Kont',
    ordersReturns: 'Lòd',
    savedList: 'Lis',
    cart: 'Panye',
    todaysDeals: 'Ofri jodi a',
    bestSellers: 'Pi vann',
    sellOnKlirline: 'Vann',
    signOut: 'Dekonekte',
    langLabel: 'KR',
    authTitle: 'Koneksyon',
    authPhone: 'Telefòn',
    authEmail: 'Imèl',
    phonePlaceholder: '+509 XXXX XXXX',
    sendCode: 'Voye kòd la',
    verifyCode: 'Verifye kòd la',
    otpPlaceholder: 'Kòd SMS 6 chif',
    password: 'Modpas',
    signIn: 'Konekte',
    signUp: 'Kreye kont',
    orEmail: 'Oswa ak imèl',
    whatsappHelp: 'Èd WhatsApp',
    whatsappOrder: 'Avèti vannè (WhatsApp)',
    shipping: 'Livrezon',
    shippingFee: 'Frè livrezon',
    freeShipping: 'Livrezon gratis',
    subtotal: 'Sou-total',
    total: 'Total',
    payMoncash: 'Peye ak MonCash',
    zoneHint: 'Frè dapre depatman an Ayiti',
  },
} as const;

export type DictKey = keyof typeof dict.fr;

type I18nCtx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: DictKey) => string;
};

const I18nContext = createContext<I18nCtx | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'fr' || saved === 'ht') return saved;
    } catch { /* ignore */ }
    return 'fr';
  });

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch { /* ignore */ }
  };

  useEffect(() => {
    document.documentElement.lang = locale === 'ht' ? 'ht' : 'fr';
  }, [locale]);

  const t = (key: DictKey) => dict[locale][key] ?? dict.fr[key] ?? key;

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within LocaleProvider');
  return ctx;
}
