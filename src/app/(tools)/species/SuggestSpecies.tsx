"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Loader2, Plus, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/**
 * Request a fish that isn't in the library. An admin reviews it; when it's
 * added the requester gets bubbles, a trophy and a link to its new page.
 */
export default function SuggestSpecies({
  initialName = "",
  defaultOpen = false,
  compact = false,
  onDone,
}: {
  initialName?: string;
  defaultOpen?: boolean;
  /** Tighter layout for use inside the Tank Builder. */
  compact?: boolean;
  onDone?: () => void;
}) {
  const [supabase] = useState(() => createClient());
  const [open, setOpen] = useState(defaultOpen);
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [commonName, setCommonName] = useState(initialName);
  const [scientificName, setScientificName] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Signed in? Fall back to the stored session so a token refresh happening
  // elsewhere on the page doesn't make a signed-in person look signed out.
  useEffect(() => {
    if (!open || userId !== undefined) return;
    let alive = true;
    supabase.auth.getUser().then(async ({ data }) => {
      let id = data.user?.id ?? null;
      if (!id) id = (await supabase.auth.getSession()).data.session?.user.id ?? null;
      if (alive) setUserId(id);
    });
    return () => {
      alive = false;
    };
  }, [open, userId, supabase]);

  async function submit() {
    if (submitting) return;
    if (commonName.trim().length < 3) {
      setError("Enter the fish's name.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const { error: err } = await supabase.rpc("suggest_species", {
      p_common: commonName.trim(),
      p_scientific: scientificName.trim() || null,
      p_note: note.trim() || null,
    });
    setSubmitting(false);
    if (err) {
      setError(err.message || "Couldn't send that. Please try again.");
      return;
    }
    setDone(true);
    onDone?.();
  }

  const input =
    "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-base text-white placeholder:text-ocean-400 focus:border-emerald-500/40 focus:outline-none sm:text-sm";

  if (done) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.07] p-4 font-sans">
        <p className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
          <Check className="h-4 w-4" /> Request sent
        </p>
        <p className="mt-1 text-sm text-ocean-200">
          We&apos;ll check its care details and add it. You&apos;ll get a notification, bubbles and a trophy when it&apos;s
          in the library.
        </p>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="font-sans">
        <h2 className="mb-1 font-display text-xl text-white">Don&apos;t see a fish?</h2>
        <p className="mb-4 text-sm text-ocean-300">
          Request it. When it&apos;s added to the library you earn bubbles and the Cartographer trophy.
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-4 py-2.5 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-500/25"
        >
          <Plus className="h-4 w-4" /> Request a species
        </button>
      </div>
    );
  }

  if (userId === null) {
    return (
      <p className="font-sans text-sm text-ocean-200">
        <Link href="/login?next=/species" className="font-medium text-emerald-400 hover:text-emerald-300">
          Sign in
        </Link>{" "}
        to request a fish. You earn bubbles and a trophy when it&apos;s added.
      </p>
    );
  }

  return (
    <div className={`font-sans ${compact ? "" : "max-w-md"}`}>
      {!compact && <h2 className="mb-3 font-display text-xl text-white">Request a species</h2>}
      <div className="space-y-3">
        <input
          type="text"
          value={commonName}
          onChange={(e) => setCommonName(e.target.value)}
          maxLength={80}
          placeholder="Name you know it by (e.g. Golden Leopard Dojo Loach)"
          className={input}
          autoFocus={compact}
        />
        <input
          type="text"
          value={scientificName}
          onChange={(e) => setScientificName(e.target.value)}
          maxLength={100}
          placeholder="Scientific name, if you know it"
          className={input}
        />
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          rows={compact ? 2 : 3}
          placeholder="Anything that helps us find it (where you saw it, what it looks like)"
          className={input}
        />
      </div>
      {error && <p className="mt-2 text-sm text-coral-300">{error}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={submitting || userId === undefined}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-ocean-950 transition-colors hover:bg-emerald-400 disabled:opacity-50"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Send request
        </button>
        {!defaultOpen && (
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setError(null);
            }}
            className="rounded-lg border border-white/10 px-3 py-2.5 text-sm text-ocean-300 transition-colors hover:text-white"
          >
            Cancel
          </button>
        )}
        <span className="inline-flex items-center gap-1 text-xs text-amber-300/90">
          <Trophy className="h-3.5 w-3.5" /> Bubbles + trophy when it&apos;s added
        </span>
      </div>
    </div>
  );
}
