/**
 * The Society seal simplified for small sizes (24 to 40px), for use beside a
 * member's name. The full seal's lettering turns to mush that small, so this
 * keeps only what reads at a glance: a bold brass ring and the fish over waves.
 */
export default function SocietyMark({ size = 34, className = "" }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="sm-brass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="0.5" stopColor="#d9a03c" />
          <stop offset="1" stopColor="#8a5a14" />
        </linearGradient>
        <radialGradient id="sm-core" cx="0.5" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#2a2110" />
          <stop offset="1" stopColor="#0b0905" />
        </radialGradient>
      </defs>
      <circle cx="20" cy="20" r="19" fill="url(#sm-brass)" />
      <circle cx="20" cy="20" r="15.5" fill="url(#sm-core)" />
      <circle cx="20" cy="20" r="15.5" fill="none" stroke="#fde68a" strokeOpacity="0.35" strokeWidth="0.8" />
      {/* Fish */}
      <path d="M11 17.5C13.5 13.5 21 13 25 17.5C21 22 13.5 21.5 11 17.5Z" fill="url(#sm-brass)" />
      <path d="M24.5 17.5L29.5 14.2L28.2 17.5L29.5 20.8Z" fill="url(#sm-brass)" />
      <circle cx="14.6" cy="16.9" r="1" fill="#0b0905" />
      {/* Waves */}
      <path d="M11 24.5q2.2-1.8 4.5 0t4.5 0 4.5 0 4.5 0" fill="none" stroke="url(#sm-brass)" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M13.5 28q2-1.5 4 0t4 0 4 0" fill="none" stroke="#d9a03c" strokeOpacity="0.7" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
