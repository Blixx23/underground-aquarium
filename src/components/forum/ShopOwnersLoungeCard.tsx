"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Store, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Lounge = { id: string; slug: string; name: string; description: string | null };
type Latest = { slug: string; title: string } | null;

/**
 * The Shop Owners Lounge, pinned to the top of the Forums page with a glow.
 * It asks the database for the lounge as the signed-in person; the database
 * only hands it to shop owners and admins, so everyone else never sees it.
 */
export default function ShopOwnersLoungeCard() {
  const supabase = useMemo(() => createClient(), []);
  const [lounge, setLounge] = useState<Lounge | null>(null);
  const [count, setCount] = useState(0);
  const [latest, setLatest] = useState<Latest>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const { data: cat } = await supabase
          .from("forum_categories")
          .select("id, slug, name, description")
          .eq("slug", "shop-owners")
          .maybeSingle();
        if (!live || !cat) return;
        setLounge(cat as Lounge);
        const { data: rows, count: n } = await supabase
          .from("forum_threads")
          .select("slug, title", { count: "exact" })
          .eq("category_id", (cat as Lounge).id)
          .is("hidden_at", null)
          .order("last_activity_at", { ascending: false })
          .limit(1);
        if (!live) return;
        setCount(n ?? 0);
        setLatest(((rows ?? [])[0] as Latest) ?? null);
      } catch {
        // No card if anything goes wrong; the rest of the page is unaffected.
      }
    })();
    return () => {
      live = false;
    };
  }, [supabase]);

  if (!lounge) return null;

  return (
    <div className="relative mb-6">
      {/* The glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-1 rounded-3xl bg-gradient-to-r from-emerald-500/40 via-teal-400/30 to-sky-500/40 opacity-70 blur-lg animate-pulse"
      />
      <div className="relative rounded-2xl border border-emerald-400/60 bg-gradient-to-br from-emerald-950/90 via-ocean-950/95 to-ocean-950 p-5 shadow-[0_0_40px_rgba(52,211,153,0.25)] transition-colors hover:border-emerald-300">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 ring-1 ring-emerald-400/50">
              <Store className="h-5 w-5 text-emerald-300" />
            </span>
            <div className="min-w-0">
              <Link
                href={`/forums/${lounge.slug}`}
                className="font-display text-lg text-white after:absolute after:inset-0 after:rounded-2xl after:content-['']"
              >
                {lounge.name}
              </Link>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-emerald-300">
                <Lock className="h-3 w-3" /> Only shop owners can see this
              </p>
              {lounge.description && <p className="mt-1.5 text-sm text-emerald-100/70">{lounge.description}</p>}
              {latest && (
                <p className="relative z-10 mt-1.5 truncate text-xs text-emerald-200/60">
                  Latest:{" "}
                  <Link href={`/forums/${lounge.slug}/${latest.slug}`} className="text-emerald-100 hover:underline">
                    {latest.title}
                  </Link>
                </p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 text-emerald-300">
            <span className="whitespace-nowrap text-xs">
              {count} {count === 1 ? "thread" : "threads"}
            </span>
            <ChevronRight className="h-4 w-4" />
          </div>
        </div>
      </div>
    </div>
  );
}
