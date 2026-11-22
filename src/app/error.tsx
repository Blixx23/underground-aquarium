"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";

/**
 * Shown when part of a page crashes in the browser. Tells the visitor plainly,
 * offers a retry, and quietly lets the support inbox know.
 */
export default function ErrorScreen({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    fetch("/api/client-error", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ where: window.location.pathname, message: error.message, digest: error.digest ?? null }),
      keepalive: true,
    }).catch(() => {});
  }, [error]);

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-6 pt-24">
      <div className="max-w-md text-center">
        <h1 className="font-display text-3xl text-white">Something went wrong</h1>
        <p className="mt-3 text-ocean-300">
          This page hit a problem. We&apos;ve been told about it. Try again, and if it keeps happening, email{" "}
          <a href="mailto:support@undergroundaquarium.com" className="text-emerald-300 hover:text-emerald-200">
            support@undergroundaquarium.com
          </a>
          .
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-ocean-950 hover:bg-emerald-400"
          >
            <RotateCcw className="h-4 w-4" /> Try again
          </button>
          <Link href="/" className="rounded-xl border border-white/15 px-5 py-2.5 text-sm text-ocean-200 hover:bg-white/5">
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
