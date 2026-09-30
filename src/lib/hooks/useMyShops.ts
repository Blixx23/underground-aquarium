"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type MyShop = { slug: string; name: string; unanswered: number };

export type MyShops = {
  /** The shops the signed-in person has claimed. Empty for everyone else. */
  shops: MyShop[];
  /** Reviews waiting on a reply, across all their shops. */
  unanswered: number;
  /** Where "My Shop" should go: straight to the dashboard when there's only one. */
  href: string;
  /** "My Shop" for one, "My Shops" for more. */
  label: string;
};

/**
 * The shops the signed-in person manages, for the top bar, the phone menu
 * and the bottom bar. Read only: it never changes anything. Shared so every
 * place that shows "My Shop" agrees on the count and the link.
 */
export function useMyShops(): MyShops {
  const supabase = useMemo(() => createClient(), []);
  const [shops, setShops] = useState<MyShop[]>([]);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!active) return;
        if (!user) {
          setShops([]);
          return;
        }

        // my_stores already counts unanswered reviews per shop.
        const { data, error } = await supabase.rpc("my_stores");
        if (!active) return;
        if (!error && Array.isArray(data)) {
          setShops(
            (data as { slug: string; name: string; unanswered?: number | null }[]).map((s) => ({
              slug: s.slug,
              name: s.name,
              unanswered: Number(s.unanswered ?? 0),
            }))
          );
          return;
        }

        // Fallback if that function isn't there: just the shops, no counts.
        const { data: rows } = await supabase
          .from("fish_stores")
          .select("slug, name")
          .eq("claimed_by", user.id)
          .order("name");
        if (!active) return;
        setShops(((rows ?? []) as { slug: string; name: string }[]).map((s) => ({ ...s, unanswered: 0 })));
      } catch {
        // A network blip just means no button this time.
      }
    }

    load();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    const { data: authSub } = supabase.auth.onAuthStateChange(() => load());
    return () => {
      active = false;
      window.removeEventListener("focus", onFocus);
      authSub.subscription.unsubscribe();
    };
  }, [supabase]);

  const unanswered = shops.reduce((n, s) => n + s.unanswered, 0);
  const href = shops.length === 1 ? `/my/shops/${shops[0].slug}` : "/my/shops";
  const label = shops.length > 1 ? "My Shops" : "My Shop";
  return { shops, unanswered, href, label };
}
