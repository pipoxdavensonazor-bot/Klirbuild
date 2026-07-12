import Image from "next/image";
import { cn } from "@/lib/utils";

type KlirBuildLogoProps = {
  className?: string;
  /** full = wordmark; mark = compact crop for collapsed nav */
  variant?: "full" | "mark";
  /** rounded = coins arrondis · circle = rond (avatar) */
  shape?: "rounded" | "circle";
  /** Zoom du visuel (défaut 1.0 — logo centré dans le fond) */
  zoom?: number;
  priority?: boolean;
};

const shapeClass = {
  rounded: "rounded-xl",
  circle: "rounded-full",
} as const;

const DEFAULT_ZOOM = 0.88;
const MARK_ZOOM = 0.82;

export function KlirBuildLogo({
  className,
  variant = "full",
  shape = "rounded",
  zoom,
  priority = false,
}: KlirBuildLogoProps) {
  const scale = zoom ?? (variant === "mark" ? MARK_ZOOM : DEFAULT_ZOOM);
  if (variant === "mark") {
    return (
      <div
        className={cn(
          "relative overflow-hidden border border-black/5 bg-white shadow-soft",
          shapeClass[shape],
          className ?? "h-12 w-12"
        )}
      >
        <Image
          src="/klirbuild-logo.png"
          alt="KlirBuild"
          fill
          priority={priority}
          className="object-contain object-center origin-center"
          style={{ transform: `scale(${scale})` }}
          sizes="48px"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden border border-black/5 bg-white shadow-soft",
        shapeClass[shape],
        className ?? "h-[68px] w-[200px]"
      )}
    >
      <Image
        src="/klirbuild-logo.png"
        alt="KlirBuild"
        fill
        priority={priority}
        className="object-contain object-center origin-center"
        style={{ transform: `scale(${scale})` }}
        sizes="220px"
      />
    </div>
  );
}

/** @deprecated Use KlirBuildLogo — kept as alias for existing imports */
export function KlirlineLogo(props: KlirBuildLogoProps & { surface?: "white" | "dark" }) {
  const { surface: _surface, ...rest } = props;
  return <KlirBuildLogo {...rest} />;
}
