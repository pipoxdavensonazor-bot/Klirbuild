/**
 * One-shot: wipe live products so the catalog is empty.
 * Loads SERVICE_ROLE from env files; never prints secrets.
 *
 * Usage: node scripts/wipe-catalog.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const repo = resolve(root, '../..');

function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

const env = {
  ...loadEnvFile(resolve(repo, 'env.klirbuild.live.txt')),
  ...loadEnvFile(resolve(repo, 'env.klirbuild.txt')),
  ...loadEnvFile(resolve(root, '.env')),
  ...process.env,
};

const url =
  env.SUPABASE_URL ||
  env.VITE_SUPABASE_URL ||
  env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  env.SUPABASE_SERVICE_ROLE_KEY ||
  env.SERVICE_ROLE_KEY ||
  env.SUPABASE_SERVICE_KEY;

if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env files.');
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

async function wipeTable(name) {
  const { error, count } = await sb.from(name).delete({ count: 'exact' }).neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) {
    // Table may not exist — skip quietly
    if (/relation|does not exist|schema cache/i.test(error.message)) {
      console.log(`skip ${name}: not available`);
      return;
    }
    console.error(`fail ${name}:`, error.message);
    return;
  }
  console.log(`ok ${name}: deleted ${count ?? '?'} rows`);
}

async function main() {
  const { count: before } = await sb.from('products').select('*', { count: 'exact', head: true });
  console.log(`products before: ${before ?? 0}`);

  for (const t of [
    'cart_items',
    'wishlists',
    'reviews',
    'order_items',
    'stock_alerts',
    'product_stock_alerts',
  ]) {
    await wipeTable(t);
  }
  await wipeTable('products');

  const { count: after } = await sb.from('products').select('*', { count: 'exact', head: true });
  console.log(`products after: ${after ?? 0}`);
  if ((after ?? 0) > 0) {
    process.exit(2);
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
