import { Fish } from "lucide-react";

export default function MarketplaceLoading() {
  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-10">
          <p className="text-xs font-mono tracking-widest text-ocean-500 uppercase mb-3">
            Marketplace
          </p>
          <h1 className="font-display text-4xl md:text-5xl text-white mb-3">
            Browse the Reef
          </h1>
          <p className="text-ocean-400 max-w-2xl">
            Live fish, rare plants, and gear from aquarium keepers everywhere.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl overflow-hidden bg-ocean-900/60 border border-ocean-800/60"
            >
              <div className="relative aspect-[4/3] bg-ocean-800/60 flex items-center justify-center animate-pulse">
                <Fish className="w-12 h-12 text-ocean-700/50" />
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="h-5 w-2/3 rounded bg-ocean-800/70 animate-pulse" />
                  <div className="h-5 w-14 rounded bg-ocean-800/70 animate-pulse" />
                </div>
                <div className="h-3.5 w-full rounded bg-ocean-800/50 animate-pulse mb-2" />
                <div className="h-3.5 w-4/5 rounded bg-ocean-800/50 animate-pulse mb-4" />
                <div className="h-3 w-20 rounded bg-ocean-800/40 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}