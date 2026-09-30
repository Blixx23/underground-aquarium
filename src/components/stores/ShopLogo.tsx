/**
 * The shop's round picture, like a Facebook profile photo. Until the owner
 * uploads a logo it shows the shop's initials on our emerald, so every shop
 * has one from day one.
 */
export default function ShopLogo({
  name,
  url,
  size = 40,
  className = "",
  fluid = false,
}: {
  name: string;
  url: string | null;
  size?: number;
  className?: string;
  /** Let className set the size (for sizes that change with screen width). */
  fluid?: boolean;
}) {
  const initials =
    name
      .replace(/['\u2019]/g, "")
      .replace(/[^A-Za-z0-9 ]/g, " ")
      .split(/\s+/)
      .filter((w) => w && !/^(the|and|of)$/i.test(w))
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join("") || "?";

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-emerald-600 to-ocean-800 ${className}`}
      style={fluid ? undefined : { width: size, height: size }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={`${name} logo`} className="h-full w-full object-cover" />
      ) : (
        <span
          className="font-display text-white"
          style={{ fontSize: fluid ? "clamp(1.5rem, 4vw, 2.5rem)" : Math.max(12, Math.round(size * 0.36)) }}
          aria-hidden
        >
          {initials}
        </span>
      )}
    </span>
  );
}
