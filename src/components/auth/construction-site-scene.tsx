"use client";

/**
 * Scène chantier animée (SVG + CSS) — identité construction pour la page login.
 * Mouvements : grue, montée d’étages, câble, bandes chantier.
 */
export function ConstructionSiteScene({ className = "" }: { className?: string }) {
  return (
    <div
      className={`login-site pointer-events-none relative overflow-hidden ${className}`}
      aria-hidden
    >
      <div className="login-site__sky absolute inset-0" />
      <div className="login-site__grid absolute inset-0 opacity-[0.22]" />
      <div className="login-site__haze absolute inset-x-0 bottom-0 h-1/3" />

      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 640 720"
        preserveAspectRatio="xMidYMid meet"
        role="presentation"
      >
        <defs>
          <linearGradient id="steel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2A4A73" />
            <stop offset="100%" stopColor="#132A4A" />
          </linearGradient>
          <linearGradient id="concrete" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8FA3BF" />
            <stop offset="100%" stopColor="#5A7599" />
          </linearGradient>
          <linearGradient id="brass" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F0D78C" />
            <stop offset="100%" stopColor="#D4AF37" />
          </linearGradient>
        </defs>

        {/* Horizon / sol chantier */}
        <rect x="0" y="560" width="640" height="160" fill="#0F2744" opacity="0.55" />
        <path
          d="M0 560 L80 548 L160 562 L250 540 L340 558 L430 536 L520 555 L640 542 L640 720 L0 720 Z"
          fill="#122033"
          opacity="0.9"
        />

        {/* Bandes chantier */}
        <g className="login-site__tape">
          <rect x="-40" y="600" width="720" height="18" fill="#D4AF37" opacity="0.95" />
          <g fill="#0B1520">
            {Array.from({ length: 18 }).map((_, i) => (
              <rect
                key={i}
                x={-40 + i * 42}
                y="600"
                width="18"
                height="18"
                transform={`skewX(-28) translate(0 0)`}
              />
            ))}
          </g>
        </g>

        {/* Immeuble en construction — étages qui montent */}
        <g className="login-site__building" transform="translate(170 180)">
          <rect x="0" y="40" width="190" height="340" fill="url(#concrete)" opacity="0.95" />
          <rect x="8" y="48" width="174" height="324" fill="none" stroke="#1A365D" strokeWidth="2" opacity="0.35" />
          {/* structure grille */}
          {Array.from({ length: 8 }).map((_, row) => (
            <g key={row} className="login-site__floor" style={{ animationDelay: `${row * 0.35}s` }}>
              <rect
                x="18"
                y={70 + row * 36}
                width="154"
                height="22"
                fill="#1A365D"
                opacity="0.18"
              />
              <rect x="28" y={76 + row * 36} width="28" height="10" fill="#0B1520" opacity="0.45" />
              <rect x="68" y={76 + row * 36} width="28" height="10" fill="#0B1520" opacity="0.3" />
              <rect x="108" y={76 + row * 36} width="28" height="10" fill="#0B1520" opacity="0.45" />
            </g>
          ))}
          {/* échafaudage */}
          <g stroke="#D4AF37" strokeWidth="2" opacity="0.8">
            <line x1="-18" y1="60" x2="-18" y2="380" />
            <line x1="208" y1="60" x2="208" y2="380" />
            {Array.from({ length: 9 }).map((_, i) => (
              <line key={i} x1="-18" y1={80 + i * 35} x2="208" y2={80 + i * 35} />
            ))}
          </g>
        </g>

        {/* Grue */}
        <g className="login-site__crane" transform="translate(390 70)">
          {/* mât */}
          <rect x="18" y="40" width="14" height="440" fill="url(#steel)" />
          <rect x="14" y="40" width="22" height="12" fill="#D4AF37" />
          {/* flèche */}
          <g className="login-site__jib" style={{ transformOrigin: "25px 52px" }}>
            <path d="M25 52 L210 36 L210 48 L25 64 Z" fill="url(#brass)" />
            <line x1="25" y1="58" x2="210" y2="42" stroke="#8A6E42" strokeWidth="1.5" />
            {/* câble + charge */}
            <g className="login-site__hook">
              <line x1="168" y1="40" x2="168" y2="150" stroke="#E2E8F0" strokeWidth="2" />
              <rect x="152" y="150" width="32" height="22" rx="2" fill="#D4AF37" />
              <rect x="158" y="156" width="20" height="10" fill="#1A365D" opacity="0.35" />
            </g>
          </g>
          {/* contre-poids */}
          <rect x="-36" y="44" width="54" height="28" rx="2" fill="#5A7599" />
        </g>

        {/* Camion / benne simplifiée */}
        <g className="login-site__truck" transform="translate(40 500)">
          <rect x="0" y="28" width="110" height="36" rx="4" fill="#1A365D" />
          <rect x="78" y="10" width="42" height="28" rx="3" fill="#2A4A73" />
          <rect x="88" y="16" width="22" height="12" fill="#D7DEE8" opacity="0.5" />
          <circle cx="24" cy="68" r="12" fill="#0B1520" />
          <circle cx="24" cy="68" r="5" fill="#D4AF37" />
          <circle cx="88" cy="68" r="12" fill="#0B1520" />
          <circle cx="88" cy="68" r="5" fill="#D4AF37" />
        </g>

        {/* particules poussière */}
        {Array.from({ length: 10 }).map((_, i) => (
          <circle
            key={i}
            className="login-site__dust"
            style={{ animationDelay: `${i * 0.55}s` }}
            cx={90 + i * 48}
            cy={420}
            r={1.8 + (i % 3)}
            fill="#E4D4B8"
            opacity="0.55"
          />
        ))}
      </svg>
    </div>
  );
}
