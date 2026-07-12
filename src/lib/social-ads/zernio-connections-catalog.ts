/** Catalogue plateformes Zernio — style dashboard /connections */
export type ZernioConnectionPlatform = {
  id: string;
  zernioKey: string;
  name: string;
  description: string;
  category: "social" | "ads" | "messaging";
  /** Classes Tailwind pour la tuile (fond dégradé) */
  tileClass: string;
  /** Lettre ou abréviation affichée dans la tuile */
  monogram: string;
};

export const ZERNIO_CONNECTION_PLATFORMS: ZernioConnectionPlatform[] = [
  {
    id: "instagram",
    zernioKey: "instagram",
    name: "Instagram",
    description: "Posts, Stories, Reels et statistiques",
    category: "social",
    tileClass: "from-[#f58529] via-[#dd2a7b] to-[#8134af]",
    monogram: "IG",
  },
  {
    id: "facebook",
    zernioKey: "facebook",
    name: "Facebook",
    description: "Pages, publications et publicités Meta",
    category: "social",
    tileClass: "from-[#1877F2] to-[#0d5bb5]",
    monogram: "f",
  },
  {
    id: "meta",
    zernioKey: "facebook",
    name: "Meta Business",
    description: "Compte publicitaire et gestion Meta",
    category: "ads",
    tileClass: "from-[#0081FB] to-[#0064e0]",
    monogram: "M",
  },
  {
    id: "linkedin",
    zernioKey: "linkedin",
    name: "LinkedIn",
    description: "Page entreprise et posts professionnels",
    category: "social",
    tileClass: "from-[#0A66C2] to-[#004182]",
    monogram: "in",
  },
  {
    id: "tiktok",
    zernioKey: "tiktok",
    name: "TikTok",
    description: "Vidéos courtes et analytics",
    category: "social",
    tileClass: "from-[#010101] to-[#25F4EE]",
    monogram: "TT",
  },
  {
    id: "youtube",
    zernioKey: "youtube",
    name: "YouTube",
    description: "Chaîne, Shorts et planification",
    category: "social",
    tileClass: "from-[#FF0000] to-[#cc0000]",
    monogram: "YT",
  },
  {
    id: "twitter",
    zernioKey: "twitter",
    name: "X (Twitter)",
    description: "Posts et engagement",
    category: "social",
    tileClass: "from-[#14171A] to-[#000000]",
    monogram: "X",
  },
  {
    id: "threads",
    zernioKey: "threads",
    name: "Threads",
    description: "Publications texte et médias",
    category: "social",
    tileClass: "from-[#101010] to-[#333333]",
    monogram: "@",
  },
  {
    id: "pinterest",
    zernioKey: "pinterest",
    name: "Pinterest",
    description: "Épingles et tableaux",
    category: "social",
    tileClass: "from-[#E60023] to-[#bd081c]",
    monogram: "P",
  },
  {
    id: "google",
    zernioKey: "googlebusiness",
    name: "Google Business",
    description: "Fiche locale et avis",
    category: "social",
    tileClass: "from-[#4285F4] via-[#34A853] to-[#FBBC05]",
    monogram: "G",
  },
  {
    id: "reddit",
    zernioKey: "reddit",
    name: "Reddit",
    description: "Communautés et posts",
    category: "social",
    tileClass: "from-[#FF4500] to-[#ff6314]",
    monogram: "R",
  },
  {
    id: "bluesky",
    zernioKey: "bluesky",
    name: "Bluesky",
    description: "Réseau décentralisé",
    category: "social",
    tileClass: "from-[#0085ff] to-[#0066cc]",
    monogram: "B",
  },
  {
    id: "telegram",
    zernioKey: "telegram",
    name: "Telegram",
    description: "Canaux et messages",
    category: "messaging",
    tileClass: "from-[#2AABEE] to-[#229ED9]",
    monogram: "TG",
  },
  {
    id: "whatsapp",
    zernioKey: "whatsapp",
    name: "WhatsApp",
    description: "Business et diffusion",
    category: "messaging",
    tileClass: "from-[#25D366] to-[#128C7E]",
    monogram: "WA",
  },
  {
    id: "snapchat",
    zernioKey: "snapchat",
    name: "Snapchat",
    description: "Stories et profil public",
    category: "social",
    tileClass: "from-[#FFFC00] to-[#f5d300] text-black",
    monogram: "SC",
  },
  {
    id: "discord",
    zernioKey: "discord",
    name: "Discord",
    description: "Serveurs et annonces",
    category: "messaging",
    tileClass: "from-[#5865F2] to-[#4752c4]",
    monogram: "D",
  },
];

export function catalogPlatformById(id: string) {
  return ZERNIO_CONNECTION_PLATFORMS.find((p) => p.id === id);
}

export function catalogPlatformByZernioKey(key: string) {
  const k = key.toLowerCase();
  return (
    ZERNIO_CONNECTION_PLATFORMS.find((p) => p.zernioKey === k) ??
    ZERNIO_CONNECTION_PLATFORMS.find((p) => p.id === k)
  );
}
