/**
 * A person's avatar: their photo if they have one, otherwise initials.
 * Society members in good standing get a brass ring, everywhere they
 * appear, so membership is visible without a word of copy.
 */
export default function Avatar({
  name,
  src,
  society = false,
  size = 40,
  className = "",
}: {
  name: string;
  src?: string | null;
  society?: boolean;
  size?: number;
  className?: string;
}) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?";

  const ring = society
    ? "bg-gradient-to-br from-amber-200 via-amber-400 to-amber-700 p-[2px] shadow-[0_0_18px_rgba(217,160,60,0.25)]"
    : "bg-ocean-700/60 p-px";

  return (
    <span
      className={`inline-flex shrink-0 rounded-full ${ring} ${className}`}
      style={{ width: size, height: size }}
      title={society ? `${name} · Society member` : name}
    >
      <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-ocean-900">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="h-full w-full object-cover" />
        ) : (
          <span
            className={`font-semibold ${society ? "text-amber-300" : "text-ocean-300"}`}
            style={{ fontSize: Math.max(11, size * 0.36) }}
          >
            {initials}
          </span>
        )}
      </span>
    </span>
  );
}
