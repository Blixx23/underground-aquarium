import type { Metadata } from "next";
import Link from "next/link";
import { Trophy, MapPin, ArrowLeft, Star, MousePointerClick, Users, Megaphone } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/admin";
import Stars from "@/components/stores/Stars";
import {
  getLatestAwards,
  getLiveStandings,
  quarterLabel,
  quarterRange,
  tierOf,
  type Tier,
} from "@/lib/stores/topShops";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Top Aquarium Stores: Top 25, 50 and 100 Fish Stores",
  description:
    "The best independent aquarium and fish stores on Underground Aquarium this quarter, ranked on customer reviews and how often fish keepers use each shop's page.",
  alternates: { canonical: "/top-stores" },
};

type Shop = { id: string; name: string; slug: string; city: string | null; state: string | null; logo_url: string | null };

const TIERS: { tier: Tier; title: string; tone: string }[] = [
  { tier: 25, title: "Top 25 Stores", tone: "text-amber-200 border-amber-300/40 bg-amber-400/10" },
  { tier: 50, title: "Top 50 Stores", tone: "text-slate-100 border-slate-200/30 bg-slate-200/5" },
  { tier: 100, title: "Top 100 Stores", tone: "text-orange-200 border-orange-300/30 bg-orange-500/5" },
];

export default async function TopStoresPage() {
  const latest = await getLatestAwards();
  // Launch badges are a stand-in, not results: the board shows the live race
  // until a quarter's final results are locked in.
  const awards = latest.quarter && !latest.rows[0]?.provisional ? latest : { quarter: null, rows: [] };
  const live = awards.quarter ? null : await getLiveStandings();
  const quarter = awards.quarter ?? live?.quarter ?? "";
  const rows = awards.quarter ? awards.rows : (live?.rows ?? []);

  const ids = rows.map((r) => r.store_id);
  const { data } = ids.length
    ? await supabaseAdmin.from("fish_stores").select("id, name, slug, city, state, logo_url").in("id", ids).eq("status", "published")
    : { data: [] };
  const shops = new Map(((data ?? []) as Shop[]).map((s) => [s.id, s]));

  const lockDate = quarter
    ? new Date(quarterRange(quarter).to + "T12:00:00Z").toLocaleDateString("en-US", { month: "long", day: "numeric" })
    : "";

  return (
    <main className="min-h-screen px-5 pb-24 pt-24 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <Link href="/stores" className="mb-6 inline-flex items-center gap-2 text-sm text-ocean-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Find a fish store
        </Link>

        <div className="mb-8">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-300/40 bg-amber-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-amber-200">
            <Trophy className="h-3.5 w-3.5" /> {quarter ? quarterLabel(quarter) : "This quarter"}
            {live ? " · so far" : ""}
          </p>
          <h1 className="font-display text-3xl text-white sm:text-4xl">Top Aquarium Stores</h1>
          <p className="mt-2 max-w-2xl text-ocean-300">
            The shops fish keepers rate and use most, ranked every quarter on reviews, customer visits and how active the
            shop is on Underground Aquarium.
            {live && lockDate ? ` Standings are live and lock in on ${lockDate}, when the winners get their badge.` : ""}
          </p>
        </div>

        {rows.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-ocean-300">
            No shop has earned a spot yet this quarter. Leave a review for your local shop to put it on the board.
          </p>
        ) : (
          TIERS.map(({ tier, title, tone }) => {
            const inTier = rows.filter((r) => tierOf(r.rank) === tier && shops.has(r.store_id));
            if (inTier.length === 0) return null;
            return (
              <section key={tier} className="mb-10">
                <h2 className={`mb-4 inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 font-display text-xl ${tone}`}>
                  <Trophy className="h-5 w-5" /> {title}
                </h2>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {inTier.map((r) => {
                    const s = shops.get(r.store_id) as Shop;
                    return (
                      <li key={s.id} className="flex">
                        <Link
                          href={`/stores/${s.slug}`}
                          className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-emerald-500/40 hover:bg-white/10"
                        >
                          {s.logo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={s.logo_url} alt="" className="h-12 w-12 shrink-0 rounded-full bg-white object-cover" loading="lazy" />
                          ) : (
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-ocean-800 font-display text-lg text-white">
                              {s.name.slice(0, 1)}
                            </span>
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium text-white">{s.name}</span>
                            <span className="mt-0.5 flex items-center gap-1 text-xs text-ocean-400">
                              <MapPin className="h-3.5 w-3.5" />
                              {[s.city, s.state].filter(Boolean).join(", ") || "Location on page"}
                            </span>
                            {/* Always shown (dimmed with no reviews) so every card is the same height. */}
                            <span className="mt-1 block">
                              <Stars rating={r.reviews > 0 ? r.rating : null} count={r.reviews} size={13} />
                            </span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })
        )}

        <section className="mt-12 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="mb-3 font-display text-xl text-white">How shops are ranked</h2>
          <ul className="grid gap-3 text-sm text-ocean-300 sm:grid-cols-2">
            <li className="flex gap-2"><Star className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" /> Customer reviews and star rating, the biggest part</li>
            <li className="flex gap-2"><MousePointerClick className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" /> How often people tap Directions, Call or Website</li>
            <li className="flex gap-2"><Users className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" /> Page visits and followers</li>
            <li className="flex gap-2"><Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" /> Owners posting restocks and replying to reviews</li>
          </ul>
          <p className="mt-4 text-sm text-ocean-400">
            Rankings reset every quarter. Own a shop?{" "}
            <Link href="/stores" className="text-emerald-300 underline hover:text-white">Find and claim your page</Link>{" "}
            to post updates and answer reviews.
          </p>
        </section>
      </div>
    </main>
  );
}
