/**
 * The instant placeholder shown while a page that's built per visit (feed,
 * messages, profile, shops) loads. Tapping a tab answers right away instead
 * of sitting still until the server finishes.
 */
export default function PageSkeleton({
  width = "max-w-2xl",
  rows = 4,
  kind = "cards",
}: {
  width?: string;
  rows?: number;
  kind?: "cards" | "list";
}) {
  return (
    <main className="min-h-screen px-4 pb-24 pt-24 sm:px-6 sm:pt-28" aria-busy="true" aria-label="Loading">
      <div className={`mx-auto ${width}`}>
        <div className="mb-6 h-9 w-2/3 max-w-sm animate-pulse rounded-lg bg-ocean-800/60" />
        {kind === "cards" ? (
          <div className="space-y-4">
            {Array.from({ length: rows }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-ocean-800/60 bg-white/[0.03] p-4">
                <div className="mb-3 flex items-center gap-3">
                  <div className="h-10 w-10 animate-pulse rounded-full bg-ocean-800/70" />
                  <div className="h-4 w-32 animate-pulse rounded bg-ocean-800/60" />
                </div>
                <div className="mb-2 h-4 w-full animate-pulse rounded bg-ocean-900/80" />
                <div className="h-4 w-4/5 animate-pulse rounded bg-ocean-900/80" />
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-ocean-900/70 rounded-2xl border border-ocean-800/60 bg-white/[0.03]">
            {Array.from({ length: rows }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-4">
                <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-ocean-800/70" />
                <div className="flex-1">
                  <div className="mb-2 h-4 w-40 animate-pulse rounded bg-ocean-800/60" />
                  <div className="h-3 w-56 max-w-full animate-pulse rounded bg-ocean-900/80" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
