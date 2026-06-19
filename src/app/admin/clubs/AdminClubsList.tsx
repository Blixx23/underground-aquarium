"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, X, ExternalLink, MapPin, Loader2 } from "lucide-react";

type QueueClub = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  city: string | null;
  state: string | null;
  logo_url: string | null;
  dues_amount_cents: number | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  public_url: string | null;
  meeting_info: string | null;
  nonprofit_info: string | null;
  owner_name: string | null;
  owner_username: string | null;
  owner_email: string | null;
};

export default function AdminClubsList({
  initialClubs,
}: {
  initialClubs: QueueClub[];
}) {
  const router = useRouter();
  const [clubs, setClubs] = useState<QueueClub[]>(initialClubs);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(id: string, action: "approve" | "reject") {
    if (
      action === "reject" &&
      !confirm("Reject this club's public listing? It will stay private.")
    ) {
      return;
    }
    setError(null);
    setBusyId(id);
    try {
      const res = await fetch("/api/admin/clubs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clubId: id, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setClubs((prev) => prev.filter((c) => c.id !== id));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusyId(null);
    }
  }

  if (clubs.length === 0) {
    return (
      <div className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-10 text-center text-ocean-400">
        No clubs waiting for review.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-coral-300 rounded-lg border border-coral-500/30 bg-coral-500/10 px-4 py-2">
          {error}
        </p>
      )}
      {clubs.map((c) => {
        const owner = c.owner_username
          ? `@${c.owner_username}`
          : c.owner_name || c.owner_email || "Unknown";
        const busy = busyId === c.id;
        return (
          <div
            key={c.id}
            className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-5"
          >
            <div className="flex items-start gap-4">
              {c.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={c.logo_url}
                  alt=""
                  className="w-12 h-12 rounded-xl object-cover shrink-0 border border-ocean-800/60"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-ocean-800/50 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-white font-medium">{c.name}</h3>
                  <Link
                    href={`/c/${c.slug}`}
                    target="_blank"
                    className="text-ocean-400 hover:text-ocean-200 inline-flex items-center gap-1 text-xs"
                  >
                    view <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
                {(c.city || c.state) && (
                  <p className="text-sm text-ocean-400 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5" />
                    {[c.city, c.state].filter(Boolean).join(", ")}
                  </p>
                )}
                <p className="text-xs text-ocean-500 mt-0.5">Owner: {owner}</p>
                {c.dues_amount_cents && c.dues_amount_cents > 0 ? (
                  <p className="text-xs text-ocean-500">
                    Dues: ${(c.dues_amount_cents / 100).toFixed(2)}
                  </p>
                ) : (
                  <p className="text-xs text-ocean-500">No dues</p>
                )}
                {c.description && (
                  <p className="text-sm text-ocean-300 mt-2 whitespace-pre-line">
                    {c.description}
                  </p>
                )}
                <div className="mt-3 space-y-1 text-xs text-ocean-400 border-t border-ocean-800/50 pt-3">
                  {c.contact_name && <p>Organizer: {c.contact_name}</p>}
                  {(c.contact_email || c.contact_phone) && (
                    <p>
                      {[c.contact_email, c.contact_phone]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                  {c.public_url && (
                    <p className="truncate">
                      Link:{" "}
                      <a
                        href={c.public_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-ocean-300 hover:text-ocean-100 underline underline-offset-2"
                      >
                        {c.public_url}
                      </a>
                    </p>
                  )}
                  {c.meeting_info && <p>Meets: {c.meeting_info}</p>}
                  {c.nonprofit_info && <p>Nonprofit: {c.nonprofit_info}</p>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={() => act(c.id, "approve")}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-600 hover:bg-emerald-500 px-4 py-1.5 text-sm font-medium text-white transition-colors disabled:opacity-60"
              >
                {busy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Approve
              </button>
              <button
                onClick={() => act(c.id, "reject")}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-full border border-ocean-700/60 px-4 py-1.5 text-sm text-ocean-300 hover:text-white hover:border-coral-500/50 transition-colors disabled:opacity-60"
              >
                <X className="w-4 h-4" /> Reject
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
