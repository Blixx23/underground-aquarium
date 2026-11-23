"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Fish } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import FeaturedShopCard from "@/components/stores/FeaturedShopCard";
import WaterTestPanel, { EMPTY_WATER, type WaterInputs } from "@/components/water/WaterTestPanel";
import { useUrlParam } from "@/lib/hooks/useUrlState";
import { BUILDER_SPECIES_COLUMNS, type Species, type StockItem } from "@/lib/tankBuilder/engine";

type MyTank = { id: string; name: string; items: { slug: string; qty: number }[] | null };

export default function WaterCheckPage() {
  const [water, setWater] = useState<WaterInputs>(EMPTY_WATER);
  // Fishless cycle: no fish yet, so ammonia and nitrite are expected and the rules change.
  // Kept in the address so a shared link opens in the same mode.
  const [mode, setMode] = useUrlParam("mode", "fish");
  const fishless = mode === "fishless";

  // Signed-in members can pick one of their tanks: the check then looks at
  // their actual fish, and the reading can be logged to that tank's history.
  const [supabase] = useState(() => createClient());
  const [userId, setUserId] = useState<string | null>(null);
  const [tanks, setTanks] = useState<MyTank[]>([]);
  const [tankId, setTankId] = useState("");
  const [stock, setStock] = useState<StockItem[]>([]);

  useEffect(() => {
    let active = true;
    const load = async (uid: string | null) => {
      if (!active) return;
      setUserId(uid);
      if (!uid) return setTanks([]);
      const { data } = await supabase
        .from("tanks")
        .select("id,name,items")
        .eq("user_id", uid)
        .order("updated_at", { ascending: false });
      if (active) setTanks((data as MyTank[]) ?? []);
    };
    // Same fallback as the Tank Builder: getUser can come back empty while the
    // navbar is refreshing the session.
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) load(data.user.id);
      else supabase.auth.getSession().then(({ data: s }) => load(s.session?.user?.id ?? null));
    });
    return () => {
      active = false;
    };
  }, [supabase]);

  useEffect(() => {
    const tank = tanks.find((t) => t.id === tankId);
    const items = Array.isArray(tank?.items) ? tank.items : [];
    if (!tank || items.length === 0) return setStock([]);
    let active = true;
    supabase
      .from("species")
      .select(BUILDER_SPECIES_COLUMNS)
      .in("slug", items.map((i) => i.slug))
      .then(({ data }) => {
        if (!active) return;
        const bySlug = new Map(((data ?? []) as unknown as Species[]).map((sp) => [sp.slug, sp]));
        setStock(
          items
            .map((i) => (bySlug.has(i.slug) ? { species: bySlug.get(i.slug)!, qty: Math.max(1, Number(i.qty) || 1) } : null))
            .filter((x): x is StockItem => x !== null)
        );
      });
    return () => {
      active = false;
    };
  }, [tankId, tanks, supabase]);

  const tank = tanks.find((t) => t.id === tankId);

  // Members with tanks pick one; everyone else gets pointed at the Tank Builder.
  const tankPicker =
    userId && tanks.length > 0 ? (
      <div className="rounded-2xl border border-ocean-800/60 bg-white/5 p-4">
        <label htmlFor="wc-tank" className="text-sm font-semibold text-white">
          Check against one of your tanks
        </label>
        <p className="mb-3 mt-0.5 text-xs text-ocean-400">
          Pick a tank to compare these numbers with the fish in it, log the reading, and see its history.
        </p>
        <select
          id="wc-tank"
          value={tankId}
          onChange={(e) => setTankId(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-ocean-950 px-3 py-2.5 text-base text-white focus:border-emerald-500/50 focus:outline-none sm:text-sm"
        >
          <option value="">No tank, just check the water</option>
          {tanks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        {tankId && (
          <p className="mt-2 text-xs text-ocean-400">
            {stock.length > 0
              ? `Checking against the ${stock.length === 1 ? "fish" : `${stock.length} kinds of fish`} in this tank. `
              : "This tank has no fish yet, so only the general checks apply. "}
            <Link href={`/tank-builder?tank=${tankId}`} className="text-emerald-300 underline underline-offset-2 hover:text-emerald-200">
              Open in Tank Builder
            </Link>
          </p>
        )}
      </div>
    ) : (
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <Link href="/tank-builder" className="inline-flex items-center gap-2 text-sm font-medium text-emerald-400 hover:text-emerald-300">
          <Fish className="h-4 w-4" />
          {userId
            ? "Save a tank in the Tank Builder to check readings against your fish and keep a history →"
            : "Keeping fish? Use the Tank Builder for checks tailored to your stock →"}
        </Link>
      </div>
    );

  return (
    <main className="min-h-screen px-6 pb-20 pt-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <h1 className="font-display text-3xl text-white sm:text-4xl">Water Check</h1>
          <p className="mt-1 text-ocean-300">
            Enter your test-kit numbers and get a plain-English read on what&apos;s healthy, what isn&apos;t, and how to fix it.
            Fill in only what you have. For freshwater tanks.
          </p>
          {/* A local shop near the visitor (rotates), for test kits and water treatments. */}
          <div className="mt-4 max-w-2xl empty:hidden">
            <FeaturedShopCard slot={0} variant="strip" lead="Need a test kit or water treatment? Try" />
          </div>
        </div>

        <WaterTestPanel
          water={water}
          onWaterChange={setWater}
          fishless={fishless}
          onFishlessChange={(v) => setMode(v ? "fishless" : "fish")}
          stock={stock}
          layout="split"
          userId={userId}
          tankId={tankId || null}
          tankName={tank?.name}
          beforeLog={tankPicker}
          idPrefix="wc"
          verdictBar
        />
      </div>
    </main>
  );
}
