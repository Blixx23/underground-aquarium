import type { Motif } from "@/lib/seasons";

/**
 * Small line drawings for the seasonal themes. They inherit the text color,
 * so the theme decides the tint.
 */
export default function SeasonMotif({
  motif,
  className = "h-4 w-4",
}: {
  motif: Motif;
  className?: string;
}) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };

  if (motif === "pumpkin") {
    return (
      <svg {...common}>
        {/* stem and leaf */}
        <path d="M12 6.5c0-1.6.6-2.8 1.8-3.5" />
        <path d="M13.2 4.6c1.4-.6 2.9-.3 3.8.6-1.2.7-2.6.8-3.8-.6z" />
        {/* body: three lobes */}
        <path d="M12 6.8c-1.6-.9-3.6-.8-5.1.3C4.3 8.9 3.8 13 5 15.9c1.1 2.7 3.9 4.1 7 4.1s5.9-1.4 7-4.1c1.2-2.9.7-7-1.9-8.8-1.5-1.1-3.5-1.2-5.1-.3z" />
        <path d="M12 6.8c-1.5 1.8-2.2 4.8-2 7.4.2 2.4.9 4.5 2 5.8" />
        <path d="M12 6.8c1.5 1.8 2.2 4.8 2 7.4-.2 2.4-.9 4.5-2 5.8" />
      </svg>
    );
  }

  if (motif === "snowflake") {
    return (
      <svg {...common}>
        <path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9" />
        <path d="M10 4.5 12 6l2-1.5M10 19.5 12 18l2 1.5" />
        <path d="M4.4 10.1l2.3-.9-.4-2.4M17.7 16.8l-.4-2.4 2.3-.9" />
        <path d="M6.3 16.8l.4-2.4-2.3-.9M19.6 10.1l-2.3-.9.4-2.4" />
      </svg>
    );
  }

  // blossom
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="1.8" />
      <path d="M12 10.2c-1.8-1.6-2-4.4 0-6 2 1.6 1.8 4.4 0 6z" />
      <path d="M13.7 11.4c.5-2.3 2.9-3.8 5.3-3-.5 2.5-2.9 3.7-5.3 3z" />
      <path d="M13.1 13.5c2.3.6 3.6 3.1 2.6 5.4-2.3-.8-3.3-3.2-2.6-5.4z" />
      <path d="M10.9 13.5c.7 2.2-.3 4.6-2.6 5.4-1-2.3.3-4.8 2.6-5.4z" />
      <path d="M10.3 11.4c-2.4.7-4.8-.5-5.3-3 2.4-.8 4.8.7 5.3 3z" />
    </svg>
  );
}
