import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";
import { CLIP_DIM } from "../supabase/functions/_shared/clip-math.mjs";

const root = dirname(fileURLToPath(import.meta.url));
const runtimePath = join(root, "../supabase/functions/_shared/clip-runtime.ts");
const indexPath = join(root, "../supabase/functions/visual-search/index.ts");
const runtime = readFileSync(runtimePath, "utf8");
const index = readFileSync(indexPath, "utf8");

const TF_URL =
  "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js";
const CLIP_TF_WASM =
  "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/";

function clipWasmPaths(hasOrtSymbol, current) {
  if (!hasOrtSymbol || current == null) return CLIP_TF_WASM;
  return current;
}

test("CLIP image_embeds est un vecteur de 512", () => {
  expect(CLIP_DIM).toBe(512);
  expect(runtime).toContain("if (!data || data.length !== CLIP_DIM) return null;");
  expect(runtime).toContain('new mod.Tensor("float32", pixels, [1, 3, 224, 224])');
  expect(runtime).not.toContain("RawImage.fromBlob");
  expect(runtime).not.toContain("RawImage.fromURL");
});

test("le runtime v9 masque process, garde l'ORT Edge, et demande device auto", () => {
  expect(runtime).toContain(`import(\n        "${TF_URL}"`);
  expect(runtime).toContain('const ortSym = Symbol.for("onnxruntime");');
  expect(runtime).toContain("delete (globalThis as { process?: unknown }).process;");
  expect(runtime).toContain("(globalThis as { process?: unknown }).process = saved;");
  expect(runtime).toContain('device: "auto"');
  expect(runtime).not.toContain('device: "wasm"');
  expect(runtime).not.toMatch(/globalThis\s*\[\s*ortSym\s*\]\s*=/);
  expect(runtime).not.toMatch(/globalThis\s*\[\s*Symbol\.for\(\s*["']onnxruntime["']\s*\)\s*\]\s*=/);
  expect(runtime).not.toMatch(/npm:onnxruntime-web/);
  expect(runtime).not.toMatch(/import\(\s*["']https:\/\/cdn\.jsdelivr\.net\/npm\/onnxruntime-web/);
  expect(runtime).not.toContain("/tmp/klir-clip");
  expect(runtime).not.toContain("file://${CLIP_DIR}");
  expect(runtime).not.toContain('"hasOrtSymbol"');
  expect(runtime).not.toContain("isNodeEnv");
  expect(runtime).not.toContain("console.log");
  expect(runtime).toContain("clipWasmPaths(ortSym in globalThis, wasm.wasmPaths)");
  expect(runtime).toContain("if (!hasOrtSymbol || current == null) return CLIP_TF_WASM;");
  expect(runtime).toContain(`const CLIP_TF_WASM =\n  "${CLIP_TF_WASM}";`);
  expect(runtime).not.toMatch(/env\.backends\.onnx\s*=/);
});

test("wasmPaths CDN seulement sans ORT natif ou sans chemin déjà posé", () => {
  expect(CLIP_TF_WASM.endsWith("/")).toBe(true);
  expect(CLIP_TF_WASM).toContain("@huggingface/transformers@3.8.1/dist/");
  expect(clipWasmPaths(false, undefined)).toBe(CLIP_TF_WASM);
  expect(clipWasmPaths(false, "https://edge.example/ort/")).toBe(CLIP_TF_WASM);
  expect(clipWasmPaths(true, undefined)).toBe(CLIP_TF_WASM);
  expect(clipWasmPaths(true, null)).toBe(CLIP_TF_WASM);
  expect(clipWasmPaths(true, "https://edge.example/ort/")).toBe("https://edge.example/ort/");
  const before = globalThis[Symbol.for("onnxruntime")];
  expect(before).toBeUndefined();
  clipWasmPaths(true, "https://edge.example/ort/");
  expect(Symbol.for("onnxruntime") in globalThis).toBe(false);
});

test("index.ts du dépôt importe ../_shared et le hint ne charge pas onnxruntime-web", () => {
  expect(index).toContain('from "../_shared/clip-math.mjs"');
  expect(index).toContain('from "../_shared/clip-runtime.ts"');
  expect(index).not.toContain('from "./clip-runtime.ts"');
  expect(index).not.toContain('from "./clip-math.mjs"');
  const hintStart = index.indexOf("const CLIP_HINT =");
  const hintEnd = index.indexOf("function corsHeadersFor");
  const hint = index.slice(hintStart, hintEnd);
  expect(hint).not.toContain("onnxruntime-web");
  expect(hint).not.toContain("/tmp");
  expect(hint).toContain("512");
  expect(hint).toContain("device auto");
  expect(hint).toContain("variable VITE_");
});
