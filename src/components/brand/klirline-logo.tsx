import Image from "next/image";
import { cn } from "@/lib/utils";

type KlirBuildLogoProps = {
  className?: string;
  /** full = wordmark; mark = compact crop for collapsed nav */
  variant?: "full" | "mark";
  priority?: boolean;
};

/**
 * KlirBuild logo — white plate with the mark centered and fully inside.
 * Source PNG has large empty margins; scale from center crops them evenly.
 */
export function KlirBuildLogo({
  className,
  variant = "full",
  priority = false,
}: KlirBuildLogoProps) {
  if (variant === "mark") {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border border-black/5 bg-white shadow-soft",
          className ?? "h-12 w-12"
        )}
      >
        <Image
          src="/klirbuild-logo.png"
          alt="KlirBuild"
          fill
          priority={priority}
          className="object-contain object-center origin-center scale-[2.4] p-1"
          sizes="48px"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-black/5 bg-white shadow-soft",
        className ?? "h-[68px] w-[200px]"
      )}
    >
      <Image
        src="/klirbuild-logo.png"
        alt="KlirBuild"
        fill
        priority={priority}
        className="object-contain object-center origin-center scale-[1.75] p-2"
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
