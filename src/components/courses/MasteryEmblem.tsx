/**
 * The Foundations Mastery medallion: a gold medal with a laurel wreath
 * wrapping up both sides, a fish in the centre and a star above it.
 * Shared by the exam, the Courses page tile and the profile hero card.
 * Meant for 56px and up; use a text badge for anything smaller.
 */
export default function MasteryEmblem({
  size = 96,
  muted = false,
  className = "",
}: {
  size?: number;
  muted?: boolean;
  className?: string;
}) {
  const id = muted ? "me-m" : "me";
  const gold = `url(#${id}-gold)`;
  const leaf = muted ? "#7dc4f0" : "#fbbf24";
  const fish = muted ? "#7dc4f0" : "#fde68a";

  // Laurel: leaves follow a circle (r 33) from the bottom up each side.
  // SVG angles: 90 is straight down, 180 is the left side.
  const leftAngles = [112, 132, 152, 172, 192];
  const leaves = leftAngles.flatMap((deg) => {
    const out: { x: number; y: number; rot: number }[] = [];
    for (const side of [-1, 1]) {
      const d = side < 0 ? deg : 180 - deg;
      const a = (d * Math.PI) / 180;
      const x = 60 + 33 * Math.cos(a);
      const y = 60 + 33 * Math.sin(a);
      // Along the curve, tipped outward like a real wreath.
      const rot = d + (side < 0 ? 30 : -30);
      out.push({ x, y, rot });
    }
    return out;
  });

  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={muted ? "#7dc4f0" : "#fef3c7"} />
          <stop offset="0.45" stopColor={muted ? "#1a82cc" : "#f59e0b"} />
          <stop offset="1" stopColor={muted ? "#072236" : "#92400e"} />
        </linearGradient>
        <radialGradient id={`${id}-core`} cx="0.5" cy="0.35" r="0.7">
          <stop offset="0" stopColor={muted ? "#0a3352" : "#1a3d32"} />
          <stop offset="1" stopColor={muted ? "#020b18" : "#06120e"} />
        </radialGradient>
      </defs>

      {/* Rim */}
      <circle cx="60" cy="60" r="57" fill={gold} opacity={muted ? 0.55 : 1} />
      <circle cx="60" cy="60" r="50" fill="none" stroke={muted ? "#c2e4fa" : "#fef3c7"} strokeOpacity="0.55" strokeWidth="1.2" />
      <circle cx="60" cy="60" r="47" fill={`url(#${id}-core)`} />

      {/* Laurel stems */}
      <path d="M54 94C40 90 28 78 26 60" fill="none" stroke={leaf} strokeWidth="1.6" strokeLinecap="round" opacity={muted ? 0.5 : 0.9} />
      <path d="M66 94C80 90 92 78 94 60" fill="none" stroke={leaf} strokeWidth="1.6" strokeLinecap="round" opacity={muted ? 0.5 : 0.9} />
      {leaves.map((l, i) => (
        <ellipse
          key={i}
          cx={l.x}
          cy={l.y}
          rx="2.8"
          ry="6.2"
          transform={`rotate(${l.rot} ${l.x} ${l.y})`}
          fill={leaf}
          opacity={muted ? 0.5 : 0.95}
        />
      ))}

      {/* Fish */}
      <path d="M40 62C47 51 64 50 73 62C64 74 47 73 40 62Z" fill={fish} opacity={muted ? 0.6 : 1} />
      <path d="M72 62L83 54L80 62L83 70Z" fill={leaf} opacity={muted ? 0.6 : 1} />
      <circle cx="49" cy="60" r="2.2" fill="#06120e" />

      {/* Star */}
      <path
        d="M60 24l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4-3.9-3.8 5.4-.8z"
        fill={fish}
        opacity={muted ? 0.5 : 1}
      />
    </svg>
  );
}
