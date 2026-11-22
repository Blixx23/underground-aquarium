import { categoryLabel } from "@/lib/marketplace/categories";

/**
 * What an ad shows when it has no photo: a panel tinted for its category with
 * a big emoji and the category name, so it reads at a glance like the forum
 * cards do, instead of an empty box. Fills whatever box it's put in.
 */
const LOOK: Record<string, { emoji: string; bg: string }> = {
  "livestock-freshwater": { emoji: "🐟", bg: "from-cyan-500/35 via-cyan-900/50" },
  "livestock-saltwater": { emoji: "🪸", bg: "from-rose-500/35 via-rose-900/50" },
  "livestock-inverts": { emoji: "🦐", bg: "from-orange-500/35 via-orange-900/50" },
  plants: { emoji: "🌿", bg: "from-emerald-500/35 via-emerald-900/50" },
  tanks: { emoji: "🐠", bg: "from-sky-500/35 via-sky-900/50" },
  equipment: { emoji: "💡", bg: "from-yellow-500/30 via-yellow-900/40" },
  hardscape: { emoji: "🪨", bg: "from-stone-400/35 via-stone-800/50" },
  "food-care": { emoji: "🧪", bg: "from-lime-500/30 via-lime-900/40" },
  diy: { emoji: "🛠️", bg: "from-slate-400/35 via-slate-800/50" },
  free: { emoji: "🎁", bg: "from-emerald-400/35 via-teal-900/50" },
  wanted: { emoji: "🔎", bg: "from-sky-400/35 via-indigo-900/50" },
  other: { emoji: "📦", bg: "from-violet-500/30 via-violet-900/40" },
};
const DEFAULT_LOOK = { emoji: "🐟", bg: "from-ocean-500/35 via-ocean-900/50" };

export default function NoPhoto({
  category,
  size = "tile",
  showLabel = true,
}: {
  category: string | null | undefined;
  /** "tile" for grid cards, "thumb" for small square thumbnails. */
  size?: "tile" | "thumb";
  /** Turn off where the card already shows the category. */
  showLabel?: boolean;
}) {
  const look = (category && LOOK[category]) || DEFAULT_LOOK;
  const thumb = size === "thumb";
  return (
    <span
      className={`flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br ${look.bg} to-ocean-950`}
      aria-hidden="true"
    >
      <span className={thumb ? "text-2xl" : "text-5xl drop-shadow-lg sm:text-6xl"}>{look.emoji}</span>
      {!thumb && showLabel && (
        <span className="px-3 text-center text-[11px] font-medium uppercase tracking-wider text-white/60">
          {categoryLabel(category)}
        </span>
      )}
    </span>
  );
}
