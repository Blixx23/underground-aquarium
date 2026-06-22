import BubbleIcon from "./BubbleIcon";
import {
  bubbleTier,
  TIER_COUNT,
  BUBBLE_TIERS,
} from "@/lib/bubbles";

export default function BubbleBadge({
  balance,
  peakRank = 0,
  showTier = true,
  size = "md",
}: {
  balance: number;
  // Highest tier ever reached (profiles.bubble_tier_seen). Rank never drops
  // below this, so a member keeps a tier they've earned even if bubbles dip.
  peakRank?: number;
  showTier?: boolean;
  size?: "sm" | "md";
}) {
  const currentRank = bubbleTier(balance).rank;
  const rank = Math.max(currentRank, peakRank || 0, 1);
  const tier = BUBBLE_TIERS[rank - 1];
  const next = rank < TIER_COUNT ? BUBBLE_TIERS[rank] : null;
  const toNext = next ? Math.max(0, next.min - balance) : 0;

  const icon = size === "sm" ? "w-4 h-4" : "w-5 h-5";
  const text = size === "sm" ? "text-sm" : "text-base";
  const title = next
    ? `${balance.toLocaleString()} bubbles · ${tier.name} (rank ${rank}/${TIER_COUNT}) · ${toNext.toLocaleString()} to ${next.name}`
    : `${balance.toLocaleString()} bubbles · ${tier.name} (rank ${rank}/${TIER_COUNT}) · top tier`;

  return (
    <span className="inline-flex items-center gap-1.5" title={title}>
      <BubbleIcon className={`${icon} ${tier.color}`} />
      <span className={`font-semibold tabular-nums ${tier.color} ${text}`}>
        {balance.toLocaleString()}
      </span>
      {showTier && (
        <span className="text-ocean-500 text-sm">
          · {tier.name}{" "}
          <span className="text-ocean-600">
            ({rank}/{TIER_COUNT})
          </span>
        </span>
      )}
    </span>
  );
}
