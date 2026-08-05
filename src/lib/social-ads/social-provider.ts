import { isPostizEnabled } from "@/lib/social-ads/postiz-service";
import { isZernioEnabled } from "@/lib/social-ads/zernio-service";

export type SocialProvider = "zernio" | "postiz" | "in_app";

/**
 * Active social OAuth/publish provider.
 * Prefer Zernio if configured, else free Postiz, else in-app link form.
 */
export function resolveSocialProvider(): SocialProvider {
  if (isZernioEnabled()) return "zernio";
  if (isPostizEnabled()) return "postiz";
  return "in_app";
}
