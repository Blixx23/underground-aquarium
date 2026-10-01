/**
 * The Foundations Mastery medallion: a gold laurel ring around a fish.
 * Shared by the exam, the Courses page tile and the profile.
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
  const leaves = Array.from({ length: 9 }, (_, i) => i);
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={muted ? "#7dc4f0" : "#fef3c7"} />
          <stop offset="0.45" stopColor={muted ? "#1a82cc" : "#fbbf24"} />
          <stop offset="1" stopColor={muted ? "#072236" : "#b45309"} />
        </linearGradient>
        <radialGradient id={`${id}-core`} cx="0.5" cy="0.4" r="0.6">
          <stop offset="0" stopColor={muted ? "#0a3352" : "#1a3d32"} />
          <stop offset="1" stopColor={muted ? "#041525" : "#0d1f1a"} />
        </radialGradient>
      </defs>
      {/* outer ring */}
      <circle cx="60" cy="60" r="56" fill={`url(#${id}-gold)`} opacity={muted ? 0.5 : 1} />
      <circle cx="60" cy="60" r="47" fill={`url(#${id}-core)`} />
      {/* laurel, both sides */}
      {leaves.map((i) => {
        const a = (200 + i * 17) * (Math.PI / 180);
        const x = 60 + 38 * Math.cos(a);
        const y = 60 + 38 * Math.sin(a);
        const rot = (200 + i * 17) + 90;
        return (
          <g key={`l${i}`}>
            <ellipse cx={x} cy={y} rx="3.2" ry="7" transform={`rotate(${rot} ${x} ${y})`} fill={`url(#${id}-gold)`} opacity={muted ? 0.45 : 0.95} />
            <ellipse cx={120 - x} cy={y} rx="3.2" ry="7" transform={`rotate(${-rot} ${120 - x} ${y})`} fill={`url(#${id}-gold)`} opacity={muted ? 0.45 : 0.95} />
          </g>
        );
      })}
      {/* fish */}
      <path
        d="M36 60C44 47 66 46 76 60C66 74 44 73 36 60Z"
        fill={muted ? "#7dc4f0" : "#fde68a"}
        opacity={muted ? 0.6 : 1}
      />
      <path d="M75 60L88 51L85 60L88 69Z" fill={muted ? "#7dc4f0" : "#fbbf24"} opacity={muted ? 0.6 : 1} />
      <circle cx="46" cy="58" r="2.4" fill="#0d1f1a" />
      {/* star */}
      <path
        d="M60 17l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"
        fill={muted ? "#7dc4f0" : "#fef3c7"}
        opacity={muted ? 0.5 : 1}
      />
    </svg>
  );
}
