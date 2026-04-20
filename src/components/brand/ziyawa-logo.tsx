'use client'

interface ZiyawaLogoProps {
  size?: number
  className?: string
}

export function ZiyawaLogo({ size = 32, className = '' }: ZiyawaLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Ziyawa logo"
    >
      {/* Background circle */}
      <circle cx="32" cy="32" r="32" fill="currentColor" />

      {/* Stylized Z with integrated sound wave */}
      <g>
        {/* Top horizontal bar of Z */}
        <rect x="13" y="13" width="38" height="5.5" rx="2.5" fill="white" />

        {/* Bottom horizontal bar of Z */}
        <rect x="13" y="45.5" width="38" height="5.5" rx="2.5" fill="white" />

        {/* Sound wave pulse — 3 bars replacing the Z diagonal, centered with equal gaps from top and bottom bars */}
        <rect x="22" y="25" width="4" height="14" rx="2" fill="white" />
        <rect x="30" y="22" width="4" height="20" rx="2" fill="white" />
        <rect x="38" y="27" width="4" height="10" rx="2" fill="white" />
      </g>
    </svg>
  )
}
