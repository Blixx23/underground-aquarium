/**
 * The Society's seal.
 *
 * Original artwork, drawn in SVG so it stays sharp at any size and can
 * take the page's own colours rather than shipping as a flat image.
 * Two engraved rings, the name set around the top, the year around the
 * bottom, and a fish over a pair of waves in the middle.
 *
 * Purely decorative, so it's hidden from screen readers — the name is
 * always in real text next to it.
 */
export default function SocietySeal({
  className = "",
  size = 200,
}: {
  className?: string;
  /** Rendered width and height in pixels. */
  size?: number;
}) {
  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* Name runs along the top, left to right. */}
        <path id="seal-arc-top" d="M 24,100 A 76,76 0 0 1 176,100" fill="none" />
        {/* Year runs along the bottom. Drawn right to left so it reads upright. */}
        <path
          id="seal-arc-bottom"
          d="M 24,100 A 76,76 0 0 0 176,100"
          fill="none"
        />

        <linearGradient id="seal-brass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fcd34d" />
          <stop offset="55%" stopColor="#d9a03c" />
          <stop offset="100%" stopColor="#a8741f" />
        </linearGradient>

        <radialGradient id="seal-core" cx="50%" cy="38%" r="70%">
          <stop offset="0%" stopColor="rgba(252,211,77,0.16)" />
          <stop offset="100%" stopColor="rgba(252,211,77,0)" />
        </radialGradient>
      </defs>

      {/* Rings */}
      <circle
        cx="100"
        cy="100"
        r="96"
        fill="none"
        stroke="url(#seal-brass)"
        strokeWidth="1.5"
        opacity="0.55"
      />
      <circle
        cx="100"
        cy="100"
        r="90"
        fill="none"
        stroke="url(#seal-brass)"
        strokeWidth="3"
      />
      <circle cx="100" cy="100" r="60" fill="url(#seal-core)" />
      <circle
        cx="100"
        cy="100"
        r="60"
        fill="none"
        stroke="url(#seal-brass)"
        strokeWidth="1.25"
        opacity="0.75"
      />

      {/* Ring text */}
      <text
        fill="url(#seal-brass)"
        fontSize="10.5"
        fontWeight="600"
        letterSpacing="1.9"
        fontFamily="var(--font-body), Georgia, serif"
      >
        <textPath href="#seal-arc-top" startOffset="50%" textAnchor="middle">
          UNDERGROUND AQUARIUM
        </textPath>
      </text>

      <text
        fill="url(#seal-brass)"
        fontSize="10"
        fontWeight="600"
        letterSpacing="3.6"
        fontFamily="var(--font-mono), ui-monospace, monospace"
      >
        <textPath href="#seal-arc-bottom" startOffset="50%" textAnchor="middle">
          SOCIETY · EST. 2026
        </textPath>
      </text>

      {/* Separator diamonds where the two arcs meet */}
      <g fill="url(#seal-brass)">
        <rect
          x="20.5"
          y="96.5"
          width="7"
          height="7"
          transform="rotate(45 24 100)"
        />
        <rect
          x="172.5"
          y="96.5"
          width="7"
          height="7"
          transform="rotate(45 176 100)"
        />
      </g>

      {/* Fish */}
      <g
        fill="none"
        stroke="url(#seal-brass)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Body */}
        <path d="M 78,92 C 90,80 112,80 124,92 C 112,104 90,104 78,92 Z" />
        {/* Tail */}
        <path d="M 78,92 L 66,84 L 70,92 L 66,100 Z" />
        {/* Dorsal fin */}
        <path d="M 96,83 C 100,75 108,74 112,79" />
        {/* Lower fin */}
        <path d="M 97,101 C 99,107 105,108 108,104" />
      </g>
      <circle cx="115" cy="89" r="2.2" fill="url(#seal-brass)" />

      {/* Waves beneath */}
      <g
        fill="none"
        stroke="url(#seal-brass)"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.8"
      >
        <path d="M 74,116 q 8,-6 16,0 t 16,0 t 16,0" />
        <path d="M 80,126 q 7,-5.5 14,0 t 14,0" opacity="0.65" />
      </g>
    </svg>
  );
}
