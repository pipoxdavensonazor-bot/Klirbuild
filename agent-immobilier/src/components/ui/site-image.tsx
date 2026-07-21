import Image, { type ImageProps } from "next/image";

/**
 * next/image optimizer on OpenNext/Cloudflare returns 404 for /api/media/*
 * (KV-backed uploads). Serve those unoptimized; keep optimization for remote URLs.
 */
export function SiteImage({
  src,
  alt,
  unoptimized,
  ...rest
}: ImageProps) {
  const srcStr = typeof src === "string" ? src : "";
  const isLocalMedia =
    srcStr.startsWith("/api/media/") || srcStr.includes("/api/media/");

  return (
    <Image
      src={src}
      alt={alt}
      unoptimized={unoptimized ?? isLocalMedia}
      {...rest}
    />
  );
}
