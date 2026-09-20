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

      {/* Fish: the same drawing as the site icon, scaled into the seal. */}
      <g
        fill="none"
        stroke="url(#seal-brass)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        transform="translate(100 90) scale(2.3) translate(-12 -12)"
      >
          <path d="M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-.94 3.47-3.44 6-7 6s-7.56-2.53-8.5-6Z" />
          <path d="M18 12v.5" />
          <path d="M16 17.93a9.77 9.77 0 0 1 0-11.86" />
          <path d="M7 10.67C7 8 5.58 5.97 2.73 5.5c-1 1.5-1 5 .23 6.5-1.24 1.5-1.24 5-.23 6.5C5.58 18.03 7 16 7 13.33" />
          <path d="M10.46 7.26C10.2 5.88 9.17 4.24 8 3h5.8a2 2 0 0 1 1.98 1.67l.23 1.4" />
          <path d="m16.01 17.93-.23 1.4A2 2 0 0 1 13.8 21H9.5a5.96 5.96 0 0 0 1.49-3.98" />
      </g>

      {/* Waves beneath */}
      <g
        fill="none"
        stroke="url(#seal-brass)"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.8"
      >
        <path d="M 74,130 q 8,-6 16,0 t 16,0 t 16,0" />
        <path d="M 80,140 q 7,-5.5 14,0 t 14,0" opacity="0.65" />
      </g>
    </svg>
  );
}
