"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Fish,
  Eye,
  MessageCircle,
  Pencil,
  RefreshCw,
  CheckCircle2,
  Trash2,
  Upload,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { categoryLabel } from "@/lib/marketplace/categories";
import { formatPrice, timeAgo } from "@/lib/marketplace/listings";
import { LISTING_LIFETIME_DAYS } from "@/lib/config";

export type ManagedListing = {
  id: string;
  slug: string;
  title: string;
  category: string;
  price_cents: number | null;
  is_wanted: boolean;
  images: string[] | null;
  status: string;
  views: number;
  city: string | null;
  region_name: string | null;
  state_code: string;
  bumped_at: string;
  expires_at: string;
  unread: number;
};

const STATUS_STYLES: Record<string, string> = {
  active: "text-emerald-300 bg-emerald-500/15 border-emerald-500/30",
  draft: "text-amber-300 bg-amber-500/15 border-amber-500/30",
  sold: "text-ocean-300 bg-ocean-700/30 border-ocean-600/40",
  expired: "text-coral-300 bg-coral-500/15 border-coral-500/30",
  removed: "text-ocean-400 bg-ocean-800/40 border-ocean-700/50",
};

function daysLeft(expiresAt: string, now: number): number {
  return Math.ceil((new Date(expiresAt).getTime() - now) / 86400000);
}

export default function MyListingsManager({
  listings,
}: {
  listings: ManagedListing[];
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  // `work` awaits the Supabase call itself and hands back just the error.
  // Supabase query builders are thenable but are not Promises, so they can't
  // be returned straight out of a callback typed as returning a Promise.
  async function run(
    id: string,
    work: () => Promise<{ message: string } | null>
  ) {
    setBusyId(id);
    setError(null);
    const err = await work();
    if (err) {
      setError(err.message || "That didn't save. Try again.");
      setBusyId(null);
      return;
    }
    setBusyId(null);
    setConfirmDelete(null);
    router.refresh();
  }

  function publish(l: ManagedListing) {
    const expires = new Date(
      Date.now() + LISTING_LIFETIME_DAYS * 86400000
    ).toISOString();
    return run(l.id, async () => {
      const { error: err } = await supabase
        .from("listings")
        .update({
          status: "active",
          bumped_at: new Date().toISOString(),
          expires_at: expires,
        })
        .eq("id", l.id);
      return err;
    });
  }

  function renew(l: ManagedListing) {
    return publish(l);
  }

  function markSold(l: ManagedListing) {
    return run(l.id, async () => {
      const { error: err } = await supabase
        .from("listings")
        .update({ status: "sold" })
        .eq("id", l.id);
      return err;
    });
  }

  function remove(l: ManagedListing) {
    return run(l.id, async () => {
      const { error: err } = await supabase
        .from("listings")
        .delete()
        .eq("id", l.id);
      return err;
    });
  }

  if (listings.length === 0) {
    return (
      <div className="text-center py-20 rounded-2xl border border-dashed border-ocean-800/60">
        <Fish className="w-10 h-10 text-ocean-700 mx-auto mb-4" />
        <p className="text-ocean-200 text-lg mb-1">Nothing posted yet</p>
        <p className="text-ocean-500 text-sm mb-6">
          Free to post, and it takes about a minute.
        </p>
        <Link
          href="/post"
          className="inline-block px-6 py-3 rounded-xl bg-ocean-600 text-white hover:bg-ocean-500 transition-colors"
        >
          Post your first listing
        </Link>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="rounded-xl border border-coral-500/40 bg-coral-500/10 px-5 py-4 text-coral-300 mb-5">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {listings.map((l) => {
          const image = l.images?.[0];
          const busy = busyId === l.id;
          const left = daysLeft(l.expires_at, now);
          const expiringSoon = l.status === "active" && left <= 7;

          return (
            <div
              key={l.id}
              className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-4"
            >
              <div className="flex items-start gap-4">
                <Link
                  href={`/listing/${l.slug}`}
                  className="shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-ocean-950 border border-ocean-800/60 flex items-center justify-center"
                >
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={image}
                      alt=""
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Fish className="w-7 h-7 text-ocean-700" />
                  )}
                </Link>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span
                      className={`text-[11px] font-medium uppercase tracking-wide rounded-full border px-2.5 py-0.5 ${
                        STATUS_STYLES[l.status] ?? STATUS_STYLES.removed
                      }`}
                    >
                      {l.status}
                    </span>
                    <span className="text-[11px] text-ocean-500">
                      {categoryLabel(l.category)}
                    </span>
                  </div>

                  <Link
                    href={`/listing/${l.slug}`}
                    className="block truncate text-white hover:text-ocean-200 transition-colors"
                  >
                    {l.title}
                  </Link>

                  <p className="text-sm text-ocean-400 mt-0.5">
                    {!l.is_wanted && `${formatPrice(l.price_cents)} · `}
                    {l.city ? `${l.city}, ` : ""}
                    {l.region_name ?? l.state_code}
                  </p>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ocean-500 mt-2">
                    <span className="inline-flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5" />
                      {l.views} {l.views === 1 ? "view" : "views"}
                    </span>
                    {l.unread > 0 && (
                      <Link
                        href="/messages"
                        className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        {l.unread} unread
                      </Link>
                    )}
                    <span>Bumped {timeAgo(l.bumped_at, now)}</span>
                    {l.status === "active" && (
                      <span className={expiringSoon ? "text-amber-400" : ""}>
                        {left <= 0
                          ? "expires today"
                          : `${left} ${left === 1 ? "day" : "days"} left`}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-ocean-900/70">
                {(l.status === "draft" ||
                  l.status === "expired" ||
                  l.status === "sold") && (
                  <button
                    type="button"
                    onClick={() => publish(l)}
                    disabled={busy}
                    className="inline-flex items-center gap-2 rounded-xl bg-ocean-600 hover:bg-ocean-500 text-white text-sm px-4 py-2 transition-colors disabled:opacity-60"
                  >
                    {busy ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    {l.status === "draft" ? "Publish" : "Repost"}
                  </button>
                )}

                {l.status === "active" && (
                  <>
                    <button
                      type="button"
                      onClick={() => renew(l)}
                      disabled={busy}
                      className="inline-flex items-center gap-2 rounded-xl border border-ocean-700/60 text-ocean-200 hover:text-white hover:border-ocean-600 text-sm px-4 py-2 transition-colors disabled:opacity-60"
                    >
                      {busy ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5" />
                      )}
                      Renew {LISTING_LIFETIME_DAYS} days
                    </button>
                    <button
                      type="button"
                      onClick={() => markSold(l)}
                      disabled={busy}
                      className="inline-flex items-center gap-2 rounded-xl border border-ocean-700/60 text-ocean-200 hover:text-white hover:border-ocean-600 text-sm px-4 py-2 transition-colors disabled:opacity-60"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {l.is_wanted ? "Mark found" : "Mark sold"}
                    </button>
                  </>
                )}

                <Link
                  href={`/listing/${l.slug}/edit`}
                  className="inline-flex items-center gap-2 rounded-xl border border-ocean-700/60 text-ocean-200 hover:text-white hover:border-ocean-600 text-sm px-4 py-2 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </Link>

                {confirmDelete === l.id ? (
                  <span className="inline-flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => remove(l)}
                      disabled={busy}
                      className="inline-flex items-center gap-2 rounded-xl bg-coral-600/80 hover:bg-coral-600 text-white text-sm px-4 py-2 transition-colors disabled:opacity-60"
                    >
                      {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Delete for good
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(null)}
                      className="text-sm text-ocean-400 hover:text-white transition-colors px-2"
                    >
                      Cancel
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(l.id)}
                    className="inline-flex items-center gap-2 rounded-xl border border-ocean-800/60 text-ocean-500 hover:text-coral-300 hover:border-coral-500/40 text-sm px-4 py-2 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
