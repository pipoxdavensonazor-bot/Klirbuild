#!/usr/bin/env node
/**
 * Apply OpenHouse migration + redeploy to Cloudflare D1 / Workers.
 * Requires: wrangler login (pipoxdavensonazor@gmail.com)
 */
const { execSync } = require("child_process");
const path = require("path");

const root = path.join(__dirname, "..");

function run(cmd) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { cwd: root, stdio: "inherit" });
}

try {
  run("npx wrangler d1 execute leonnebienaime-db --remote --file=prisma/d1-migrate-openhouse.sql");
  run("npm run deploy");
  console.log("\n✓ Fil d'actualité déployé sur https://leonnebienaime.ca");
} catch (e) {
  console.error("\nÉchec. Lancez d'abord: npx wrangler login");
  process.exit(1);
}
