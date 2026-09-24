import { Fish } from "lucide-react";

/**
 * Shown the instant a link is tapped, while the next page loads, so a tap
 * never looks like it did nothing. Pages with their own loading screen
 * (the classifieds) still use theirs.
 */
export default function Loading() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center pt-24" role="status" aria-label="Loading">
      <span className="flex h-14 w-14 animate-pulse items-center justify-center rounded-full border border-ocean-700/60 bg-ocean-900/70">
        <Fish className="h-7 w-7 text-ocean-300" />
      </span>
    </div>
  );
}
