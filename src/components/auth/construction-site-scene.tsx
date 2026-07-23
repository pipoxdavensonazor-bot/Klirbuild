"use client";

import { useId } from "react";

/**
 * Scène chantier animée (SVG + CSS) — visible dans la moitié droite du login.
 */
export function ConstructionSiteScene({ className = "" }: { className?: string }) {
  const uid = useId().replace(/:/g, "");
  const steel = `steel-${uid}`;
  const concrete = `concrete-${uid}`;
  const gold = `gold-${uid}`;

  return (
    <div
      className={`login-site pointer-events-none relative h-full w-full overflow-hidden ${className}`}
      aria-hidden
    >
      <div className="login-site__sky absolute inset-0" />
      <div className="login-site__grid absolute inset-0" />

      <svg
        className="absolute inset-0 h-full w-full opacity-100"
        viewBox="0 0 640 480"
        preserveAspectRatio="xMidYMid meet"
        role="presentation"
      >
        <defs>
          <linearGradient id={steel} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3D5F8A" />
            <stop offset="100%" stopColor="#1A365D" />
          </linearGradient>
          <linearGradient id={concrete} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C5D0E0" />
            <stop offset="100%" stopColor="#8FA3BF" />
          </linearGradient>
          <linearGradient id={gold} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F0D78C" />
            <stop offset="100%" stopColor="#D4AF37" />
          </linearGradient>
        </defs>

        {/* Sol */}
        <rect x="0" y="360" width="640" height="120" fill="#06101C" opacity="0.85" />
        <path
          d="M0 360 L90 348 L180 362 L280 340 L380 358 L480 338 L580 355 L640 345 L640 480 L0 480 Z"
          fill="#0F2744"
        />

        {/* Bandes chantier or */}
        <g className="login-site__tape">
          <rect x="-20" y="390" width="680" height="16" fill="#D4AF37" />
          <g fill="#0A1C31">
            {Array.from({ length: 16 }).map((_, i) => (
              <rect key={i} x={-20 + i * 44} y="390" width="20" height="16" transform="skewX(-26)" />
            ))}
          </g>
        </g>

        {/* Immeuble */}
        <g transform="translate(120 70)">
          <rect x="0" y="20" width="200" height="300" fill={`url(#${concrete})`} />
          <rect x="0" y="20" width="200" height="300" fill="none" stroke="#D4AF37" strokeWidth="2" opacity="0.45" />
          {Array.from({ length: 7 }).map((_, row) => (
            <g key={row}>
              <rect x="16" y={48 + row * 36} width="168" height="24" fill="#1A365D" opacity="0.28" />
              <rect x="28" y={54 + row * 36} width="36" height="12" fill="#0A1C31" opacity="0.55" />
              <rect x="80" y={54 + row * 36} width="36" height="12" fill="#0A1C31" opacity="0.4" />
              <rect x="132" y={54 + row * 36} width="36" height="12" fill="#0A1C31" opacity="0.55" />
            </g>
          ))}
          {/* échafaudage or */}
          <g stroke="#D4AF37" strokeWidth="2.5" fill="none" opacity="0.9">
            <line x1="-16" y1="30" x2="-16" y2="320" />
            <line x1="216" y1="30" x2="216" y2="320" />
            {Array.from({ length: 8 }).map((_, i) => (
              <line key={i} x1="-16" y1={50 + i * 34} x2="216" y2={50 + i * 34} />
            ))}
          </g>
        </g>

        {/* Grue */}
        <g className="login-site__crane" transform="translate(360 20)">
          <rect x="22" y="20" width="16" height="360" fill={`url(#${steel})`} />
          <rect x="16" y="16" width="28" height="14" fill="#D4AF37" />
          <g className="login-site__jib" style={{ transformOrigin: "30px 28px" }}>
            <path d="M30 28 L230 12 L230 26 L30 42 Z" fill={`url(#${gold})`} />
            <line x1="30" y1="35" x2="230" y2="19" stroke="#8A6E42" strokeWidth="1.5" />
            <g className="login-site__hook">
              <line x1="190" y1="18" x2="190" y2="130" stroke="#F2F5F9" strokeWidth="2.5" />
              <rect x="172" y="130" width="36" height="24" rx="2" fill="#D4AF37" />
              <rect x="180" y="136" width="20" height="12" fill="#1A365D" opacity="0.4" />
            </g>
          </g>
          <rect x="-40" y="22" width="58" height="30" rx="2" fill="#5A7599" />
        </g>

        {/* Camion */}
        <g className="login-site__truck" transform="translate(30 320)">
          <rect x="0" y="24" width="120" height="40" rx="4" fill="#1A365D" />
          <rect x="84" y="4" width="46" height="30" rx="3" fill="#2A4A73" />
          <rect x="94" y="10" width="24" height="14" fill="#D7DEE8" opacity="0.55" />
          <circle cx="28" cy="68" r="13" fill="#06101C" />
          <circle cx="28" cy="68" r="5" fill="#D4AF37" />
          <circle cx="96" cy="68" r="13" fill="#06101C" />
          <circle cx="96" cy="68" r="5" fill="#D4AF37" />
        </g>
      </svg>
    </div>
  );
}
