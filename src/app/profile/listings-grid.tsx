"use client";

import { useState } from "react";
import Link from "next/link";
import { Fish, Plus, Trash2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Listing = {
  id: string;
  name: string;
  slug: string;
  price: number | string;
  images: string[] | null;
  is_active: boolean | null;
};

export default function ListingsGrid({ listings }: { listings: Listing[] }) {
  const supabase = createClient();

  const [items, setItems] = useState<Listing[]>(listings);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setError(null);
    setDeletingId(id);

    const { error: deleteError } = await supabase
      .from("products")
      .delete()
      .eq("id", id);

    if (deleteError) {
      setError("Couldn't delete that listing. Please try again.");
      setDeletingId(null);
      setConfirmingId(null);
      return;
    }

    setItems((prev) => prev.filter((p) => p.id !== id));
    setDeletingId(null);
    setConfirmingId(null);
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16 rounded-2xl border border-ocean-800/60 bg-ocean-900/30">
        <Fish className="w-10 h-10 text-ocean-600 mx-auto mb-4" />
        <p className="text-ocean-300 mb-1">You haven&apos;t listed anything yet</p>
        <p className="text-ocean-500 text-sm mb-5">Your products will show up here once you do.</p>
        <Link
          href="/sell"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-ocean-700 text-white text-sm hover:bg-ocean-600 transition-colors"
        >
          <Plus className="w-4 h-4" /> Create your first listing
        </Link>
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="mb-4 rounded-xl border border-coral-500/40 bg-coral-500/10 px-5 py-3 text-coral-300 text-sm">
          {error}
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((p) => {
          const image = p.images?.[0];
          const isConfirming = confirmingId === p.id;
          const isDeleting = deletingId === p.id;
          return (
            <div
              key={p.id}
              className="relative rounded-xl overflow-hidden bg-ocean-900/60 border border-ocean-800/60 hover:border-ocean-600/70 transition-colors"
            >
              <Link href={`/marketplace/${p.slug}`} className="block">
                <div className="relative aspect-square bg-gradient-to-br from-ocean-800 to-ocean-950 flex items-center justify-center overflow-hidden">
                  {image ? (
                    <img src={image} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <Fish className="w-8 h-8 text-ocean-700" />
                  )}
                  {p.is_active === false && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider rounded-full bg-ocean-950/80 text-ocean-300 border border-ocean-700/60">
                      Hidden
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-sm text-white truncate">{p.name}</p>
                  <p className="text-xs text-ocean-300">${Number(p.price).toFixed(2)}</p>
                </div>
              </Link>

              <button
                type="button"
                onClick={() => setConfirmingId(p.id)}
                aria-label={`Delete ${p.name}`}
                className="absolute top-2 right-2 grid place-items-center w-8 h-8 rounded-lg bg-ocean-950/80 text-ocean-200 border border-ocean-700/60 hover:bg-coral-500/30 hover:text-coral-200 hover:border-coral-500/50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              {isConfirming && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-ocean-950/90 backdrop-blur-sm p-4 text-center">
                  <p className="text-sm text-white">Delete this listing?</p>
                  <p className="text-xs text-ocean-400">This can&apos;t be undone.</p>
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => handleDelete(p.id)}
                      disabled={isDeleting}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-coral-500/90 text-white text-xs hover:bg-coral-500 transition-colors disabled:opacity-60"
                    >
                      {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      {isDeleting ? "Deleting…" : "Delete"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingId(null)}
                      disabled={isDeleting}
                      className="px-3 py-1.5 rounded-lg bg-ocean-800 text-ocean-200 text-xs hover:bg-ocean-700 transition-colors disabled:opacity-60"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}