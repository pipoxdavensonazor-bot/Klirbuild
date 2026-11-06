/**
 * Index seller product images into product_image_embeddings.
 *
 * Does not publish products and does not assign seller_id.
 * Seed rows (seller_id null) are indexed only with --include-seeds, at most 12,
 * and stay invisible to search_products_by_image.
 *
 * From apps/klirline-store:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/index-product-images.mjs
 *   ... node scripts/index-product-images.mjs --include-seeds --limit 12
 *   HF_TOKEN=... HF_CLIP_INFERENCE_URL=... node scripts/index-product-images.mjs --remote
 *
 * Local mode needs: npm install --no-save @huggingface/transformers jpeg-js fast-png @jsquash/webp
 * Never put the service role or HF token in a VITE_* variable.
 */
import { createRequire } from "node:module";
import { createClient } from "@supabase/supabase-js";
import { resolveIndexPlan } from "./index-plan.mjs";
import {
  CLIP_DTYPE,
  CLIP_MODEL,
  coerceEmbedding,
  l2normalize,
  rgbaToClipTensor,
} from "../supabase/functions/_shared/clip-math.mjs";

const require = createRequire(import.meta.url);

const plan = resolveIndexPlan(process.argv.slice(2));
const supabaseUrl = process.env.SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!supabaseUrl || !serviceKey) {
  console.error("Définissez SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY (secrets serveur, pas VITE_*).");
  process.exit(1);
}
if (plan.publish || plan.assignSeller) {
  console.error("Ce script ne publie pas et ne réassigne pas les produits.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let query = supabase
  .from("products")
  .select("id, name, image_url, images, seller_id, published");
if (plan.includeSeeds) {
  query = query.is("seller_id", null);
} else {
  query = query.not("seller_id", "is", null).eq("published", true);
}
if (plan.limit) query = query.limit(plan.limit);

const { data, error } = await query;
if (error) {
  console.error(error.message);
  process.exit(1);
}

const rows = data ?? [];
console.log(
  plan.includeSeeds
    ? `Indexation locale de ${rows.length} seed(s) max ${plan.limit} — non publiés, hors catalogue.`
    : `Indexation de ${rows.length} produit(s) vendeur publié(s).`,
);

let embed = plan.remote ? embedRemote : await loadLocalEmbedder();
let indexed = 0;
for (const row of rows) {
  const urls = uniqueUrls(row);
  for (const imageUrl of urls) {
    const bytes = await fetchImage(imageUrl);
    if (!bytes) continue;
    const vector = await embed(bytes.bytes, bytes.mime);
    if (!vector) {
      console.error("embedding ignoré", row.id);
      continue;
    }
    const { error: upsertError } = await supabase.from("product_image_embeddings").upsert({
      product_id: row.id,
      image_url: imageUrl,
      embedding: `[${vector.join(",")}]`,
      model: plan.remote ? "hf-remote:clip-vit-base-patch32" : CLIP_MODEL,
      updated_at: new Date().toISOString(),
    }, { onConflict: "product_id,image_url" });
    if (upsertError) {
      console.error(upsertError.message);
      continue;
    }
    indexed += 1;
  }
}
console.log(`Embeddings écrits : ${indexed}. publish=${plan.publish} assignSeller=${plan.assignSeller}`);

function uniqueUrls(row) {
  const urls = [];
  if (typeof row.image_url === "string") urls.push(row.image_url);
  if (Array.isArray(row.images)) {
    for (const item of row.images) {
      if (typeof item === "string") urls.push(item);
    }
  }
  return [...new Set(urls.filter(isPublicHttpsUrl))].slice(0, 4);
}

function isPublicHttpsUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
    if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return false;
    if (host.includes(":") && (host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80"))) {
      return false;
    }
    const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (v4) {
      const [a, b] = [Number(v4[1]), Number(v4[2])];
      if (a === 10 || a === 127 || a === 0) return false;
      if (a === 169 && b === 254) return false;
      if (a === 172 && b >= 16 && b <= 31) return false;
      if (a === 192 && b === 168) return false;
    }
    return true;
  } catch {
    return false;
  }
}

async function fetchImage(url) {
  const res = await fetch(url);
  if (!res.ok) return null;
  const mime = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.byteLength < 32 || bytes.byteLength > 8_000_000) return null;
  const sniffed = sniff(bytes);
  if (!sniffed) return null;
  return { bytes, mime: sniffed };
}

function sniff(bytes) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return "image/png";
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[8] === 0x57) return "image/webp";
  return null;
}

async function decodeBytes(bytes, mime) {
  if (mime === "image/jpeg") {
    const jpeg = require("jpeg-js");
    const decoded = jpeg.decode(bytes, { useTArray: true, formatAsRGBA: true });
    return { data: decoded.data, width: decoded.width, height: decoded.height, channels: 4 };
  }
  if (mime === "image/png") {
    const { decode } = await import("fast-png");
    const decoded = decode(bytes);
    return { data: decoded.data, width: decoded.width, height: decoded.height, channels: decoded.channels ?? 4 };
  }
  const { decode } = await import("@jsquash/webp");
  const decoded = await decode(bytes);
  return { data: decoded.data, width: decoded.width, height: decoded.height, channels: 4 };
}

async function loadLocalEmbedder() {
  let transformers;
  try {
    transformers = await import("@huggingface/transformers");
  } catch {
    console.error("Installez @huggingface/transformers jpeg-js fast-png @jsquash/webp (npm install --no-save ...).");
    process.exit(1);
  }
  const { CLIPVisionModelWithProjection, Tensor, env } = transformers;
  env.allowLocalModels = false;
  const model = await CLIPVisionModelWithProjection.from_pretrained(CLIP_MODEL, {
    dtype: CLIP_DTYPE,
    device: "cpu",
  });
  return async (bytes, mime) => {
    const decoded = await decodeBytes(bytes, mime);
    const pixels = rgbaToClipTensor(decoded.data, decoded.width, decoded.height, decoded.channels);
    const out = await model({ pixel_values: new Tensor("float32", pixels, [1, 3, 224, 224]) });
    const data = out.image_embeds?.data;
    if (!data) return null;
    return l2normalize(Array.from(data));
  };
}

async function embedRemote(bytes, mime) {
  const token = process.env.HF_TOKEN ?? process.env.HUGGINGFACE_API_TOKEN ?? "";
  const url = process.env.HF_CLIP_INFERENCE_URL ?? "";
  if (!token || !url.startsWith("https://")) {
    console.error("Mode --remote : définissez HF_TOKEN et HF_CLIP_INFERENCE_URL (https). Pas de VITE_*.");
    process.exit(1);
  }
  const format = (process.env.HF_CLIP_INFERENCE_FORMAT ?? "bytes").toLowerCase();
  const headers = { Authorization: `Bearer ${token}`, Accept: "application/json" };
  let body;
  if (format === "json-base64") {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify({ inputs: Buffer.from(bytes).toString("base64") });
  } else {
    headers["Content-Type"] = mime;
    body = bytes;
  }
  const res = await fetch(url, { method: "POST", headers, body });
  if (!res.ok) return null;
  return coerceEmbedding(await res.json());
}
