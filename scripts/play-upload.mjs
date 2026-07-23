#!/usr/bin/env node
/**
 * Upload automatique KlirBuild → Google Play Console.
 *
 * Secrets (un des deux) :
 *   GOOGLE_PLAY_SERVICE_ACCOUNT_JSON  — JSON brut OU chemin vers .json
 *   GOOGLE_PLAY_SERVICE_ACCOUNT_FILE  — chemin vers la clé JSON
 *
 * Variables optionnelles :
 *   PLAY_AAB_PATH   — défaut: apps/android/.../app-release.aab
 *   PLAY_TRACK      — internal | alpha | beta | production (défaut: internal)
 *   PLAY_STATUS     — completed | draft (défaut: completed)
 *   PLAY_PACKAGE    — défaut: app.klirline.klirbuild
 *
 * Usage :
 *   npm run play:upload
 */
import { createReadStream, existsSync, readFileSync } from "fs";
import { google } from "googleapis";
import path from "path";

const PACKAGE = process.env.PLAY_PACKAGE || "app.klirline.klirbuild";
const AAB =
  process.env.PLAY_AAB_PATH ||
  path.resolve(
    "apps/android/android/app/build/outputs/bundle/release/app-release.aab"
  );
const TRACK = process.env.PLAY_TRACK || "internal";
const STATUS = process.env.PLAY_STATUS || "completed";

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
        "GOOGLE_PLAY_SERVICE_ACCOUNT_JSON manquant.",
        "",
        "Setup unique (5 min) :",
        "1) Google Cloud → IAM → Compte de service → Créer → clé JSON",
        "2) Activer « Google Play Android Developer API »",
        "3) Play Console → Utilisateurs et autorisations → Inviter l’email du compte (Admin)",
        "4) Coller le JSON :",
        "     export GOOGLE_PLAY_SERVICE_ACCOUNT_JSON=\"$(cat play-sa.json)\"",
        "     npm run play:upload",
        "",
        "Ou secret GitHub : GOOGLE_PLAY_SERVICE_ACCOUNT_JSON",
      ].join("\n")
    );
  }
  if (raw.startsWith("{")) return JSON.parse(raw);
  if (!existsSync(raw)) throw new Error(`Fichier introuvable: ${raw}`);
  return JSON.parse(readFileSync(raw, "utf8"));
}

async function main() {
  if (!existsSync(AAB)) {
    throw new Error(
      `AAB introuvable: ${AAB}\nLancez: cd apps/android/android && ./gradlew bundleRelease`
    );
  }

  const creds = loadCredentials();
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ["https://www.googleapis.com/auth/androidpublisher"],
  });
  const api = google.androidpublisher({ version: "v3", auth });

  console.log("Package:", PACKAGE);
  console.log("Track  :", TRACK);
  console.log("AAB    :", AAB);

  const edit = await api.edits.insert({ packageName: PACKAGE });
  const editId = edit.data.id;
  if (!editId) throw new Error("Échec création edit Play Console");
  console.log("Edit   :", editId);

  console.log("Upload du bundle…");
  const uploaded = await api.edits.bundles.upload({
    packageName: PACKAGE,
    editId,
    media: {
      mimeType: "application/octet-stream",
      body: createReadStream(AAB),
    },
  });

  const versionCode = uploaded.data.versionCode;
  if (!versionCode) throw new Error("versionCode manquant après upload");
  console.log("versionCode:", versionCode);

  await api.edits.tracks.update({
    packageName: PACKAGE,
    editId,
    track: TRACK,
    requestBody: {
      track: TRACK,
      releases: [
        {
          name: `KlirBuild ${versionCode}`,
          status: STATUS,
          versionCodes: [String(versionCode)],
        },
      ],
    },
  });

  if (STATUS === "draft") {
    console.log("Brouillon enregistré (non commité). editId=", editId);
    return;
  }

  const commit = await api.edits.commit({ packageName: PACKAGE, editId });
  console.log("✅ Publié sur", TRACK);
  console.log("commit:", commit.data.id || "ok");
}

main().catch((err) => {
  const msg = err?.message || String(err);
  console.error("\n❌", msg);
  if (/not been granted access|permission|403/i.test(msg)) {
    console.error(
      "\nLe compte de service doit être invité dans Play Console → Utilisateurs (rôle Admin / Release)."
    );
  }
  if (/app not found|package not found|404/i.test(msg)) {
    console.error(
      "\nCréez d’abord l’app une fois dans Play Console (package app.klirline.klirbuild), puis relancez."
    );
  }
  process.exit(1);
});
