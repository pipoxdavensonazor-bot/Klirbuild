import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const unsplash = (id: string, w = 1200) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

async function main() {
  await prisma.message.deleteMany();
  await prisma.seminarRegistration.deleteMany();
  await prisma.socialPost.deleteMany();
  await prisma.socialAccount.deleteMany();
  await prisma.testimonialInvite.deleteMany();
  await prisma.openHouse.deleteMany();
  await prisma.propertyImage.deleteMany();
  await prisma.property.deleteMany();
  await prisma.article.deleteMany();
  await prisma.category.deleteMany();
  await prisma.seminar.deleteMany();
  await prisma.testimonial.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.setting.deleteMany();

  await prisma.profile.create({
    data: {
      name: "Léonne Bien-Aimé",
      title: "Courtière immobilière résidentielle et commerciale",
      slogan: "Des conseils justes. Des résultats concrets.\nHumain et chaleureux.",
      bio: "Depuis 20 ans, j'accompagne familles et investisseurs à Laval, dans les Laurentides et Lanaudière — avec une approche humaine, chaleureuse et orientée résultats. Membre de PROPRIO DIRECT.",
      story:
        "Deux décennies de terrain m'ont appris qu'un bon mandat repose sur l'écoute autant que sur la stratégie.",
      experience:
        "20 années de carrière · Résidentiel & commercial · Laval · Laurentides · Lanaudière · PROPRIO DIRECT",
      degrees: "Formation OACIQ · Développement professionnel continu",
      certifications: "Permis OACIQ valide · PROPRIO DIRECT",
      awards: "Reconnaissance clients · Productivité soutenue sur deux décennies",
      mission:
        "Des conseils justes, des résultats concrets — dans un climat humain et chaleureux.",
      values: "Intégrité · Discrétion · Rigueur · Chaleur humaine",
      languages: "Français · Anglais · Créole",
      photoUrl:
        "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1200&q=80",
      phone: "(514) 574-8712",
      email: "bienaimeleonne_@hotmail.com",
      address: "3899, aut. des Laurentides #200",
      city: "Laval (QC) H7L 3H7",
      whatsapp: "15145748712",
    },
  });

  const blainville = await prisma.property.create({
    data: {
      slug: "maison-34-27e-avenue-ouest-blainville",
      title: "Maison — 34, 27e Avenue Ouest",
      description:
        "Maison à vendre à Blainville. Annonce Centris — Léonne Bien-Aimé (PROPRIO DIRECT).",
      address: "34, 27e Avenue Ouest",
      city: "Blainville",
      price: 589000,
      type: "HOUSE",
      bedrooms: 6,
      bathrooms: 2,
      garage: true,
      areaSqft: 2200,
      status: "AVAILABLE",
      featured: true,
      images: {
        create: [
          { url: unsplash("photo-1600596542815-ffad4c1539a9"), alt: "Façade", sortOrder: 0 },
          { url: unsplash("photo-1600585154340-be6161a56a0c"), alt: "Salon", sortOrder: 1 },
        ],
      },
    },
  });

  const condo = await prisma.property.create({
    data: {
      slug: "condo-50-louis-jolliet-301-saint-jerome",
      title: "Condo — 50 Rue Louis-Jolliet, app. 301",
      description: "Condo à vendre à Saint-Jérôme. Idéal premier acheteur ou investissement.",
      address: "50 Rue Louis-Jolliet, app. 301",
      city: "Saint-Jérôme",
      price: 399999,
      type: "CONDO",
      bedrooms: 2,
      bathrooms: 1,
      garage: true,
      areaSqft: 950,
      status: "AVAILABLE",
      featured: true,
      images: {
        create: [
          { url: unsplash("photo-1502672260266-1c1ef2d93688"), alt: "Condo", sortOrder: 0 },
        ],
      },
    },
  });

  // Visites libres
  const nextSat = new Date();
  nextSat.setDate(nextSat.getDate() + ((6 - nextSat.getDay() + 7) % 7 || 7));
  nextSat.setHours(13, 0, 0, 0);
  const nextSatEnd = new Date(nextSat);
  nextSatEnd.setHours(16, 0, 0, 0);

  const nextSun = new Date(nextSat);
  nextSun.setDate(nextSun.getDate() + 1);
  nextSun.setHours(14, 0, 0, 0);
  const nextSunEnd = new Date(nextSun);
  nextSunEnd.setHours(16, 30, 0, 0);

  await prisma.openHouse.createMany({
    data: [
      {
        propertyId: blainville.id,
        startsAt: nextSat,
        endsAt: nextSatEnd,
        notes: "Visite libre sans rendez-vous. Stationnement sur place.",
        published: true,
      },
      {
        propertyId: condo.id,
        startsAt: nextSun,
        endsAt: nextSunEnd,
        notes: "Porte ouverte — venez découvrir ce condo lumineux.",
        published: true,
      },
    ],
  });

  await prisma.testimonial.createMany({
    data: [
      {
        name: "Isabelle & Marc Tremblay",
        role: "Acheteurs — Laval",
        content:
          "Un accompagnement digne des plus grandes agences, avec une proximité humaine rare.",
        rating: 5,
        featured: true,
        approved: true,
      },
      {
        name: "Antoine Bélanger",
        role: "Vendeur — Outremont",
        content: "Stratégie de mise en marché impeccable. Professionnalisme total.",
        rating: 5,
        featured: true,
        approved: true,
      },
      {
        name: "Camille Nguyen",
        role: "Investisseuse",
        content: "Analyses claires et un réseau de contacts précieux.",
        rating: 5,
        featured: true,
        approved: true,
      },
    ],
  });

  const cats = await Promise.all(
    [
      { name: "Conseils", slug: "conseils" },
      { name: "Actualités", slug: "actualites" },
      { name: "Achat", slug: "achat" },
      { name: "Vente", slug: "vente" },
    ].map((c) => prisma.category.create({ data: c }))
  );

  await prisma.article.createMany({
    data: [
      {
        slug: "visite-libre-comment-se-preparer",
        title: "Visite libre : comment bien se préparer",
        excerpt:
          "Horaires, questions à poser et documents utiles pour tirer le maximum d'une porte ouverte.",
        content:
          "## Avant d'y aller\n\nPréparez votre liste de critères et une préapprobation si possible.\n\n## Sur place\n\nObservez l'état général, le voisinage et posez des questions sur les rénovations.",
        coverUrl: unsplash("photo-1560518883-ce09059eeffa"),
        published: true,
        publishedAt: new Date("2026-07-01"),
        categoryId: cats[0].id,
      },
      {
        slug: "premiere-maison-checklist",
        title: "Acheter sa première maison : la checklist essentielle",
        excerpt:
          "Préapprobation, inspection, taxes scolaires… les étapes à ne pas négliger.",
        content: "## Avant de visiter\n\nObtenez une préapprobation hypothécaire.",
        coverUrl: unsplash("photo-1600047509807-ba8f99d2cd00"),
        published: true,
        publishedAt: new Date("2026-05-10"),
        categoryId: cats[0].id,
      },
      {
        slug: "marche-laval-ete-2026",
        title: "Marché immobilier Laval — aperçu été 2026",
        excerpt:
          "Tendances locales, inventaire et conseils pour acheteurs et vendeurs cet été.",
        content: "## Inventaire\n\nLe marché reste dynamique dans plusieurs secteurs de Laval.",
        coverUrl: unsplash("photo-1560518883-ce09059eeffa"),
        published: true,
        publishedAt: new Date("2026-07-10"),
        categoryId: cats[1].id,
      },
      {
        slug: "preparer-maison-vente",
        title: "Préparer sa maison à la vente : 7 gestes qui comptent",
        excerpt: "Du désencombrement à la mise en scène, maximisez l'attrait dès le premier jour.",
        content: "## Désencombrer\n\nMoins d'objets personnels = plus de projection.",
        coverUrl: unsplash("photo-1600047509807-ba8f99d2cd00"),
        published: true,
        publishedAt: new Date("2026-06-02"),
        categoryId: cats[3].id,
      },
    ],
  });

  await prisma.seminar.createMany({
    data: [
      {
        slug: "seminaire-premier-acheteur",
        title: "Séminaire : Devenir propriétaire en 2026",
        description:
          "Soirée interactive sur le parcours d'achat, le financement et les pièges à éviter.",
        imageUrl: unsplash("photo-1540575467063-178a50c2df87"),
        startsAt: new Date("2026-08-15T18:30:00"),
        location: "Laval — salle communautaire",
        capacity: 40,
        registrationOpen: true,
      },
      {
        slug: "atelier-investissement-locatif",
        title: "Atelier : Investissement locatif rentable",
        description:
          "Analyse de cash-flow, quartiers porteurs et stratégies de mise de fonds.",
        imageUrl: unsplash("photo-1556761175-b413da4baf72"),
        startsAt: new Date("2026-09-10T19:00:00"),
        location: "Saint-Jérôme",
        capacity: 25,
        registrationOpen: true,
      },
    ],
  });

  await prisma.setting.createMany({
    data: [
      { key: "home_hero_cta_primary", value: "Voir les propriétés" },
      {
        key: "centris_profile_url",
        value:
          "https://www.centris.ca/fr/courtier-immobilier~leonne-bien-aime~proprio-direct/e1890",
      },
    ],
  });

  console.log("Seed terminé (profil, annonces, visites libres, articles, séminaires).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
