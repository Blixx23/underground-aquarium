"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";

/**
 * Save an ad. Saved ads are listed at /my/saved, and their owners'
 * price drops and sales show up as notifications.
 */
export default function SaveListingButton({
  listingId,
  initialSaved,
  signedIn,
  path,
}: {
  listingId: string;
  initialSaved: boolean;
  signedIn: boolean;
  /** This ad's page, to come back to after signing in. */
  path: string;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState(false);

  const cls =
    "mt-3 inline-flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl border transition-colors";

  if (!signedIn) {
    return (
      <Link href={`/login?next=${encodeURIComponent(path)}`} className={`${cls} border-ocean-800/60 text-ocean-200 hover:text-white`}>
        <Heart className="w-4 h-4" />
        Save this ad
      </Link>
    );
  }

  async function toggle() {
    setBusy(true);
    const next = !saved;
    setSaved(next);
    const res = await fetch("/api/listings/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId, saved: next }),
    }).catch(() => null);
    if (!res?.ok) setSaved(!next);
    setBusy(false);
  }

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={saved}
        className={`${cls} ${
          saved
            ? "border-coral-400/50 bg-coral-500/10 text-coral-300"
            : "border-ocean-800/60 text-ocean-200 hover:text-white hover:border-ocean-600"
        }`}
      >
        <Heart className={`w-4 h-4 ${saved ? "fill-current" : ""}`} />
        {saved ? "Saved" : "Save this ad"}
      </button>
      {saved && (
        <p className="mt-2 text-center text-xs text-ocean-500">
          We&apos;ll let you know if the price drops or it sells.{" "}
          <Link href="/my/saved" className="text-ocean-300 underline hover:text-white">
            Your saved ads
          </Link>
        </p>
      )}
    </div>
  );
}
