/**
 * CLIP image embedding for the visual-search Edge Function.
 *
 * Edge exposes process.release.name === "node", so npm:@huggingface/transformers
 * would pick onnxruntime-node / sharp (unavailable). OffscreenCanvas 2D is null.
 *
 * Local path on Supabase Edge 1.77.9 / Deno 2.1.4 (live v9):
 * - Do NOT install onnxruntime-web on Symbol.for("onnxruntime"): Edge may already
 *   expose a native ORT there, and overwriting it with ort-web then fails because
 *   ort-wasm-simd-threaded.jsep.mjs is a dynamic remote import outside the eszip.
 * - Hide process only while importing transformers.min.js (literal URL) so
 *   IS_NODE_ENV is false when the symbol is absent.
 * - Keep the ONNX env object already on the module. Use device:"auto" so a
 *   preinstalled ORT symbol (empty supportedDevices) does not throw on device:"wasm".
 * - Pass a float32 tensor from our decoder, never RawImage. image_embeds must be 512-d.
 *
 * Remote fallback: HF_TOKEN + HF_CLIP_INFERENCE_URL (never VITE_*).
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
const CLIP_TF_WASM =
  "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/";

/** Keep wasmPaths Edge already set. CDN only when the native ORT symbol is absent or the path is empty. */
export function clipWasmPaths(
  hasOrtSymbol: boolean,
  current: string | null | undefined,
): string {
  if (!hasOrtSymbol || current == null) return CLIP_TF_WASM;
  return current;
}

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
    backends: { onnx: { wasm?: { wasmPaths?: string; numThreads?: number; proxy?: boolean } } };
  };
  Tensor: new (type: string, data: Float32Array, dims: number[]) => unknown;
  CLIPVisionModelWithProjection: {
    from_pretrained: (model: string, opts: { dtype: string; device: string }) => Promise<ClipModel>;
  };
};

async function loadTransformers(): Promise<TransformersModule> {
  if (transformersMod) return transformersMod;
  loadingTransformers ??= (async () => {
    const ortSym = Symbol.for("onnxruntime");
    const saved = (globalThis as { process?: unknown }).process;
    delete (globalThis as { process?: unknown }).process;
    try {
      const imported = await import(
        "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js"
      ) as TransformersModule;
      imported.env.useBrowserCache = false;
      imported.env.allowLocalModels = false;
      const wasm = imported.env.backends?.onnx?.wasm;
      if (wasm) {
        wasm.numThreads = 1;
        wasm.proxy = false;
        const nextPaths = clipWasmPaths(ortSym in globalThis, wasm.wasmPaths);
        if (nextPaths != null) wasm.wasmPaths = nextPaths;
      }
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
      device: "auto",
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
