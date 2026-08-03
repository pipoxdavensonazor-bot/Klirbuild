/** Document head helpers — SEO + geographic / generative (GEO) signals. */

export const SITE = {
  name: 'KlirMarket',
  company: 'Klirline Inc.',
  url: 'https://klirline.com',
  logo: 'https://klirline.com/klirmarket-cart.png',
  locale: 'fr_HT',
  localeAlt: 'ht_HT',
  language: 'fr',
  country: 'HT',
  placeName: 'Haïti',
  city: 'Port-au-Prince',
  /** Approx. centre Port-au-Prince */
  latitude: 18.5944,
  longitude: -72.3074,
  email: 'Contact@klirline.ca',
  sameAs: [
    'https://www.instagram.com/klirlineofficial/',
    'https://x.com/klirlineOffice',
    'https://www.klirline.ca/',
    'https://klirline.app',
  ],
} as const;

const HOME_TITLE = 'KlirMarket — Marketplace Haïti | MonCash, NatCash, carte';
const HOME_DESC =
  'Marketplace multi-vendeurs en Haïti : achetez local en HTG, payez Digicel MonCash, NatCash ou carte. Livraison dans les 10 départements, fonds en séquestre jusqu’à livraison.';

function ensureMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function ensureLink(rel: string, href: string, hreflang?: string) {
  const sel = hreflang
    ? `link[rel="${rel}"][hreflang="${hreflang}"]`
    : `link[rel="${rel}"]:not([hreflang])`;
  let el = document.querySelector(sel) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.rel = rel;
    if (hreflang) el.hreflang = hreflang;
    document.head.appendChild(el);
  }
  el.href = href;
}

export function upsertJsonLd(id: string, data: Record<string, unknown> | Record<string, unknown>[]) {
  let script = document.getElementById(id) as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement('script');
    script.id = id;
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
}

export function removeJsonLd(id: string) {
  document.getElementById(id)?.remove();
}

export function setCanonical(url: string) {
  ensureLink('canonical', url);
}

/** Organization + OnlineStore + WebSite + FAQ — entity clarity for search & AI. */
export function siteGraphJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE.url}/#organization`,
        name: SITE.company,
        legalName: SITE.company,
        url: SITE.url,
        logo: {
          '@type': 'ImageObject',
          url: SITE.logo,
        },
        email: SITE.email,
        sameAs: [...SITE.sameAs],
        address: {
          '@type': 'PostalAddress',
          addressCountry: SITE.country,
          addressLocality: SITE.city,
        },
        areaServed: {
          '@type': 'Country',
          name: 'Haiti',
          alternateName: 'Haïti',
        },
      },
      {
        '@type': 'OnlineStore',
        '@id': `${SITE.url}/#store`,
        name: SITE.name,
        url: SITE.url,
        image: SITE.logo,
        description: HOME_DESC,
        parentOrganization: { '@id': `${SITE.url}/#organization` },
        currenciesAccepted: 'HTG',
        paymentAccepted: 'MonCash, NatCash, Credit Card, Debit Card',
        areaServed: {
          '@type': 'Country',
          name: 'Haiti',
          geo: {
            '@type': 'GeoCoordinates',
            latitude: SITE.latitude,
            longitude: SITE.longitude,
          },
        },
        availableLanguage: ['fr', 'ht'],
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE.url}/#website`,
        url: SITE.url,
        name: SITE.name,
        description: HOME_DESC,
        inLanguage: ['fr-HT', 'ht'],
        publisher: { '@id': `${SITE.url}/#organization` },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${SITE.url}/?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'FAQPage',
        '@id': `${SITE.url}/#faq`,
        mainEntity: [
          {
            '@type': 'Question',
            name: 'Comment payer sur KlirMarket en Haïti ?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Vous pouvez payer en gourdes (HTG) via Digicel MonCash, NatCash (selon disponibilité) ou par carte bancaire via Stripe. Le guest checkout permet de commander avec un email sans créer de compte.',
            },
          },
          {
            '@type': 'Question',
            name: 'Qu’est-ce que le séquestre KlirMarket ?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Le paiement est conservé jusqu’à confirmation de livraison. Le vendeur est crédité après livraison, moins la commission plateforme de 8 %.',
            },
          },
          {
            '@type': 'Question',
            name: 'Dans quels départements livrez-vous ?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'KlirMarket livre dans les 10 départements d’Haïti : Ouest, Nord, Nord-Est, Nord-Ouest, Artibonite, Centre, Sud, Sud-Est, Grand’Anse et Nippes. Les frais varient selon le département.',
            },
          },
          {
            '@type': 'Question',
            name: 'Comment devenir vendeur sur KlirMarket ?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Créez un compte, puis soumettez le dossier vendeur (pièce d’identité, selfie et preuve Mairie). Après validation KYC, vous pouvez publier des produits en HTG.',
            },
          },
        ],
      },
    ],
  };
}

export function applyHomeSeo() {
  document.title = HOME_TITLE;
  document.documentElement.lang = 'fr';
  ensureMeta('name', 'description', HOME_DESC);
  ensureMeta(
    'name',
    'keywords',
    'marketplace Haïti, MonCash, NatCash, achat en ligne Haïti, vendeurs locaux, Port-au-Prince, HTG, KlirMarket, Digicel',
  );
  ensureMeta('name', 'geo.region', 'HT');
  ensureMeta('name', 'geo.placename', `${SITE.city}, ${SITE.placeName}`);
  ensureMeta('name', 'geo.position', `${SITE.latitude};${SITE.longitude}`);
  ensureMeta('name', 'ICBM', `${SITE.latitude}, ${SITE.longitude}`);
  ensureMeta('name', 'robots', 'index, follow, max-image-preview:large, max-snippet:-1');
  ensureMeta('property', 'og:type', 'website');
  ensureMeta('property', 'og:site_name', SITE.name);
  ensureMeta('property', 'og:title', HOME_TITLE);
  ensureMeta('property', 'og:description', HOME_DESC);
  ensureMeta('property', 'og:url', SITE.url);
  ensureMeta('property', 'og:image', SITE.logo);
  ensureMeta('property', 'og:locale', SITE.locale);
  ensureMeta('property', 'og:locale:alternate', SITE.localeAlt);
  ensureMeta('name', 'twitter:card', 'summary_large_image');
  ensureMeta('name', 'twitter:title', HOME_TITLE);
  ensureMeta('name', 'twitter:description', HOME_DESC);
  ensureMeta('name', 'twitter:image', SITE.logo);
  setCanonical(SITE.url + '/');
  ensureLink('alternate', SITE.url + '/', 'fr-HT');
  ensureLink('alternate', SITE.url + '/', 'ht');
  ensureLink('alternate', SITE.url + '/', 'x-default');
  upsertJsonLd('site-jsonld', siteGraphJsonLd());
  removeJsonLd('product-jsonld');
}

export type ProductSeoInput = {
  id: string;
  name: string;
  description: string | null;
  image_url: string;
  images?: string[] | null;
  brand?: string | null;
  in_stock: boolean;
  rating: number;
  review_count: number;
  seller_shop_name?: string | null;
  seller_department?: string | null;
  department?: string | null;
  price: number;
  pageUrl: string;
};

export function applyProductSeo(p: ProductSeoInput) {
  const title = `${p.name} · Acheter en Haïti | ${SITE.name}`;
  const rawDesc = (p.description || p.name).replace(/\s+/g, ' ').trim();
  const deptHint = p.seller_department || p.department;
  const desc = (
    deptHint
      ? `${rawDesc} — vendeur ${SITE.placeName}${p.seller_department ? ` (${p.seller_department})` : ''}. Prix HTG, paiement MonCash.`
      : `${rawDesc} — disponible sur ${SITE.name}, marketplace Haïti. Prix HTG.`
  ).slice(0, 160);

  document.title = title;
  ensureMeta('name', 'description', desc);
  ensureMeta('name', 'robots', 'index, follow, max-image-preview:large');
  ensureMeta('property', 'og:title', title);
  ensureMeta('property', 'og:description', desc);
  ensureMeta('property', 'og:image', p.image_url || SITE.logo);
  ensureMeta('property', 'og:type', 'product');
  ensureMeta('property', 'og:url', p.pageUrl);
  ensureMeta('property', 'product:price:amount', String(p.price));
  ensureMeta('property', 'product:price:currency', 'HTG');
  ensureMeta('name', 'twitter:card', 'summary_large_image');
  ensureMeta('name', 'twitter:title', title);
  ensureMeta('name', 'twitter:description', desc);
  ensureMeta('name', 'twitter:image', p.image_url || SITE.logo);
  setCanonical(p.pageUrl);

  const images = [p.image_url, ...(p.images ?? [])].filter(Boolean);
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: p.description || p.name,
    image: images.length <= 1 ? images[0] : images,
    sku: p.id,
    productID: p.id,
    brand: p.brand ? { '@type': 'Brand', name: p.brand } : { '@type': 'Brand', name: SITE.name },
    category: p.department || undefined,
    offers: {
      '@type': 'Offer',
      url: p.pageUrl,
      priceCurrency: 'HTG',
      price: p.price,
      availability: p.in_stock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: {
        '@type': 'Organization',
        name: p.seller_shop_name || SITE.name,
      },
      areaServed: {
        '@type': 'Country',
        name: 'Haiti',
      },
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingDestination: {
          '@type': 'DefinedRegion',
          addressCountry: 'HT',
        },
      },
    },
  };

  if (p.review_count > 0 && p.rating > 0) {
    jsonLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: p.rating,
      reviewCount: p.review_count,
      bestRating: 5,
      worstRating: 1,
    };
  }

  upsertJsonLd('product-jsonld', jsonLd);
}

export function applyLegalSeo(slug: string, pageTitle: string) {
  const title = `${pageTitle} | ${SITE.name} Haïti`;
  const desc = `${pageTitle} — ${SITE.name}, marketplace multi-vendeurs en Haïti (MonCash, séquestre, livraison nationale).`;
  const url = `${SITE.url}/${slug}`;
  document.title = title;
  ensureMeta('name', 'description', desc);
  ensureMeta('property', 'og:title', title);
  ensureMeta('property', 'og:description', desc);
  ensureMeta('property', 'og:url', url);
  ensureMeta('property', 'og:type', 'website');
  setCanonical(url);
  removeJsonLd('product-jsonld');
}

export { HOME_TITLE, HOME_DESC };
