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

  // Kept compact: one line to get in, one line saying who can see it.
  return (
    <div className="relative mb-5">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-emerald-500/30 via-teal-400/20 to-sky-500/30 opacity-60 blur-md"
      />
      <div className="relative flex items-center gap-3 rounded-xl border border-emerald-400/50 bg-gradient-to-r from-emerald-950/90 to-ocean-950/95 px-3.5 py-2.5 transition-colors hover:border-emerald-300">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 ring-1 ring-emerald-400/50">
          <Store className="h-4 w-4 text-emerald-300" />
        </span>
        <div className="min-w-0 flex-1">
          <Link
            href={`/forums/${lounge.slug}`}
            className="block truncate text-sm font-semibold text-white after:absolute after:inset-0 after:rounded-xl after:content-['']"
          >
            {lounge.name}
          </Link>
          <p className="flex items-center gap-1 truncate text-xs text-emerald-200/80">
            <Lock className="h-3 w-3 shrink-0" />
            <span className="truncate">Private: only shop owners can see these threads</span>
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-1 text-xs text-emerald-300">
          {count} {count === 1 ? "thread" : "threads"}
          <ChevronRight className="h-4 w-4" />
        </span>
      </div>
    </div>
  );
}
