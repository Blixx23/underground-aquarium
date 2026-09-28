import { formatCount } from "@/lib/forum/limits";

/**
 * "1,234 / 10,000" under a forum text box. Turns amber as the limit gets
 * close and coral once it's over, so people see the problem before they
 * press Post instead of after.
 */
export default function CharCounter({
  length,
  max,
  className = "",
}: {
  length: number;
  max: number;
  className?: string;
}) {
  const over = length > max;
  const near = !over && length >= max * 0.9;
  const tone = over ? "text-coral-300" : near ? "text-amber-300/80" : "text-ocean-600";
  return (
    <span className={`text-[11px] tabular-nums ${tone} ${className}`} aria-live="polite">
      {formatCount(length)} / {formatCount(max)}
      {over && ` (${formatCount(length - max)} over)`}
    </span>
  );
}
