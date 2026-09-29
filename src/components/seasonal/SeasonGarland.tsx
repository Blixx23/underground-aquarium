import type { Motif } from "@/lib/seasons";

/**
 * A decoration that sits on the top edge of a box: for fall, a pumpkin
 * resting on the frame with a leafy vine trailing along it.
 *
 * Drawn on a 560 x 100 canvas where the box's top edge is y = 80, so the
 * parent places it with `-translate-y-[80%]` and it lines up exactly at
 * any width. `id` keeps the gradient ids unique when two are on a page.
 *
 * Seasons without a garland yet (winter, spring) render nothing, so a new
 * one only has to be drawn here.
 */
export default function SeasonGarland({
  motif,
  id,
  className = "",
}: {
  motif: Motif;
  id: string;
  className?: string;
}) {
  if (motif !== "pumpkin") return null;

  const vine = `${id}-vine`;
  const skin = `${id}-skin`;
  const skinDark = `${id}-skin-dark`;
  const leaf = `${id}-leaf`;

  return (
    <svg
      viewBox="0 0 560 100"
      aria-hidden
      className={`pointer-events-none select-none drop-shadow-[0_6px_10px_rgba(0,0,0,0.45)] ${className}`}
    >
      <defs>
        <linearGradient id={vine} x1="0" x2="1">
          <stop offset="0" stopColor="#65a30d" stopOpacity="0" />
          <stop offset="0.25" stopColor="#65a30d" stopOpacity="0.85" />
          <stop offset="1" stopColor="#4d7c0f" />
        </linearGradient>
        <radialGradient id={skin} cx="0.4" cy="0.35" r="0.75">
          <stop offset="0" stopColor="#fdba74" />
          <stop offset="0.45" stopColor="#f97316" />
          <stop offset="1" stopColor="#c2410c" />
        </radialGradient>
        <radialGradient id={skinDark} cx="0.5" cy="0.4" r="0.8">
          <stop offset="0" stopColor="#ea580c" />
          <stop offset="1" stopColor="#7c2d12" />
        </radialGradient>
        <g id={leaf}>
          <path
            d="M0 0C-5-3-13-5-16-13-10-13-9-17-7-24-3-20 1-20 7-24 9-17 10-13 16-13 13-5 5-3 0 0Z"
            fill="#4d7c0f"
          />
          <path
            d="M0 0L0-19M0-6L-9-12M0-6L9-12"
            stroke="#84cc16"
            strokeWidth="1"
            fill="none"
            strokeLinecap="round"
            opacity="0.7"
          />
        </g>
      </defs>

      {/* The vine, fading out at the far end */}
      <path
        d="M486 24C476 12 452 16 452 32 452 50 432 74 410 78S360 84 330 78 280 72 250 79 190 86 160 79 110 72 80 78 30 84 4 80"
        fill="none"
        stroke={`url(#${vine})`}
        strokeWidth="2.6"
        strokeLinecap="round"
      />

      {/* Curly tendrils */}
      <g fill="none" stroke="#65a30d" strokeWidth="1.4" strokeLinecap="round">
        <path d="M430 74c-2-8 4-14 10-11 5 3 1 9-3 6" />
        <path d="M300 75c-4-7 0-14 7-13 6 1 4 8-1 7" />
        <path d="M196 84c3 7 11 8 13 2 2-5-4-7-6-3" />
        <path d="M120 74c-3-7 2-13 8-11 5 2 2 8-2 6" opacity="0.8" />
        <path d="M470 20c4-8 13-8 14-2 1 5-6 6-6 2" />
      </g>

      {/* Leaves */}
      <use href={`#${leaf}`} transform="translate(438 64) rotate(-20) scale(1.25)" />
      <use href={`#${leaf}`} transform="translate(372 81) rotate(15) scale(1.05)" />
      <use href={`#${leaf}`} transform="translate(270 76) rotate(-12) scale(1.15)" />
      <use href={`#${leaf}`} transform="translate(228 81) rotate(160) scale(0.8)" />
      <use href={`#${leaf}`} transform="translate(150 78) rotate(8) scale(0.95)" opacity="0.9" />
      <use href={`#${leaf}`} transform="translate(72 79) rotate(-10) scale(0.75)" opacity="0.6" />

      {/* A little pumpkin along the vine */}
      <g transform="translate(330 78)">
        <ellipse cx="-7" cy="-9" rx="9" ry="9" fill={`url(#${skinDark})`} />
        <ellipse cx="7" cy="-9" rx="9" ry="9" fill={`url(#${skinDark})`} />
        <ellipse cx="0" cy="-9.5" rx="8" ry="9.5" fill={`url(#${skin})`} />
        <path d="M0-18c0-3 1-5 3-6" stroke="#65a30d" strokeWidth="2" strokeLinecap="round" fill="none" />
      </g>

      {/* The big pumpkin, sitting on the edge */}
      <ellipse cx="462" cy="55" rx="27" ry="26" fill={`url(#${skinDark})`} />
      <ellipse cx="518" cy="55" rx="27" ry="26" fill={`url(#${skinDark})`} />
      <ellipse cx="476" cy="54" rx="24" ry="28" fill={`url(#${skin})`} />
      <ellipse cx="504" cy="54" rx="24" ry="28" fill={`url(#${skin})`} />
      <ellipse cx="490" cy="53" rx="19" ry="29" fill={`url(#${skin})`} />
      <path
        d="M476 28c-6 12-6 40 0 52M504 28c6 12 6 40 0 52"
        stroke="#9a3412"
        strokeWidth="1.2"
        fill="none"
        opacity="0.6"
      />
      <ellipse cx="482" cy="40" rx="5" ry="9" fill="#fed7aa" opacity="0.35" />
      <path d="M488 27c-1-7 0-13 5-18l5 2c-4 4-5 10-4 16z" fill="#65532b" />
    </svg>
  );
}
