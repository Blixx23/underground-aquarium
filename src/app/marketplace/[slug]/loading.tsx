import Link from "next/link";
import { Fish, ArrowLeft } from "lucide-react";

export default function ProductLoading() {
  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-5xl mx-auto">
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-2 text-sm text-ocean-400 hover:text-ocean-200 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" /> Back to the marketplace
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-ocean-800/60 border border-ocean-800/60 flex items-center justify-center animate-pulse">
            <Fish className="w-20 h-20 text-ocean-700/50" />
          </div>

          <div>
            <div className="h-9 w-3/4 rounded bg-ocean-800/70 animate-pulse mb-4" />
            <div className="h-8 w-28 rounded bg-ocean-800/70 animate-pulse mb-6" />
            <div className="h-4 w-24 rounded bg-ocean-800/50 animate-pulse mb-8" />

            <div className="mb-8">
              <div className="h-3 w-24 rounded bg-ocean-800/40 animate-pulse mb-3" />
              <div className="h-4 w-full rounded bg-ocean-800/50 animate-pulse mb-2" />
              <div className="h-4 w-11/12 rounded bg-ocean-800/50 animate-pulse mb-2" />
              <div className="h-4 w-2/3 rounded bg-ocean-800/50 animate-pulse" />
            </div>

            <div className="h-16 rounded-xl border border-ocean-800/60 bg-ocean-900/40 animate-pulse" />
          </div>
        </div>
      </div>
    </main>
  );
}