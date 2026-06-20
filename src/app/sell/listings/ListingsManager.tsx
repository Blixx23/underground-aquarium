"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Fish,
  Plus,
  Search,
  Pencil,
  Eye,
  EyeOff,
  Send,
  Trash2,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { categoryLabel } from "@/lib/marketplace/categories";

type Listing = {
  id: string;
  name: string;
  slug: string;
  price: number | string;
  images: string[] | null;
  is_active: boolean | null;
  is_draft: boolean | null;
  stock: number | null;
  category: string | null;
  created_at: string;
};

type Status = "active" | "sold_out" | "hidden" | "draft";

const STATUS_META: Record<Status, { label: string; cls: string }> = {
  active: {
    label: "Active",
    cls: "text-emerald-300 bg-emerald-500/15 border-emerald-500/30",
  },
  sold_out: {
    label: "Sold out",
    cls: "text-amber-300 bg-amber-500/15 border-amber-500/30",
  },
  hidden: {
    label: "Hidden",
    cls: "text-ocean-300 bg-ocean-800/50 border-ocean-700/60",
  },
  draft: {
    label: "Draft",
    cls: "text-sky-300 bg-sky-500/15 border-sky-500/30",
  },
};

function statusOf(p: Listing): Status {
  if (p.is_draft) return "draft";
  if (p.is_active === false) return "hidden";
  if (p.stock === 0) return "sold_out";
  return "active";
}

type Tab = "all" | Status;
type SortKey = "newest" | "price_asc" | "price_desc";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "newest", label: "Newest" },
  { key: "price_asc", label: "Price: Low to High" },
  { key: "price_desc", label: "Price: High to Low" },
];

export default function ListingsManager({
  listings,
}: {
  listings: Listing[];
}) {
  const supabase = useMemo(() => createClient(), []);

  const [items, setItems] = useState<Listing[]>(listings);
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const counts = useMemo(() => {
    const m = { active: 0, sold_out: 0, hidden: 0, draft: 0 };
    for (const p of items) m[statusOf(p)]++;
    return m;
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = items.filter((p) => {
      if (tab !== "all" && statusOf(p) !== tab) return false;
      if (q) {
        const hay = `${p.name} ${categoryLabel(p.category)}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    return [...list].sort((a, b) => {
      if (sort === "price_asc") return Number(a.price) - Number(b.price);
      if (sort === "price_desc") return Number(b.price) - Number(a.price);
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });
  }, [items, tab, query, sort]);

  async function setActive(id: string, active: boolean) {
    setError(null);
    setBusyId(id);
    const { error: e } = await supabase
      .from("products")
      .update({ is_active: active })
      .eq("id", id);
    if (e) {
      setError("Couldn't update that listing. Please try again.");
      setBusyId(null);
      return;
    }
    setItems((prev) =>
      prev.map((p) => (p.id === id ? { ...p, is_active: active } : p))
    );
    setBusyId(null);
  }

  async function publishDraft(id: string) {
    setError(null);
    setBusyId(id);
    const { error: e } = await supabase
      .from("products")
      .update({ is_draft: false, is_active: true })
      .eq("id", id);
    if (e) {
      setError("Couldn't publish that draft. Please try again.");
      setBusyId(null);
      return;
    }
    setItems((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, is_draft: false, is_active: true } : p
      )
    );
    setBusyId(null);
  }

  async function remove(id: string) {
    setError(null);
    setBusyId(id);
    const { error: e } = await supabase.from("products").delete().eq("id", id);
    if (e) {
      setError("Couldn't delete that listing. Please try again.");
      setBusyId(null);
      setConfirmingId(null);
      return;
    }
    setItems((prev) => prev.filter((p) => p.id !== id));
    setBusyId(null);
    setConfirmingId(null);
  }

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "all", label: "All", count: items.length },
    { key: "active", label: "Active", count: counts.active },
    { key: "sold_out", label: "Sold out", count: counts.sold_out },
    { key: "hidden", label: "Hidden", count: counts.hidden },
    { key: "draft", label: "Drafts", count: counts.draft },
  ];

  if (items.length === 0) {
    return (
      <div className="text-center py-16 rounded-2xl border border-ocean-800/60 bg-ocean-900/30">
        <Fish className="w-10 h-10 text-ocean-600 mx-auto mb-4" />
        <p className="text-ocean-300 mb-1">You haven&apos;t listed anything yet</p>
        <p className="text-ocean-500 text-sm mb-5">
          Your products and drafts will show up here.
        </p>
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
    <div>
      {error && (
        <div className="mb-4 rounded-xl border border-coral-500/40 bg-coral-500/10 px-5 py-3 text-coral-300 text-sm">
          {error}
        </div>
      )}

      {/* Status tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 -mx-1 px-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`shrink-0 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium border transition-colors ${
              tab === t.key
                ? "bg-ocean-600 border-ocean-500 text-white"
                : "bg-ocean-900/60 border-ocean-800/60 text-ocean-300 hover:text-white hover:border-ocean-600/70"
            }`}
          >
            {t.label}
            <span className={tab === t.key ? "text-ocean-100" : "text-ocean-500"}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search + sort + new */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ocean-500 pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your listings…"
            className="w-full rounded-full bg-ocean-900/60 border border-ocean-800/60 pl-11 pr-4 py-2.5 text-sm text-white placeholder-ocean-600 focus:outline-none focus:border-ocean-500 transition-colors"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="rounded-full bg-ocean-900/60 border border-ocean-800/60 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-ocean-500 transition-colors"
        >
          {SORTS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
        <Link
          href="/sell"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-ocean-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-ocean-600 transition-colors"
        >
          <Plus className="w-4 h-4" /> New listing
        </Link>
      </div>

      {/* Rows */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-ocean-500 text-sm">
          Nothing in this view.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => {
            const status = statusOf(p);
            const meta = [
              categoryLabel(p.category),
              `$${Number(p.price).toFixed(2)}`,
            ];
            if (status !== "draft") {
              meta.push(
                typeof p.stock === "number" ? `${p.stock} in stock` : "In stock"
              );
            }
            const image = p.images?.[0];
            const busy = busyId === p.id;
            const confirming = confirmingId === p.id;
            return (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-xl border border-ocean-800/60 bg-ocean-900/40 p-3"
              >
                <div className="w-14 h-14 shrink-0 rounded-lg overflow-hidden bg-gradient-to-br from-ocean-800 to-ocean-950 flex items-center justify-center">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={image}
                      alt={p.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Fish className="w-5 h-5 text-ocean-700" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-white text-sm font-medium truncate">
                      {p.name || "Untitled draft"}
                    </p>
                    <span
                      className={`shrink-0 text-[10px] font-medium uppercase tracking-wide rounded-full border px-2 py-0.5 ${STATUS_META[status].cls}`}
                    >
                      {STATUS_META[status].label}
                    </span>
                  </div>
                  <p className="text-xs text-ocean-500 mt-0.5 truncate">
                    {meta.join(" · ")}
                  </p>
                </div>

                {confirming ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-ocean-400 hidden sm:inline">
                      Delete?
                    </span>
                    <button
                      onClick={() => remove(p.id)}
                      disabled={busy}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-coral-500/90 text-white text-xs hover:bg-coral-500 transition-colors disabled:opacity-60"
                    >
                      {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Delete
                    </button>
                    <button
                      onClick={() => setConfirmingId(null)}
                      disabled={busy}
                      className="px-3 py-1.5 rounded-lg bg-ocean-800 text-ocean-200 text-xs hover:bg-ocean-700 transition-colors disabled:opacity-60"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 shrink-0">
                    {busy && (
                      <Loader2 className="w-4 h-4 animate-spin text-ocean-500 mr-1" />
                    )}
                    {status === "draft" ? (
                      <button
                        onClick={() => publishDraft(p.id)}
                        disabled={busy}
                        title="Publish"
                        className="grid place-items-center w-8 h-8 rounded-lg bg-ocean-950/80 text-emerald-300 border border-ocean-700/60 hover:bg-emerald-500/15 hover:border-emerald-500/40 transition-colors disabled:opacity-50"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => setActive(p.id, p.is_active === false)}
                        disabled={busy}
                        title={p.is_active === false ? "Unhide" : "Hide"}
                        className="grid place-items-center w-8 h-8 rounded-lg bg-ocean-950/80 text-ocean-200 border border-ocean-700/60 hover:bg-ocean-800 hover:text-white hover:border-ocean-600 transition-colors disabled:opacity-50"
                      >
                        {p.is_active === false ? (
                          <Eye className="w-4 h-4" />
                        ) : (
                          <EyeOff className="w-4 h-4" />
                        )}
                      </button>
                    )}
                    <Link
                      href={`/listings/${p.id}/edit`}
                      title="Edit"
                      className="grid place-items-center w-8 h-8 rounded-lg bg-ocean-950/80 text-ocean-200 border border-ocean-700/60 hover:bg-ocean-800 hover:text-white hover:border-ocean-600 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => setConfirmingId(p.id)}
                      disabled={busy}
                      title="Delete"
                      className="grid place-items-center w-8 h-8 rounded-lg bg-ocean-950/80 text-ocean-200 border border-ocean-700/60 hover:bg-coral-500/30 hover:text-coral-200 hover:border-coral-500/50 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
