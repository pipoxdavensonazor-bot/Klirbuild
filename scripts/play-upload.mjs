#!/usr/bin/env node
/**
 * Upload KlirBuild AAB to Google Play (internal track by default).
 *
 * Requires:
 *   GOOGLE_PLAY_SERVICE_ACCOUNT_JSON  — path to JSON key OR raw JSON
 *   (Play Console → Users & permissions → Invite service account as Admin)
 *
 * Usage:
 *   GOOGLE_PLAY_SERVICE_ACCOUNT_JSON=./play-sa.json node scripts/play-upload.mjs
 */
import { createReadStream, existsSync, readFileSync } from "fs";
import { google } from "googleapis";
import path from "path";

const PACKAGE = "app.klirline.klirbuild";
const AAB =
  process.env.PLAY_AAB_PATH ||
  path.resolve("apps/android/android/app/build/outputs/bundle/release/app-release.aab");
const TRACK = process.env.PLAY_TRACK || "internal";

function loadCredentials() {
  const raw = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) {
    throw new Error(
      "GOOGLE_PLAY_SERVICE_ACCOUNT_JSON manquant (chemin fichier ou JSON)."
    );
  }
  if (raw.startsWith("{")) return JSON.parse(raw);
  if (!existsSync(raw)) throw new Error(`Fichier introuvable: ${raw}`);
  return JSON.parse(readFileSync(raw, "utf8"));
}

async function main() {
  if (!existsSync(AAB)) {
    throw new Error(`AAB introuvable: ${AAB} — lancez d'abord assemble/bundleRelease`);
  }
  const creds = loadCredentials();
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ["https://www.googleapis.com/auth/androidpublisher"],
  });
  const androidpublisher = google.androidpublisher({ version: "v3", auth });

  const edit = await androidpublisher.edits.insert({
    packageName: PACKAGE,
  });
  const editId = edit.data.id;
  if (!editId) throw new Error("Impossible de créer un edit Play Console");

  console.log("Edit:", editId);
  console.log("Upload AAB…", AAB);

  await androidpublisher.edits.bundles.upload({
    packageName: PACKAGE,
    editId,
    media: {
      mimeType: "application/octet-stream",
      body: createReadStream(AAB),
    },
  });

  await androidpublisher.edits.tracks.update({
    packageName: PACKAGE,
    editId,
    track: TRACK,
    requestBody: {
      track: TRACK,
      releases: [
        {
          name: "KlirBuild 1.0.1",
          status: "completed",
          versionCodes: undefined,
        },
      ],
    },
  });

  // Assign latest bundle version code to track
  const bundles = await androidpublisher.edits.bundles.list({
    packageName: PACKAGE,
    editId,
  });
  const codes = (bundles.data.bundles || [])
    .map((b) => b.versionCode)
    .filter(Boolean);
  const versionCode = codes.sort((a, b) => Number(b) - Number(a))[0];
  if (!versionCode) throw new Error("Aucun versionCode bundle");

  await androidpublisher.edits.tracks.update({
    packageName: PACKAGE,
    editId,
    track: TRACK,
    requestBody: {
      track: TRACK,
      releases: [
        {
          name: `KlirBuild ${versionCode}`,
          status: "completed",
          versionCodes: [String(versionCode)],
        },
      ],
    },
  });

  const commit = await androidpublisher.edits.commit({
    packageName: PACKAGE,
    editId,
  });

  console.log("Publié sur le track:", TRACK);
  console.log("versionCode:", versionCode);
  console.log("commit:", commit.data.id || "ok");
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
