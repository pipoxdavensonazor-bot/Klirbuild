/**
 * Shared CLIP ViT-B/32 image math (512-d).
 * Query (Edge) and index (Node) must both use this file so cosine search stays comparable.
 * Official PIL bicubic differs slightly; do not mix this tensor with RawImage/sharp preprocessing.
 */

export const CLIP_SIZE = 224;
export const CLIP_DIM = 512;
export const CLIP_MODEL = "Xenova/clip-vit-base-patch32";
export const CLIP_DTYPE = "q8";
/** Cosine similarity below this is kept only as a weak hint. */
export const CLIP_RELIABLE_SIMILARITY = 0.28;
/** SQL floor in search_products_by_image. Keep in sync with the migration. */
export const CLIP_MIN_SIMILARITY = 0.2;

export const CLIP_MEAN = [0.48145466, 0.4578275, 0.40821073];
export const CLIP_STD = [0.26862954, 0.26130258, 0.27577711];

/**
 * @param {Uint8Array|Uint8ClampedArray} data
 * @param {number} width
 * @param {number} height
 * @param {number} channels
 * @returns {Float32Array}
 */
export function rgbaToClipTensor(data, width, height, channels) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) {
    throw new Error("Image illisible");
  }
  if (width * height > 8_000_000) {
    throw new Error("Image trop grande. Rapprochez-vous ou choisissez une photo plus petite.");
  }
  const rgb = toRgb(data, width, height, channels);
  const scale = CLIP_SIZE / Math.min(width, height);
  const resizedW = Math.max(CLIP_SIZE, Math.round(width * scale));
  const resizedH = Math.max(CLIP_SIZE, Math.round(height * scale));
  const resized = resizeBilinear(rgb, width, height, resizedW, resizedH);
  const cropped = centerCrop(resized, resizedW, resizedH, CLIP_SIZE, CLIP_SIZE);
  return normalizeNchw(cropped, CLIP_SIZE, CLIP_SIZE);
}

/**
 * @param {ArrayLike<number>} vec
 * @returns {number[]}
 */
export function l2normalize(vec) {
  let sum = 0;
  const out = new Array(vec.length);
  for (let i = 0; i < vec.length; i += 1) {
    const n = Number(vec[i]);
    out[i] = n;
    sum += n * n;
  }
  const norm = Math.sqrt(sum) || 1;
  for (let i = 0; i < out.length; i += 1) out[i] /= norm;
  return out;
}

/**
 * Accepts a JSON embedding payload from a remote CLIP endpoint.
 * @param {unknown} payload
 * @returns {number[] | null}
 */
export function coerceEmbedding(payload) {
  const found = digEmbedding(payload, 0);
  if (!found || found.length !== CLIP_DIM) return null;
  if (found.some((n) => !Number.isFinite(n))) return null;
  return l2normalize(found);
}

/**
 * @param {unknown} value
 * @param {number} depth
 * @returns {number[] | null}
 */
function digEmbedding(value, depth) {
  if (depth > 6 || value == null) return null;
  if (ArrayBuffer.isView(value) && !(value instanceof DataView)) {
    return digEmbedding(Array.from(/** @type {ArrayLike<number>} */ (value)), depth + 1);
  }
  if (Array.isArray(value)) {
    if (value.length === CLIP_DIM && value.every((n) => typeof n === "number")) return value;
    if (value.length === 1) return digEmbedding(value[0], depth + 1);
    for (const item of value) {
      const inner = digEmbedding(item, depth + 1);
      if (inner) return inner;
    }
    return null;
  }
  if (typeof value === "object") {
    const record = /** @type {Record<string, unknown>} */ (value);
    for (const key of ["embedding", "image_embeds", "embeddings", "data", "output"]) {
      if (key in record) {
        const inner = digEmbedding(record[key], depth + 1);
        if (inner) return inner;
      }
    }
  }
  return null;
}

/**
 * @param {Uint8Array|Uint8ClampedArray} data
 * @param {number} width
 * @param {number} height
 * @param {number} channels
 */
function toRgb(data, width, height, channels) {
  const pixels = width * height;
  const rgb = new Uint8ClampedArray(pixels * 3);
  const step = channels === 1 || channels === 3 || channels === 4 ? channels : 4;
  for (let i = 0; i < pixels; i += 1) {
    const src = i * step;
    if (step === 1) {
      rgb[i * 3] = data[src] ?? 0;
      rgb[i * 3 + 1] = data[src] ?? 0;
      rgb[i * 3 + 2] = data[src] ?? 0;
    } else {
      rgb[i * 3] = data[src] ?? 0;
      rgb[i * 3 + 1] = data[src + 1] ?? 0;
      rgb[i * 3 + 2] = data[src + 2] ?? 0;
    }
  }
  return rgb;
}

function resizeBilinear(rgb, width, height, newW, newH) {
  const out = new Uint8ClampedArray(newW * newH * 3);
  for (let y = 0; y < newH; y += 1) {
    const sy = (y + 0.5) * (height / newH) - 0.5;
    const y0 = Math.max(0, Math.min(height - 1, Math.floor(sy)));
    const y1 = Math.max(0, Math.min(height - 1, y0 + 1));
    const dy = Math.min(1, Math.max(0, sy - y0));
    for (let x = 0; x < newW; x += 1) {
      const sx = (x + 0.5) * (width / newW) - 0.5;
      const x0 = Math.max(0, Math.min(width - 1, Math.floor(sx)));
      const x1 = Math.max(0, Math.min(width - 1, x0 + 1));
      const dx = Math.min(1, Math.max(0, sx - x0));
      const o = (y * newW + x) * 3;
      for (let c = 0; c < 3; c += 1) {
        const p00 = rgb[(y0 * width + x0) * 3 + c];
        const p10 = rgb[(y0 * width + x1) * 3 + c];
        const p01 = rgb[(y1 * width + x0) * 3 + c];
        const p11 = rgb[(y1 * width + x1) * 3 + c];
        const top = p00 + (p10 - p00) * dx;
        const bottom = p01 + (p11 - p01) * dx;
        out[o + c] = Math.round(top + (bottom - top) * dy);
      }
    }
  }
  return out;
}

function centerCrop(rgb, width, height, cropW, cropH) {
  const x0 = Math.max(0, Math.floor((width - cropW) / 2));
  const y0 = Math.max(0, Math.floor((height - cropH) / 2));
  const out = new Uint8ClampedArray(cropW * cropH * 3);
  for (let y = 0; y < cropH; y += 1) {
    const srcRow = (y0 + y) * width;
    const dstRow = y * cropW;
    for (let x = 0; x < cropW; x += 1) {
      const src = (srcRow + x0 + x) * 3;
      const dst = (dstRow + x) * 3;
      out[dst] = rgb[src];
      out[dst + 1] = rgb[src + 1];
      out[dst + 2] = rgb[src + 2];
    }
  }
  return out;
}

function normalizeNchw(rgb, width, height) {
  const plane = width * height;
  const out = new Float32Array(3 * plane);
  for (let i = 0; i < plane; i += 1) {
    for (let c = 0; c < 3; c += 1) {
      const value = rgb[i * 3 + c] / 255;
      out[c * plane + i] = (value - CLIP_MEAN[c]) / CLIP_STD[c];
    }
  }
  return out;
}
