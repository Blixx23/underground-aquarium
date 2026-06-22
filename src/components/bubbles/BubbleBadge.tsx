import BubbleIcon from "./BubbleIcon";
import { bubbleTier, nextBubbleTier, TIER_COUNT } from "@/lib/bubbles";

export default function BubbleBadge({
  balance,
  showTier = true,
  size = "md",
}: {
  balance: number;
  showTier?: boolean;
  size?: "sm" | "md";
}) {
  const tier = bubbleTier(balance);
  const next = nextBubbleTier(balance);
  const icon = size === "sm" ? "w-4 h-4" : "w-5 h-5";
  const text = size === "sm" ? "text-sm" : "text-base";
  const title = next
    ? `${balance.toLocaleString()} bubbles · ${tier.name} (rank ${tier.rank}/${TIER_COUNT}) · ${(
        next.min - balance
      ).toLocaleString()} to ${next.name}`
    : `${balance.toLocaleString()} bubbles · ${tier.name} (rank ${tier.rank}/${TIER_COUNT}) · top tier`;
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
            ({tier.rank}/{TIER_COUNT})
          </span>
        </span>
      )}
    </span>
  );
}
