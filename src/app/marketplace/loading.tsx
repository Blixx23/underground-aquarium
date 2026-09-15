export default function MarketplaceLoading() {
  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12">
          <p className="text-xs font-mono tracking-widest text-ocean-500 uppercase mb-3">
            Free Classifieds
          </p>
          <div className="h-11 w-3/4 max-w-xl rounded bg-ocean-800/60 animate-pulse mb-4" />
          <div className="h-5 w-full max-w-2xl rounded bg-ocean-900/70 animate-pulse mb-2" />
          <div className="h-5 w-2/3 max-w-lg rounded bg-ocean-900/70 animate-pulse" />
        </div>

        <div className="mb-14">
          <div className="h-6 w-40 rounded bg-ocean-800/50 animate-pulse mb-5" />
          <div className="flex flex-wrap gap-2.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-10 w-36 rounded-full bg-ocean-900/60 border border-ocean-800/60 animate-pulse"
              />
            ))}
          </div>
        </div>

        <div>
          <div className="h-6 w-44 rounded bg-ocean-800/50 animate-pulse mb-6" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-1">
            {Array.from({ length: 16 }).map((_, i) => (
              <div
                key={i}
                className="h-10 border-b border-ocean-900/70 flex items-center"
              >
                <div className="h-4 w-24 rounded bg-ocean-900/70 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
