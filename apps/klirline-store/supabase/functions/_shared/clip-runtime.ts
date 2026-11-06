/**
 * CLIP image embedding for the visual-search Edge Function.
 *
 * Verified on Deno 2.9.8 (not a promise):
 * - `npm:@huggingface/transformers` loads the Node build. Deno reports
 *   `process.release.name === "node"`, so the library picks `sharp` and
 *   `onnxruntime-node`. Supabase Edge cannot load those native bindings.
 * - `RawImage.fromBlob` / `fromURL` throw (`sharp` is not a function).
 *   `OffscreenCanvas.getContext("2d")` is null, so canvas pixels are unavailable.
 * - The self-contained `transformers.min.js` WASM build returns a 512-d
 *   `image_embeds` vector when three conditions hold:
 *   1. `process` is hidden only while the module evaluates,
 *   2. the JS bundle and `ort-wasm-simd-threaded.jsep.*` are local files
 *      (an https wasm URL is rejected by Deno's Node loader),
 *   3. the caller passes a float tensor, not a RawImage.
 * - If that still fails (memory, /tmp, cold start), inference falls back to
 *   HF_TOKEN + HF_CLIP_INFERENCE_URL. Those are server secrets, never VITE_*.
 */
import jpeg from "npm:jpeg-js@0.4.4";
import { decode as decodePng } from "npm:fast-png@6.4.0";
import { decode as decodeWebp } from "npm:@jsquash/webp@1.5.0";
import {
  CLIP_DIM,
  CLIP_DTYPE,
  CLIP_MODEL,
  coerceEmbedding,
  rgbaToClipTensor,
} from "./clip-math.mjs";

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const CLIP_DIR = "/tmp/klir-clip";
const CDN = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist";
const RUNTIME_FILES = [
  "transformers.min.js",
  "ort-wasm-simd-threaded.jsep.mjs",
  "ort-wasm-simd-threaded.jsep.wasm",
] as const;

export class PhotoInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PhotoInputError";
  }
}

export type SniffedImage = "image/jpeg" | "image/png" | "image/webp";

export function sniffImage(bytes: Uint8Array): SniffedImage | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

type Decoded = { data: Uint8Array | Uint8ClampedArray; width: number; height: number; channels: number };

export async function decodeImage(bytes: Uint8Array, mime: SniffedImage): Promise<Decoded> {
  try {
    if (mime === "image/jpeg") {
      const decoded = jpeg.decode(bytes, { useTArray: true, formatAsRGBA: true });
      if (!decoded?.width || !decoded?.height) throw new Error("jpeg");
      return { data: decoded.data, width: decoded.width, height: decoded.height, channels: 4 };
    }
    if (mime === "image/png") {
      const decoded = decodePng(bytes);
      if (!decoded?.width || !decoded?.height) throw new Error("png");
      return {
        data: decoded.data,
        width: decoded.width,
        height: decoded.height,
        channels: decoded.channels ?? 4,
      };
    }
    const decoded = await decodeWebp(bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength
      ? bytes.buffer
      : bytes.slice().buffer);
    if (!decoded?.width || !decoded?.height) throw new Error("webp");
    return { data: decoded.data, width: decoded.width, height: decoded.height, channels: 4 };
  } catch (error) {
    if (error instanceof PhotoInputError) throw error;
    throw new PhotoInputError("Impossible de lire cette photo. Utilisez un JPEG, PNG ou WebP valide.");
  }
}

let preparing: Promise<void> | null = null;
let transformersMod: TransformersModule | null = null;
let loadingTransformers: Promise<TransformersModule> | null = null;
let modelPromise: Promise<ClipModel> | null = null;

type ClipModel = {
  (inputs: { pixel_values: unknown }): Promise<{ image_embeds?: { data?: Float32Array } }>;
};

type TransformersModule = {
  env: {
    useBrowserCache: boolean;
    allowLocalModels: boolean;
    cacheDir?: string;
    backends: { onnx: { wasm: { wasmPaths?: string; numThreads?: number } } };
  };
  Tensor: new (type: string, data: Float32Array, dims: number[]) => unknown;
  CLIPVisionModelWithProjection: {
    from_pretrained: (model: string, opts: { dtype: string; device: string }) => Promise<ClipModel>;
  };
};

async function ensureRuntime(): Promise<void> {
  preparing ??= (async () => {
    await Deno.mkdir(CLIP_DIR, { recursive: true });
    for (const name of RUNTIME_FILES) {
      const path = `${CLIP_DIR}/${name}`;
      try {
        const stat = await Deno.stat(path);
        if (stat.size > 1000) continue;
      } catch {
        /* download */
      }
      const res = await fetch(`${CDN}/${name}`);
      if (!res.ok) throw new Error(`Téléchargement CLIP impossible (${name})`);
      const buf = new Uint8Array(await res.arrayBuffer());
      if (buf.byteLength < 1000 || buf.byteLength > 40_000_000) {
        throw new Error(`Fichier CLIP inattendu (${name})`);
      }
      await Deno.writeFile(path, buf);
    }
  })();
  try {
    await preparing;
  } catch (error) {
    preparing = null;
    throw error;
  }
}

async function loadTransformers(): Promise<TransformersModule> {
  if (transformersMod) return transformersMod;
  loadingTransformers ??= (async () => {
    await ensureRuntime();
    const saved = (globalThis as { process?: unknown }).process;
    // See file header: Deno masquerades as Node and selects native sharp / ORT.
    // Hide process only while this module evaluates.
    delete (globalThis as { process?: unknown }).process;
    try {
      const imported = await import(`file://${CLIP_DIR}/transformers.min.js`) as TransformersModule;
      imported.env.useBrowserCache = false;
      imported.env.allowLocalModels = false;
      imported.env.cacheDir = `${CLIP_DIR}/models`;
      imported.env.backends.onnx.wasm.wasmPaths = `${CLIP_DIR}/`;
      imported.env.backends.onnx.wasm.numThreads = 1;
      transformersMod = imported;
      return imported;
    } finally {
      (globalThis as { process?: unknown }).process = saved;
    }
  })();
  try {
    return await loadingTransformers;
  } catch (error) {
    loadingTransformers = null;
    throw error;
  }
}

export async function embedImageLocally(bytes: Uint8Array, mime: SniffedImage): Promise<number[] | null> {
  try {
    const decoded = await decodeImage(bytes, mime);
    const pixels = rgbaToClipTensor(decoded.data, decoded.width, decoded.height, decoded.channels);
    const mod = await loadTransformers();
    modelPromise ??= mod.CLIPVisionModelWithProjection.from_pretrained(CLIP_MODEL, {
      dtype: CLIP_DTYPE,
      device: "wasm",
    });
    const model = await modelPromise;
    const tensor = new mod.Tensor("float32", pixels, [1, 3, 224, 224]);
    const out = await model({ pixel_values: tensor });
    const data = out.image_embeds?.data;
    if (!data || data.length !== CLIP_DIM) return null;
    return coerceEmbedding(Array.from(data));
  } catch (error) {
    modelPromise = null;
    if (error instanceof PhotoInputError) throw error;
    console.error("local CLIP failed", error instanceof Error ? error.message : "error");
    return null;
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export async function embedImageRemotely(bytes: Uint8Array, mime: SniffedImage): Promise<number[] | null> {
  const token = Deno.env.get("HF_TOKEN") ?? Deno.env.get("HUGGINGFACE_API_TOKEN") ?? "";
  const url = (Deno.env.get("HF_CLIP_INFERENCE_URL") ?? "").trim();
  if (!token || !url) return null;
  if (!url.startsWith("https://")) {
    console.error("HF_CLIP_INFERENCE_URL must be https");
    return null;
  }
  const format = (Deno.env.get("HF_CLIP_INFERENCE_FORMAT") ?? "bytes").toLowerCase();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };
  let body: BodyInit;
  if (format === "json-base64") {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify({ inputs: bytesToBase64(bytes) });
  } else {
    headers["Content-Type"] = mime;
    body = bytes;
  }
  const res = await fetch(url, { method: "POST", headers, body });
  if (!res.ok) {
    console.error("remote CLIP", res.status);
    return null;
  }
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return null;
  }
  return coerceEmbedding(json);
}

export async function embedPhoto(
  bytes: Uint8Array,
  mime: SniffedImage,
): Promise<{ embedding: number[]; engine: "local" | "remote" } | null> {
  const mode = (Deno.env.get("VISUAL_SEARCH_INFERENCE") ?? "auto").toLowerCase();
  if (mode !== "remote") {
    const local = await embedImageLocally(bytes, mime);
    if (local) return { embedding: local, engine: "local" };
    if (mode === "local") return null;
  }
  const remote = await embedImageRemotely(bytes, mime);
  if (remote) return { embedding: remote, engine: "remote" };
  return null;
}
