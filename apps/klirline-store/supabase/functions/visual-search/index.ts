import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { CLIP_RELIABLE_SIMILARITY } from "../_shared/clip-math.mjs";
import {
  embedPhoto,
  MAX_IMAGE_BYTES,
  PhotoInputError,
  sniffImage,
} from "../_shared/clip-runtime.ts";

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ??
  "https://klirline-store.pages.dev,https://store.klirline.com,https://klirline.com,https://www.klirline.com,http://localhost:5173,http://localhost:4173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

/**
 * Apply supabase/migrations/20261106120000_visual_search_clip.sql before
 * deploying this function. Fail closed if the rate-limit RPC is missing.
 *
 * Anonymous limit (same pattern as checkout-create, separate table):
 * - 8 searches per IP per minute
 * - 40 searches per IP per hour
 * - 20 searches per signed-in user per 10 minutes
 */
const RATE_LIMIT_MIGRATION = "20261106120000_visual_search_clip.sql";
const CLIP_HINT =
  "Le runtime Edge ne peut pas utiliser RawImage (Deno se présente comme Node : sharp et onnxruntime-node sont indisponibles, et OffscreenCanvas 2D est vide). " +
  "Le chemin local tente CLIP ViT-B/32 q8 via transformers.min.js + WASM dans /tmp. " +
  "S'il échoue, définissez les secrets serveur HF_TOKEN et HF_CLIP_INFERENCE_URL (endpoint HTTPS qui renvoie un vecteur CLIP de 512). " +
  "N'utilisez jamais une variable VITE_*.";

function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
    Vary: "Origin",
  };
}

function json(
  corsHeaders: Record<string, string>,
  status: number,
  body: Record<string, unknown>,
  extraHeaders?: Record<string, string>,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extraHeaders },
  });
}

function clientIp(req: Request): string {
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 64);
  const cf = req.headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf.slice(0, 64);
  const forwarded = (req.headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return (forwarded[0] || "unknown").slice(0, 64);
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function rateLimitMessage(retryAfterSeconds: number): string {
  if (retryAfterSeconds >= 3600) {
    return "Trop de recherches par photo. Réessayez dans une heure.";
  }
  if (retryAfterSeconds >= 600) {
    return "Trop de recherches par photo. Réessayez dans quelques minutes.";
  }
  return "Trop de recherches par photo. Réessayez dans une minute.";
}

async function optionalUser(req: Request) {
  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!jwt || jwt === Deno.env.get("SUPABASE_ANON_KEY")) return null;

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: `Bearer ${jwt}` } } },
  );
  const { data: { user } } = await userClient.auth.getUser();
  return user ?? null;
}

Deno.serve(async (req: Request) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json(corsHeaders, 405, { error: "Méthode non autorisée" });
  }

  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_IMAGE_BYTES + 64_000) {
    return json(corsHeaders, 413, { error: "Image trop lourde (maximum 2 Mo)." });
  }

  try {
    const form = await req.formData();
    const file = form.get("image");
    if (!(file instanceof File)) {
      return json(corsHeaders, 400, { error: "Ajoutez une photo (champ image)." });
    }
    if (file.size <= 0) {
      return json(corsHeaders, 400, { error: "Fichier image vide." });
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return json(corsHeaders, 413, { error: "Image trop lourde (maximum 2 Mo)." });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const mime = sniffImage(bytes);
    if (!mime) {
      return json(corsHeaders, 400, {
        error: "Format non accepté. Utilisez JPEG, PNG ou WebP.",
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const user = await optionalUser(req);
    const ipHash = await sha256Hex(`visual-ip:${clientIp(req)}`);
    const userHash = user ? await sha256Hex(`visual-user:${user.id}`) : "";
    const { data: limit, error: limitError } = await admin.rpc(
      "consume_visual_search_rate_limit",
      { p_ip_hash: ipHash, p_user_hash: userHash },
    );
    if (limitError) {
      console.error("visual search rate limit", RATE_LIMIT_MIGRATION, limitError.message);
      return json(corsHeaders, 503, {
        error: "Recherche par photo temporairement indisponible. Réessayez dans un instant.",
        code: "migration_required",
        hint: `Appliquez ${RATE_LIMIT_MIGRATION} avant la fonction Edge.`,
      });
    }
    const verdict = limit as { limited?: boolean; retry_after_seconds?: number } | null;
    if (verdict?.limited) {
      const retryAfter = Math.max(
        1,
        Math.min(3600, Math.floor(Number(verdict.retry_after_seconds) || 60)),
      );
      return json(
        corsHeaders,
        429,
        { error: rateLimitMessage(retryAfter), retry_after: retryAfter, code: "rate_limit" },
        { "Retry-After": String(retryAfter) },
      );
    }

    const embedded = await embedPhoto(bytes, mime);
    if (!embedded) {
      return json(corsHeaders, 503, {
        error: "La recherche par photo n'est pas disponible pour le moment. Utilisez la recherche par texte.",
        code: "clip_runtime",
        hint: CLIP_HINT,
      });
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? `Bearer ${anonKey}`;
    const reader = createClient(
      Deno.env.get("SUPABASE_URL")!,
      anonKey,
      { global: { headers: { Authorization: authHeader, apikey: anonKey } } },
    );
    const vector = `[${embedded.embedding.join(",")}]`;
    const { data, error } = await reader.rpc("search_products_by_image", {
      embedding: vector,
      lim: 24,
    });
    if (error) {
      console.error("search_products_by_image", error.message);
      return json(corsHeaders, 503, {
        error: "Recherche par photo temporairement indisponible. Réessayez dans un instant.",
        code: "migration_required",
        hint: `Appliquez ${RATE_LIMIT_MIGRATION} avant la fonction Edge.`,
      });
    }

    const results = Array.isArray(data) ? data : [];
    const scores = results
      .map((row) => Number((row as { similarity?: number }).similarity))
      .filter((n) => Number.isFinite(n));
    const best = scores.length ? Math.max(...scores) : 0;
    return json(corsHeaders, 200, {
      results,
      engine: embedded.engine,
      best_similarity: best,
      reliable: best >= CLIP_RELIABLE_SIMILARITY,
    });
  } catch (error) {
    if (error instanceof PhotoInputError) {
      return json(corsHeaders, 400, { error: error.message, code: "bad_image" });
    }
    const message = error instanceof Error ? error.message : "error";
    console.error("visual-search", message);
    return json(corsHeaders, 500, {
      error: "Recherche par photo impossible. Utilisez la recherche par texte.",
      code: "clip_runtime",
    });
  }
});
