#!/usr/bin/env node
/**
 * Upload fiche Play Store KlirBuild (fr-FR) : textes + icône + feature graphic.
 *
 * Secrets (un des deux) :
 *   GOOGLE_PLAY_SERVICE_ACCOUNT_JSON  — JSON brut OU chemin vers .json
 *   GOOGLE_PLAY_SERVICE_ACCOUNT_FILE  — chemin vers la clé JSON
 *
 * Variables optionnelles :
 *   PLAY_PACKAGE          — défaut: app.klirline.klirbuild
 *   PLAY_LISTING_LANG     — défaut: fr-FR
 *   PLAY_LISTING_DIR      — défaut: play/listing/<lang>
 *   PLAY_ICON_PATH        — défaut: play/listing/graphics/icon.png
 *   PLAY_FEATURE_PATH     — défaut: play/listing/graphics/featureGraphic.png
 *   PLAY_LISTING_DRAFT=1  — crée l’edit sans commit (debug)
 *
 * Usage :
 *   export GOOGLE_PLAY_SERVICE_ACCOUNT_JSON="$(cat ./play-sa.json)"
 *   npm run play:listing
 *
 * Miroir prévu : scripts/play-listing-klirmarket.mjs (même schéma API).
 */
import { createReadStream, existsSync, readFileSync } from "fs";
import { google } from "googleapis";
import path from "path";

const PACKAGE = process.env.PLAY_PACKAGE || "app.klirline.klirbuild";
const LANG = process.env.PLAY_LISTING_LANG || "fr-FR";
const LISTING_DIR = path.resolve(
  process.env.PLAY_LISTING_DIR || path.join("play", "listing", LANG)
);
const ICON =
  process.env.PLAY_ICON_PATH ||
  firstExisting([
    "play/listing/graphics/icon.png",
    "public/downloads/play/icon-512.png",
    "apps/android/play-assets/icon-512.png",
  ]);
const FEATURE =
  process.env.PLAY_FEATURE_PATH ||
  firstExisting([
    "play/listing/graphics/featureGraphic.png",
    "public/downloads/play/feature-graphic.png",
    "apps/android/play-assets/feature-graphic.png",
  ]);
const DRAFT = process.env.PLAY_LISTING_DRAFT === "1";

function firstExisting(candidates) {
  for (const c of candidates) {
    const abs = path.resolve(c);
    if (existsSync(abs)) return abs;
  }
  return path.resolve(candidates[0]);
}

function loadCredentials() {
  const fileEnv = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_FILE?.trim();
  if (fileEnv) {
    if (!existsSync(fileEnv)) throw new Error(`Fichier introuvable: ${fileEnv}`);
    return JSON.parse(readFileSync(fileEnv, "utf8"));
  }
  const raw = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) {
    throw new Error(
      [
        "GOOGLE_PLAY_SERVICE_ACCOUNT_JSON manquant (ne pas inventer de credentials).",
        "",
        "Setup :",
        "1) Google Cloud → Compte de service → clé JSON",
        "2) Activer « Google Play Android Developer API »",
        "3) Play Console → Utilisateurs → inviter l’email du SA (Admin / Release)",
        "4) export GOOGLE_PLAY_SERVICE_ACCOUNT_JSON=\"$(cat play-sa.json)\"",
        "   npm run play:listing",
      ].join("\n")
    );
  }
  if (raw.startsWith("{")) return JSON.parse(raw);
  if (!existsSync(raw)) throw new Error(`Fichier introuvable: ${raw}`);
  return JSON.parse(readFileSync(raw, "utf8"));
}

function readListingText(name) {
  const file = path.join(LISTING_DIR, name);
  if (!existsSync(file)) throw new Error(`Texte listing manquant: ${file}`);
  return readFileSync(file, "utf8").replace(/^\uFEFF/, "").trim();
}

async function replaceImage(api, { packageName, editId, language, imageType, filePath }) {
  if (!existsSync(filePath)) {
    throw new Error(`Image introuvable (${imageType}): ${filePath}`);
  }
  try {
    await api.edits.images.deleteall({
      packageName,
      editId,
      language,
      imageType,
    });
  } catch (err) {
    // Pas d’images existantes = OK
    const status = err?.code || err?.response?.status;
    if (status && status !== 404) throw err;
  }
  const uploaded = await api.edits.images.upload({
    packageName,
    editId,
    language,
    imageType,
    media: {
      mimeType: "image/png",
      body: createReadStream(filePath),
    },
  });
  return uploaded.data?.image?.url || "ok";
}

async function main() {
  const title = readListingText("title.txt");
  const shortDescription = readListingText("short_description.txt");
  const fullDescription = readListingText("full_description.txt");

  if (title.length > 30) {
    throw new Error(`title trop long (${title.length}/30): ${title}`);
  }
  if (shortDescription.length > 80) {
    throw new Error(
      `short_description trop long (${shortDescription.length}/80)`
    );
  }

  const creds = loadCredentials();
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ["https://www.googleapis.com/auth/androidpublisher"],
  });
  const api = google.androidpublisher({ version: "v3", auth });

  console.log("Package :", PACKAGE);
  console.log("Langue  :", LANG);
  console.log("Textes  :", LISTING_DIR);
  console.log("Icône   :", ICON);
  console.log("Feature :", FEATURE);

  const edit = await api.edits.insert({ packageName: PACKAGE });
  const editId = edit.data.id;
  if (!editId) throw new Error("Échec création edit Play Console");
  console.log("Edit    :", editId);

  await api.edits.listings.update({
    packageName: PACKAGE,
    editId,
    language: LANG,
    requestBody: {
      language: LANG,
      title,
      shortDescription,
      fullDescription,
    },
  });
  console.log("Listing fr-FR mis à jour.");

  const iconUrl = await replaceImage(api, {
    packageName: PACKAGE,
    editId,
    language: LANG,
    imageType: "icon",
    filePath: ICON,
  });
  console.log("Icône uploadée:", iconUrl);

  const featureUrl = await replaceImage(api, {
    packageName: PACKAGE,
    editId,
    language: LANG,
    imageType: "featureGraphic",
    filePath: FEATURE,
  });
  console.log("Feature graphic uploadé:", featureUrl);

  if (DRAFT) {
    console.log("PLAY_LISTING_DRAFT=1 → edit non commité:", editId);
    return;
  }

  const commit = await api.edits.commit({ packageName: PACKAGE, editId });
  console.log("✅ Fiche KlirBuild commitée");
  console.log("commit:", commit.data.id || "ok");
  console.log(
    "Reste manuel : captures, content rating, audience, data safety, finance, catégorie/contact, tests fermés."
  );
}

main().catch((err) => {
  const msg = err?.message || String(err);
  console.error("\n❌", msg);
  if (/not been granted access|permission|403/i.test(msg)) {
    console.error(
      "\nInvitez le compte de service dans Play Console → Utilisateurs (Admin / Release)."
    );
  }
  if (/app not found|package not found|404/i.test(msg)) {
    console.error(
      `\nCréez d’abord l’app dans Play Console (package ${PACKAGE}).`
    );
  }
  process.exit(1);
});
