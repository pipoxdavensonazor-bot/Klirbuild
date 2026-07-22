/**
 * Provision Cloudflare resources for KlirBuild.
 *
 * Requires: `npx wrangler login` (or CLOUDFLARE_API_TOKEN) and DATABASE_URL for Hyperdrive.
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." npm run cf:provision
 */
import { execSync } from "node:child_process";

function run(command, opts = {}) {
  console.log(`\n> ${command}`);
  return execSync(command, { stdio: "inherit", encoding: "utf8", ...opts });
}

function tryRun(command) {
  try {
    run(command);
    return true;
  } catch (error) {
    console.warn(`[cf:provision] Failed: ${command}`);
    console.warn(error instanceof Error ? error.message : error);
    return false;
  }
}

const buckets = ["klirbuild-uploads", "klirbuild-backups", "klirbuild-next-cache"];

console.log("=== KlirBuild Cloudflare provision ===");

for (const name of buckets) {
  const ok = tryRun(`npx wrangler r2 bucket create ${name}`);
  if (!ok) {
    console.warn(
      `Could not create R2 bucket "${name}". If you see "Please enable R2", open https://dash.cloudflare.com/?to=/:account/r2 and accept the R2 terms, then re-run.`
    );
  }
}

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.warn(
    "\nDATABASE_URL not set — skipping Hyperdrive. Create later with:\n" +
      '  npx wrangler hyperdrive create klirbuild-db --connection-string="$DATABASE_URL"\n' +
      "Then paste the id into wrangler.jsonc hyperdrive[].id"
  );
} else {
  try {
    const out = execSync(
      `npx wrangler hyperdrive create klirbuild-db --connection-string=${JSON.stringify(databaseUrl)}`,
      { encoding: "utf8" }
    );
    console.log(out);
    const idMatch = out.match(/id\s*[:=]\s*([a-f0-9-]{36})/i) || out.match(/([a-f0-9]{32,36})/);
    if (idMatch) {
      console.log(
        `\nHyperdrive created. Set wrangler.jsonc:\n` +
          `  "hyperdrive": [{ "binding": "HYPERDRIVE", "id": "${idMatch[1]}" }]\n`
      );
    }
  } catch (error) {
    console.warn("[cf:provision] Hyperdrive create failed:", error instanceof Error ? error.message : error);
  }
}

console.log(
  "\nNext: put secrets (see DEPLOY-CLOUDFLARE.md), then:\n  npm run deploy\n"
);
