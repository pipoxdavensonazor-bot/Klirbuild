/**
 * Ensure Prisma query_compiler WASM lands in the OpenNext Worker bundle.
 * NFT/tracing sometimes drops *.wasm even when .prisma/client is external.
 */
import { cpSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const srcDir = join(root, "node_modules/.prisma/client");
const destDirs = [
  join(root, ".open-next/server-functions/default/node_modules/.prisma/client"),
  join(root, ".open-next/server-functions/default/node_modules/@prisma/client/.prisma/client"),
];

const files = readdirSync(srcDir).filter(
  (f) =>
    f.endsWith(".wasm") ||
    f === "wasm-worker-loader.mjs" ||
    f === "wasm-edge-light-loader.mjs" ||
    f === "query_compiler_bg.js"
);

if (!files.length) {
  console.warn("[copy-prisma-wasm] No Prisma wasm assets found in", srcDir);
  process.exit(0);
}

for (const destDir of destDirs) {
  mkdirSync(destDir, { recursive: true });
  for (const file of files) {
    const from = join(srcDir, file);
    const to = join(destDir, file);
    if (!existsSync(from)) continue;
    cpSync(from, to);
    console.log(`[copy-prisma-wasm] ${file} → ${destDir}`);
  }
}
