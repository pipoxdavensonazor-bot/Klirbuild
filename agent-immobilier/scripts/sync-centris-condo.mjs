#!/usr/bin/env node
/**
 * Enrichit la fiche condo Centris #28226321 sur le site live (admin API).
 * Usage: node scripts/sync-centris-condo.mjs
 * Needs: LEONNE_ADMIN_PASSWORD or /tmp/leonne-admin-password.txt
 */
import { readFileSync, writeFileSync } from "node:fs";

const BASE = process.env.LEONNE_SITE_URL || "https://leonnebienaime.ca";
const PASS =
  process.env.LEONNE_ADMIN_PASSWORD ||
  (() => {
    try {
      return readFileSync("/tmp/leonne-admin-password.txt", "utf8").trim();
    } catch {
      return "liq5KKqnvfG6EXK0uy0YQDYiSmm0";
    }
  })();

const MEDIA_IDS = [
  "ADDD250DE614ADFDDDDDDDDDDB",
  "ADDD250DDD1B4FEDDDDDDDDDDB",
  "ADDD250DDDD1DE7DDDDDDDDDDB",
  "ADDD250DE614AD8DDDDDDDDDDA",
  "ADDD250DE614AD9DDDDDDDDDD0",
  "ADDD250DE614AD3DDDDDDDDDDF",
  "ADDD250DE614AD5DDDDDDDDDDD",
  "ADDD250DE614AD6DDDDDDDDDD1",
  "ADDD250DE614A11DDDDDDDDDD1",
  "ADDD250DE614A14DDDDDDDDDD4",
  "ADDD250DE614A1CDDDDDDDDDDC",
  "ADDD250DE614A1EDDDDDDDDDDE",
  "ADDD250DE614A1BDDDDDDDDDDB",
  "ADDD250DE614A1FDDDDDDDDDDF",
  "ADDD250DE614A19DDDDDDDDDDB",
  "ADDD250DE614A17DDDDDDDDDDF",
  "ADDD250DE614A16DDDDDDDDDD4",
  "ADDD250DE614A4DDDDDDDDDDD1",
  "ADDD250DE614A41DDDDDDDDDD4",
  "ADDD250DE614A42DDDDDDDDDDC",
  "ADDD250DE614A4CDDDDDDDDDDE",
  "ADDD250DE614A40DDDDDDDDDDB",
  "ADDD250DE614A4FDDDDDDDDDDD",
  "ADDD250DE614A48DDDDDDDDDDB",
  "ADDD250DE614A49DDDDDDDDDDF",
];

const images = MEDIA_IDS.map(
  (id) =>
    `https://mspublic.centris.ca/media.ashx?id=${id}&t=pi&w=1260&h=1024&sm=c`
);

const description = `
<p><strong>Condo clé en main à Saint-Jérôme</strong> — localisation stratégique, opportunité à saisir.</p>
<p>Vous recherchez un condo à vendre à Saint-Jérôme offrant confort, luminosité et accessibilité&nbsp;? Cette propriété située au <strong>50, rue Louis-Jolliet, app.&nbsp;301</strong> est une occasion à ne pas manquer dans le secteur prisé des Laurentides.</p>
<p>Dès votre entrée, vous serez charmé par une <strong>aire de vie ouverte baignée de lumière naturelle</strong>, créant un espace chaleureux et invitant. Parfait pour recevoir ou simplement profiter d’un quotidien agréable, ce condo combine fonctionnalité et bien-être. La cuisine propose un espace pratique avec rangement optimisé, s’ouvrant sur un salon convivial.</p>
<p>Idéal pour un premier acheteur, un couple ou un investisseur à la recherche d’une propriété clé en main près des services, commerces et accès routiers de Saint-Jérôme.</p>

<h3>Caractéristiques</h3>
<ul>
  <li><strong>Type :</strong> Condo (copropriété divise)</li>
  <li><strong>Pièces :</strong> 8</li>
  <li><strong>Chambres :</strong> 2</li>
  <li><strong>Salle de bain :</strong> 1</li>
  <li><strong>Superficie nette :</strong> 1&nbsp;192&nbsp;pi²</li>
  <li><strong>Année de construction :</strong> 2009</li>
  <li><strong>Date d’emménagement :</strong> 60&nbsp;jours après l’acceptation de la promesse d’achat</li>
</ul>

<h3>Détails financiers</h3>
<ul>
  <li><strong>Prix demandé :</strong> 399&nbsp;999&nbsp;$</li>
  <li><strong>Évaluation municipale (2024) :</strong> terrain 96&nbsp;000&nbsp;$ + bâtiment 268&nbsp;000&nbsp;$ = <strong>364&nbsp;000&nbsp;$</strong></li>
  <li><strong>Taxes municipales (2026) :</strong> 2&nbsp;597&nbsp;$</li>
  <li><strong>Taxes scolaires (2026) :</strong> 1&nbsp;$</li>
  <li><strong>Total taxes :</strong> 2&nbsp;598&nbsp;$ / an</li>
  <li><strong>Frais de copropriété :</strong> 226&nbsp;$ / mois</li>
</ul>

<p><strong>Nº Centris :</strong> <a href="https://www.centris.ca/fr/condo~a-vendre~saint-jerome/28226321" target="_blank" rel="noopener noreferrer">28226321</a> — courtier inscripteur&nbsp;: Léonne Bien-Aimé, PROPRIO DIRECT.</p>
`.trim();

const cookieJar = "/tmp/leonne-sync.cookie";

async function login() {
  const res = await fetch(`${BASE}/api/admin/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password: PASS }),
    redirect: "manual",
  });
  const setCookie = res.headers.getSetCookie?.() || [];
  const raw = setCookie.length
    ? setCookie.map((c) => c.split(";")[0]).join("; ")
    : res.headers.get("set-cookie")?.split(",")[0]?.split(";")[0];
  if (!res.ok) {
    throw new Error(`Login failed: ${res.status} ${await res.text()}`);
  }
  // Node fetch may expose getSetCookie
  let cookie = "";
  if (typeof res.headers.getSetCookie === "function") {
    cookie = res.headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .join("; ");
  } else {
    const sc = res.headers.get("set-cookie") || "";
    cookie = sc
      .split(/,(?=[^;]+?=)/)
      .map((c) => c.split(";")[0].trim())
      .filter(Boolean)
      .join("; ");
  }
  writeFileSync(cookieJar, cookie);
  return cookie;
}

async function main() {
  const cookie = await login();
  const listRes = await fetch(`${BASE}/api/properties`, {
    headers: { cookie },
  });
  const list = await listRes.json();
  if (!Array.isArray(list)) throw new Error("properties list invalid");

  const slug = "condo-50-louis-jolliet-301-saint-jerome";
  const existing = list.find((p) => p.slug === slug);

  const payload = {
    id: existing?.id,
    slug,
    title: "Condo — 50 Rue Louis-Jolliet, app. 301",
    description,
    address: "50, Rue Louis-Jolliet, app. 301",
    city: "Saint-Jérôme",
    price: 399999,
    type: "CONDO",
    bedrooms: 2,
    bathrooms: 1,
    garage: false,
    areaSqft: 1192,
    status: "AVAILABLE",
    featured: true,
    imageUrl: images[0],
    images,
    mapEmbedUrl:
      "https://maps.google.com/maps?q=45.762861,-74.012639&z=16&output=embed",
  };

  const method = existing ? "PUT" : "POST";
  const res = await fetch(`${BASE}/api/properties`, {
    method,
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${method} failed ${res.status}: ${text.slice(0, 500)}`);
  }
  console.log(`${method} OK`, text.slice(0, 300));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
