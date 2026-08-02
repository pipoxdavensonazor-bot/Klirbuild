import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Locale = 'fr' | 'ht';

const STORAGE_KEY = 'klirline_locale';

const dict = {
  fr: {
    deliverTo: 'Livrer à',
    searchPlaceholder: 'Rechercher sur KlirMarket',
    helloSignIn: 'Bonjour, connectez-vous',
    account: 'Compte',
    ordersReturns: 'Commandes',
    savedList: 'Liste',
    cart: 'Panier',
    todaysDeals: 'Offres du jour',
    bestSellers: 'Meilleures ventes',
    newReleases: 'Nouveautés',
    customerService: 'Service client',
    sellOnKlirline: 'Vendre',
    becomeSeller: 'Devenir vendeur',
    accountType: 'Type de compte',
    accountTypeBuyer: 'Acheteur',
    accountTypeSeller: 'Devenir vendeur',
    buyerSignupHint: 'Inscription simple + adresse de livraison pour vos commandes.',
    sellerSignupHint: 'Après création du compte, vous remplirez le dossier vendeur (ID, selfie, Mairie).',
    signUpBuyer: 'Créer mon compte acheteur',
    signUpSeller: 'Créer mon compte & dossier vendeur',
    fullName: 'Nom complet',
    deliveryAddress: 'Adresse de livraison',
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
    shippingByDept: 'Livraison selon département',
    subtotal: 'Sous-total',
    total: 'Total',
    payMoncash: 'Payer avec MonCash',
    proceedCheckout: 'Passer au paiement',
    zoneHint: 'Frais selon le département en Haïti',
    all: 'Tout',
    allDepartments: 'Tous les départements',
    selectDepartment: 'Choisir un département',
    navElectronics: 'Électronique',
    navBooks: 'Livres',
    navFashion: 'Mode',
    navHome: 'Maison',
    navSports: 'Sport',
    shop: 'Boutique',
    shopAll: 'Voir tous les produits',
    createAccount: 'Créer un compte gratuit',
    allDeals: 'Toutes les offres',
    seeAll: 'Tout voir',
    heroPersonalTitle: 'Choisi pour vous — achetez plus vite',
    heroPersonalSub:
      'Votre page d’accueil évolue selon ce que vous consultez, ajoutez au panier et achetez.',
    heroDefaultTitle: 'Le marché Haïti, payé en MonCash',
    heroDefaultSub:
      'Vendeurs locaux dans les 10 départements — solaire, cuisine, mode, tech. Paiement Digicel MonCash sécurisé.',
    loadingStore: 'Chargement de la boutique…',
    continueBrowsing: 'Continuer à parcourir',
    continueBrowsingSub: 'Reprenez là où vous vous êtes arrêté',
    recommended: 'Recommandé pour vous',
    recommendedSub: 'Classé selon votre activité récente sur cet appareil',
    popularNow: 'Populaire en ce moment',
    popularNowSub: 'Sélections les mieux notées en Haïti',
    dealsTitle: 'Offres du jour',
    dealsSub: 'Économies limitées en HTG',
    bestSellersSub: 'Les plus commentés par les acheteurs',
    moreInDept: 'Plus dans',
    moreInDeptSub: 'Selon les départements que vous explorez',
    shoppingCart: 'Panier',
    cartEmpty: 'Votre panier est vide',
    cartEmptyHint: 'Ajoutez des produits pour commencer.',
    continueShopping: 'Continuer vos achats',
    inStock: 'En stock',
    outOfStock: 'Rupture',
    addToCart: 'Ajouter au panier',
    unavailable: 'Indisponible',
    limitedDeal: 'Offre limitée',
    sellerDashboard: 'Espace vendeur',
    myOrders: 'Mes commandes',
    myWishlist: 'Ma liste',
    myAccount: 'Mon compte',
    addProduct: 'Ajouter un produit',
    adminPanel: 'Admin',
    signedInAs: 'Connecté en tant que',
    shopByDepartment: 'Acheter par département',
    signInCreate: 'Connexion / Créer un compte',
    hello: 'Bonjour',
  },
  ht: {
    deliverTo: 'Livre nan',
    searchPlaceholder: 'Chèche sou KlirMarket',
    helloSignIn: 'Bonjou, konekte',
    account: 'Kont',
    ordersReturns: 'Lòd',
    savedList: 'Lis',
    cart: 'Panye',
    todaysDeals: 'Ofri jodi a',
    bestSellers: 'Pi vann',
    newReleases: 'Nouvo',
    customerService: 'Sèvis kliyan',
    sellOnKlirline: 'Vann',
    becomeSeller: 'Vin vannè',
    accountType: 'Kalite kont',
    accountTypeBuyer: 'Achtè',
    accountTypeSeller: 'Vin vannè',
    buyerSignupHint: 'Enskripsyon senp + adrès livrezon pou lòd ou yo.',
    sellerSignupHint: 'Apre kont lan, w ap ranpli dosye vannè (ID, selfie, Meri).',
    signUpBuyer: 'Kreye kont achtè mwen',
    signUpSeller: 'Kreye kont & dosye vannè',
    fullName: 'Non konplè',
    deliveryAddress: 'Adrès livrezon',
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
    shippingByDept: 'Livrezon dapre depatman',
    subtotal: 'Sou-total',
    total: 'Total',
    payMoncash: 'Peye ak MonCash',
    proceedCheckout: 'Ale nan peman',
    zoneHint: 'Frè dapre depatman an Ayiti',
    all: 'Tout',
    allDepartments: 'Tout depatman yo',
    selectDepartment: 'Chwazi yon depatman',
    navElectronics: 'Elektwonik',
    navBooks: 'Liv',
    navFashion: 'Mòd',
    navHome: 'Kay',
    navSports: 'Espò',
    shop: 'Boutik',
    shopAll: 'Wè tout pwodui',
    createAccount: 'Kreye yon kont gratis',
    allDeals: 'Tout ofri',
    seeAll: 'Wè tout',
    heroPersonalTitle: 'Chwazi pou ou — achte pi vit',
    heroPersonalSub:
      'Paj akèy ou chanje dapre sa w gade, mete nan panye epi achte.',
    heroDefaultTitle: 'Mache Ayiti, peye ak MonCash',
    heroDefaultSub:
      'Vannè lokal nan 10 depatman yo — solèy, kwizin, mòd, tech. Peman Digicel MonCash an sekirite.',
    loadingStore: 'Ap chaje boutik la…',
    continueBrowsing: 'Kontinye gade',
    continueBrowsingSub: 'Rekòmanse kote ou te rete a',
    recommended: 'Rekòmande pou ou',
    recommendedSub: 'Klasman dapre aktivite ou sou aparèy sa a',
    popularNow: 'Popilè kounye a',
    popularNowSub: 'Pi bon nòt atravè Ayiti',
    dealsTitle: 'Ofri jodi a',
    dealsSub: 'Ekonomi limite nan HTG',
    bestSellersSub: 'Pi plis komantè pa achtè yo',
    moreInDept: 'Plis nan',
    moreInDeptSub: 'Dapre depatman ou esplore',
    shoppingCart: 'Panye',
    cartEmpty: 'Panye ou vid',
    cartEmptyHint: 'Ajoute pwodui pou kòmanse.',
    continueShopping: 'Kontinye achte',
    inStock: 'Disponib',
    outOfStock: 'Pa disponib',
    addToCart: 'Mete nan panye',
    unavailable: 'Pa disponib',
    limitedDeal: 'Ofri limite',
    sellerDashboard: 'Espas vannè',
    myOrders: 'Lòd mwen',
    myWishlist: 'Lis mwen',
    myAccount: 'Kont mwen',
    addProduct: 'Ajoute yon pwodui',
    adminPanel: 'Admin',
    signedInAs: 'Konekte kòm',
    shopByDepartment: 'Achte pa depatman',
    signInCreate: 'Konekte / Kreye kont',
    hello: 'Bonjou',
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
